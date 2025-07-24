import { Context, Schema, h, Session } from 'koishi'
import { CronJob } from 'cron'
import { sample } from 'lodash'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import RemoveMarkdown from 'remove-markdown'
import { fetchHitokoto } from '../utils/hitokoto'
import { getApiClient, getMxSpaceAggregateData } from '../utils/mx-api'
import { urlBuilder } from '../utils/mx-url-builder'
import { handleMxSpaceEvent } from '../utils/mx-event-handler'
import { simplifyAxiosError } from '../utils/axios-error'
import { sendMessage } from '../utils/broadcast'

dayjs.extend(relativeTime)

export const name = 'mx-space'
export const inject = ['server']

export interface Config {
  baseUrl?: string
  token?: string
  webhook?: {
    secret?: string
    path?: string
    watchChannels?: string[]
    broadcastToAll?: boolean
    excludeChannels?: string[]
  }
  greeting?: {
    enabled?: boolean
    channels?: string[]
    morningTime?: string
    eveningTime?: string
    broadcastToAll?: boolean
    excludeChannels?: string[]
  }
  commands?: {
    enabled?: boolean
    replyPrefix?: string
  }
  welcomeNewMember?: {
    enabled?: boolean
    channels?: string[]
  }
  commentReply?: {
    enabled?: boolean
    channels?: string[]
  }
}

export const Config: Schema<Config> = Schema.object({
  baseUrl: Schema.string().description('MX Space API 地址').required(),
  token: Schema.string().description('MX Space API Token').role('secret'),
  webhook: Schema.object({
    secret: Schema.string().description('MX Space Webhook Secret').role('secret'),
    path: Schema.string().description('Webhook 路径').default('/mx-space/webhook'),
    watchChannels: Schema.array(Schema.string()).description('监听的频道ID列表').default([]),
    broadcastToAll: Schema.boolean().description('是否广播到所有联系人').default(false),
    excludeChannels: Schema.array(Schema.string()).description('排除的频道ID列表（当启用广播到所有联系人时）').default([]),
  }).description('Webhook 配置'),
  greeting: Schema.object({
    enabled: Schema.boolean().description('启用问候功能').default(true),
    channels: Schema.array(Schema.string()).description('问候消息发送的频道').default([]),
    morningTime: Schema.string().description('早安时间 (cron格式)').default('0 0 6 * * *'),
    eveningTime: Schema.string().description('晚安时间 (cron格式)').default('0 0 22 * * *'),
    broadcastToAll: Schema.boolean().description('是否广播问候消息到所有联系人').default(false),
    excludeChannels: Schema.array(Schema.string()).description('排除的频道ID列表（当启用广播到所有联系人时）').default([]),
  }).description('问候功能配置'),
  commands: Schema.object({
    enabled: Schema.boolean().description('启用命令功能').default(true),
    replyPrefix: Schema.string().description('回复前缀').default('来自 Mix Space 的'),
  }).description('命令功能配置'),
  welcomeNewMember: Schema.object({
    enabled: Schema.boolean().description('启用新成员欢迎功能').default(false),
    channels: Schema.array(Schema.string()).description('监听的群组ID列表').default([]),
  }).description('新成员欢迎配置'),
  commentReply: Schema.object({
    enabled: Schema.boolean().description('启用评论回复功能').default(false),
    channels: Schema.array(Schema.string()).description('允许回复评论的频道ID列表').default([]),
  }).description('评论回复配置'),
})

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('mx-space')

  if (!config.baseUrl) {
    logger.warn('MX Space baseUrl not configured')
    return
  }

  // 全局状态存储
  const globalState = {
    toCommentId: null as string | null,
    memoChatId: null as string | null,
  }

  // 设置 Webhook 处理器
  if (config.webhook?.secret && ctx.server) {
    setupWebhook(ctx, config, logger)
  }

  // 设置问候功能
  if (config.greeting?.enabled) {
    setupGreeting(ctx, config, logger)
  }

  // 设置命令
  if (config.commands?.enabled) {
    setupCommands(ctx, config, logger)
  }

  // 设置新成员欢迎
  if (config.welcomeNewMember?.enabled) {
    setupWelcomeNewMember(ctx, config, logger)
  }

  // 设置评论回复功能
  if (config.commentReply?.enabled) {
    setupCommentReply(ctx, config, logger, globalState)
  }

  logger.info('MX Space 模块已启动')
}

function setupWebhook(ctx: Context, config: Config, logger: any) {
  if (!config.webhook?.secret || !ctx.server) {
    logger.warn('Webhook 配置不完整或 server 插件未启用')
    return
  }

  const webhookPath = config.webhook.path || '/mx-space/webhook'
  
  ctx.server.post(webhookPath, async (koaCtx: any) => {
    try {
      const body = koaCtx.request.body as any
      const headers = koaCtx.request.headers
      
      const signature = headers['x-hub-signature-256'] as string || 
                       headers['x-webhook-signature256'] as string ||
                       headers['x-webhook-signature'] as string
      
      const eventType = headers['x-webhook-event'] as string
      const webhookId = headers['x-webhook-id'] as string
      const timestamp = headers['x-webhook-timestamp'] as string
      
      if (!body) {
        logger.warn('Webhook 请求体为空')
        koaCtx.status = 400
        koaCtx.body = { error: 'Request body is empty' }
        return
      }

      if (config.webhook?.secret && signature) {
        const crypto = await import('crypto')
        const payload = JSON.stringify(body)
        let isValidSignature = false
        
        if (signature.startsWith('sha256=') || headers['x-webhook-signature256']) {
          const hmac = crypto.createHmac('sha256', config.webhook.secret)
          hmac.update(payload)
          const expectedSignature = signature.startsWith('sha256=') 
            ? 'sha256=' + hmac.digest('hex')
            : hmac.digest('hex')
          isValidSignature = signature === expectedSignature
        } else if (headers['x-webhook-signature']) {
          const hmac = crypto.createHmac('sha1', config.webhook.secret)
          hmac.update(payload)
          const expectedSignature = hmac.digest('hex')
          isValidSignature = signature === expectedSignature
        }
        
        if (!isValidSignature) {
          logger.warn('Webhook 签名验证失败')
          koaCtx.status = 401
          koaCtx.body = { error: 'Invalid signature' }
          return
        }
      } else if (config.webhook?.secret && !signature) {
        logger.warn('配置了签名但请求中没有签名头')
        koaCtx.status = 401
        koaCtx.body = { error: 'Missing signature' }
        return
      }
      
      let eventTypeToProcess: string
      let eventData: any
      
      if (eventType) {
        eventTypeToProcess = eventType
        eventData = body
      } else if (body.type && body.data) {
        eventTypeToProcess = body.type
        eventData = body.data
      } else {
        logger.warn('Webhook 请求体格式错误')
        koaCtx.status = 400
        koaCtx.body = { 
          error: 'Invalid webhook payload', 
          details: 'Missing required fields: event type or data'
        }
        return
      }

      await handleMxSpaceEvent(ctx, config, eventTypeToProcess, eventData, logger)
      
      koaCtx.status = 200
      koaCtx.body = { message: 'Webhook processed successfully' }
    } catch (error: any) {
      const simplified = simplifyAxiosError(error, '处理 MX Space webhook')
      logger.error(simplified.message)
      koaCtx.status = 500
      koaCtx.body = { error: 'Internal server error', details: simplified.message }
    }
  })

  logger.info(`MX Space Webhook 已启动，监听路径: ${webhookPath}`)
}

function setupWelcomeNewMember(ctx: Context, config: Config, logger: any) {
  if (!config.welcomeNewMember?.channels?.length) return

  ctx.on('guild-member-added', async (session) => {
    const channelId = session.channelId
    if (!channelId || !config.welcomeNewMember?.channels?.includes(channelId)) return

    try {
      const { hitokoto } = await fetchHitokoto()
      const username = session.username || session.userId
      const welcomeMessage = `欢迎新成员 ${username}！\n\n${hitokoto || ''}`
      
      await session.send(welcomeMessage)
    } catch (error) {
      const simplified = simplifyAxiosError(error, '发送欢迎消息')
      logger.warn(simplified.message)
    }
  })

  logger.info('新成员欢迎功能已启用')
}

function setupCommentReply(ctx: Context, config: Config, logger: any, globalState: any) {
  if (!config.commentReply?.channels?.length) return

  // 处理回复消息的中间件
  ctx.middleware(async (session, next) => {
    if (session.type !== 'message' || !session.content) return next()
    
    const channelId = session.channelId
    if (!channelId || !config.commentReply?.channels?.includes(channelId)) return next()
    if (channelId !== globalState.memoChatId || !globalState.toCommentId) return next()

    try {
      const apiClient = getApiClient(ctx, config)
      await apiClient.comment.proxy.master
        .reply(globalState.toCommentId)
        .post({
          data: { text: session.content }
        })

      await session.send('回复成功！')
      
      // 清除状态
      globalState.toCommentId = null
      globalState.memoChatId = null
    } catch (error: any) {
      const simplified = simplifyAxiosError(error, '回复评论')
      await session.send(`回复失败！${simplified.message}`)
      globalState.toCommentId = null
      globalState.memoChatId = null
    }

    return
  })

  logger.info('评论回复功能已启用')
}

function setupGreeting(ctx: Context, config: Config, logger: any) {
  const morningJob = new CronJob(
    config.greeting!.morningTime || '0 0 6 * * *',
    async () => {
      try {
        const { hitokoto } = await fetchHitokoto()
        const greetings = [
          '新的一天也要加油哦',
          '今天也要元气满满哦！',
          '今天也是充满希望的一天',
          '早上好！愿你今天心情美丽',
          '新的一天开始了，加油！',
        ]
        const greeting = sample(greetings) || greetings[0]

        const message = `🌅 早上好！${greeting}\n\n${hitokoto || ''}`
        await sendMessage(ctx, message, {
          watchChannels: config.greeting!.channels || [],
          broadcastToAll: config.greeting!.broadcastToAll || false,
          excludeChannels: config.greeting!.excludeChannels || [],
        }, logger)
      } catch (error) {
        const simplified = simplifyAxiosError(error, '发送早安消息')
        logger.warn(simplified.message)
      }
    },
    null,
    false,
    'Asia/Shanghai',
  )

  const eveningJob = new CronJob(
    config.greeting!.eveningTime || '0 0 22 * * *',
    async () => {
      try {
        const { hitokoto } = await fetchHitokoto()
        const greetings = [
          '晚安，早点睡哦！',
          '今天辛苦了，好好休息～',
          '愿你有个好梦',
          '睡个好觉，明天会更好',
          '夜深了，注意休息哦',
        ]
        const greeting = sample(greetings) || greetings[0]

        const message = `🌙 ${greeting}\n\n${hitokoto || ''}`
        await sendMessage(ctx, message, {
          watchChannels: config.greeting!.channels || [],
          broadcastToAll: config.greeting!.broadcastToAll || false,
          excludeChannels: config.greeting!.excludeChannels || [],
        }, logger)
      } catch (error) {
        const simplified = simplifyAxiosError(error, '发送晚安消息')
        logger.warn(simplified.message)
      }
    },
    null,
    false,
    'Asia/Shanghai',
  )

  morningJob.start()
  eveningJob.start()

  ctx.on('dispose', () => {
    morningJob.stop()
    eveningJob.stop()
  })

  logger.info('问候功能已启动')
}

function setupCommands(ctx: Context, config: Config, logger: any) {
  const apiClient = getApiClient(ctx, config)
  const cmd = ctx.command('mx-space', 'MX Space 相关功能')

  // 一言命令
  cmd
    .subcommand('.hitokoto', '获取一言')
    .action(async ({ session }) => {
      try {
        const { hitokoto, from } = await fetchHitokoto()
        return `💭 ${hitokoto}\n\n—— ${from || '未知'}`
      } catch (error) {
        const simplified = simplifyAxiosError(error, '获取一言')
        logger.warn(simplified.message)
        return '获取一言失败'
      }
    })

  // 统计信息命令
  cmd
    .subcommand('.stat', '获取 MX Space 统计信息')
    .action(async ({ session }) => {
      try {
        const data = await apiClient.aggregate.getStat()
        
        if (!data) {
          return '获取统计信息失败：API返回数据为空'
        }
        
        const {
          posts = 0, 
          notes = 0, 
          comments = 0, 
          links = 0, 
          says = 0, 
          recently = 0,
          today_ip_access_count = 0, 
          today_max_online = 0, 
          today_online_total = 0,
          unread_comments = 0, 
          link_apply = 0, 
          call_time = 0, 
          online = 0
        } = data || {}

        const replyPrefix = config.commands?.replyPrefix || '来自 Mix Space 的'
        
        const responseMessage = `📊 ${replyPrefix}统计信息：\n\n` +
          `📝 文章 ${posts || 0} 篇，📔 记录 ${notes || 0} 篇\n` +
          `💬 评论 ${comments || 0} 条，🔗 友链 ${links || 0} 条\n` +
          `💭 说说 ${says || 0} 条，⚡ 速记 ${recently || 0} 条\n\n` +
          `🔔 未读评论 ${unread_comments || 0} 条，📮 友链申请 ${link_apply || 0} 条\n` +
          `📈 今日访问 ${today_ip_access_count || 0} 次，👥 最高在线 ${today_max_online || 0} 人\n` +
          `📊 总计在线 ${today_online_total || 0} 人，🔄 调用 ${call_time || 0} 次\n` +
          `🟢 当前在线 ${online || 0} 人`
        
        return responseMessage
        
      } catch (error: any) {
        const simplified = simplifyAxiosError(error, '获取统计信息')
        logger.error('获取统计信息失败:', simplified.message)
        
        if (error?.isAxiosError) {
          if (error.code === 'ECONNREFUSED') {
            return '获取统计信息失败：无法连接到 MX Space API，请检查网络或 API 地址'
          } else if (error.response) {
            return `获取统计信息失败：API 返回错误 (${error.response.status})`
          }
        }
        
        return '获取统计信息失败：' + simplified.message
      }
    })

  // 获取最新文章
  cmd
    .subcommand('.posts [page:number]', '获取最新的文章列表')
    .action(async ({ session }, page = 1) => {
      try {
        const data = await apiClient.post.getList(page, 10)
        if (!data.data.length) {
          return '没有找到文章'
        }

        const aggregateData = await getMxSpaceAggregateData(ctx, config)
        const webUrl = aggregateData.url.webUrl

        const articles = data.data.map((post: any) => {
          const timeAgo = dayjs(post.created).fromNow()
          const url = `${webUrl}/posts/${post.category.slug}/${post.slug}`
          return `${timeAgo} · [${post.title}](${url})`
        }).join('\n')

        const replyPrefix = config.commands?.replyPrefix || '来自 Mix Space 的'
        return `📚 ${replyPrefix}最新文章：\n\n${articles}`
      } catch (error) {
        logger.error('获取文章列表失败:', error)
        return '获取文章列表失败'
      }
    })

  // 获取最新日记
  cmd
    .subcommand('.notes [page:number]', '获取最新的日记列表')
    .action(async ({ session }, page = 1) => {
      try {
        const data = await apiClient.note.getList(page, 10)
        if (!data.data.length) {
          return '没有找到日记'
        }

        const aggregateData = await getMxSpaceAggregateData(ctx, config)
        const webUrl = aggregateData.url.webUrl

        const notes = data.data.map((note: any) => {
          const timeAgo = dayjs(note.created).fromNow()
          const url = `${webUrl}/notes/${note.nid}`
          return `${timeAgo} · [${note.title}](${url})`
        }).join('\n')

        const replyPrefix = config.commands?.replyPrefix || '来自 Mix Space 的'
        return `📔 ${replyPrefix}最新日记：\n\n${notes}`
      } catch (error) {
        logger.error('获取日记列表失败:', error)
        return '获取日记列表失败'
      }
    })

  // 获取详情命令
  cmd
    .subcommand('.detail <type> [offset:number]', '获取文章或日记详情')
    .action(async ({ session }, type: string, offset = 1) => {
      if (!['post', 'note'].includes(type)) {
        return '类型必须是 post 或 note'
      }

      try {
        const replyPrefix = config.commands?.replyPrefix || '来自 Mix Space 的'
        
        if (type === 'post') {
          const data = await apiClient.post.getList(offset, 1)
          if (!data.data.length) {
            return '没有找到文章'
          }

          const post = data.data[0]
          const url = await urlBuilder.build(ctx, config, post)
          const preview = RemoveMarkdown(post.text)
            .split('\n\n')
            .slice(0, 3)
            .join('\n\n')
            .substring(0, 200)

          return `📚 ${replyPrefix}文章详情：\n\n` +
            `📝 ${post.title}\n\n` +
            `${preview}${preview.length >= 200 ? '...' : ''}\n\n` +
            `🔗 [阅读全文](${url})`
        } else {
          const data = await apiClient.note.getList(offset, 1)
          if (!data.data.length) {
            return '没有找到日记'
          }

          const note = data.data[0]
          const url = await urlBuilder.build(ctx, config, note)
          const preview = RemoveMarkdown(note.text)
            .split('\n\n')
            .slice(0, 3)
            .join('\n\n')
            .substring(0, 200)

          return `📔 ${replyPrefix}日记详情：\n\n` +
            `📝 ${note.title}\n\n` +
            `${preview}${preview.length >= 200 ? '...' : ''}\n\n` +
            `🔗 [阅读全文](${url})`
        }
      } catch (error) {
        logger.error('获取详情失败:', error)
        return '获取详情失败'
      }
    })

  logger.info('MX Space 命令已注册')
}
