import { Context, Schema, h } from 'koishi'
import { CronJob } from 'cron'
import { fetchHitokoto } from '../utils/hitokoto'
import { getApiClient, getMxSpaceAggregateData } from '../utils/mx-api'
import { urlBuilder } from '../utils/mx-url-builder'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import RemoveMarkdown from 'remove-markdown'
dayjs.extend(relativeTime)

export const name = 'mx-space'

export interface Config {
  baseUrl?: string
  token?: string
  webhookSecret?: string
  watchGroupIds?: string[]
  greeting?: {
    enabled?: boolean
    channels?: string[]
    morningTime?: string
    eveningTime?: string
  }
  commands?: {
    enabled?: boolean
    replyPrefix?: string
  }
}

export const Config: Schema<Config> = Schema.object({
  baseUrl: Schema.string().description('MX Space API 地址').required(),
  token: Schema.string().description('MX Space API Token').role('secret'),
  webhookSecret: Schema.string()
    .description('MX Space Webhook Secret')
    .role('secret'),
  watchGroupIds: Schema.array(Schema.string())
    .description('事件通知频道')
    .default([]),
  greeting: Schema.object({
    enabled: Schema.boolean().description('启用问候功能').default(true),
    channels: Schema.array(Schema.string()).description('问候消息发送的频道').default([]),
    morningTime: Schema.string().description('早安时间 (cron格式)').default('0 0 6 * * *'),
    eveningTime: Schema.string().description('晚安时间 (cron格式)').default('0 0 22 * * *'),
  }).description('问候功能配置'),
  commands: Schema.object({
    enabled: Schema.boolean().description('启用命令功能').default(true),
    replyPrefix: Schema.string().description('回复前缀').default('来自 Mix Space 的'),
  }).description('命令功能配置'),
})

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('mx-space')

  if (!config.baseUrl) {
    logger.warn('MX Space baseUrl not configured')
    return
  }

  // 设置问候功能
  if (config.greeting?.enabled) {
    setupGreeting(ctx, config, logger)
  }

  // 设置命令
  if (config.commands?.enabled) {
    setupCommands(ctx, config, logger)
  }

  logger.info('MX Space 模块已启动')
}

function setupGreeting(ctx: Context, config: Config, logger: any) {
  // 早安定时任务
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
        const greeting = greetings[Math.floor(Math.random() * greetings.length)]

        const message = `🌅 早上好！${greeting}\n\n${hitokoto || ''}`
        await sendToChannels(
          ctx,
          config.greeting!.channels || [],
          message,
          logger,
        )
      } catch (error) {
        logger.error('发送早安消息失败:', error)
      }
    },
    null,
    false,
    'Asia/Shanghai',
  )

  // 晚安定时任务
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
        const greeting = greetings[Math.floor(Math.random() * greetings.length)]

        const message = `🌙 ${greeting}\n\n${hitokoto || ''}`
        await sendToChannels(
          ctx,
          config.greeting!.channels || [],
          message,
          logger,
        )
      } catch (error) {
        logger.error('发送晚安消息失败:', error)
      }
    },
    null,
    false,
    'Asia/Shanghai',
  )

  morningJob.start()
  eveningJob.start()

  // 插件停止时清理定时任务
  ctx.on('dispose', () => {
    morningJob.stop()
    eveningJob.stop()
    logger.info('问候定时任务已停止')
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
        return `💭 ${hitokoto}\n\n—— ${from}`
      } catch (error) {
        logger.error('获取一言失败:', error)
        return '获取一言失败'
      }
    })

  cmd
    .subcommand('.posts [page]', '获取最新的 Post 列表')
    .action(async ({ session }, page = '1') => {
      try {
        const pageNum = parseInt(page) || 1
        const data = await apiClient.post.getList(pageNum)
        const aggregateData = await getMxSpaceAggregateData(ctx, config)
        const { webUrl } = aggregateData.url
        const text = data.data
          .map(
            (post: any) =>
              `${dayjs(post.created).fromNow()}前\n[${post.title}](${webUrl}/posts/${post.category.slug}/${post.slug})`,
          )
          .join('\n')

        const markupText = `*文章列表*\n\n${text}`

        return markupText
      } catch (error) {
        logger.error('获取文章列表失败:', error)
        return '获取文章列表失败'
      }
    })

  cmd
    .subcommand('.notes [page]', '获取最新的 Note 列表')
    .action(async ({ session }, page = '1') => {
      try {
        const pageNum = parseInt(page) || 1
        const data = await apiClient.note.getList(pageNum, 10)
        const aggregateData = await getMxSpaceAggregateData(ctx, config)
        const { webUrl } = aggregateData.url
        const text = data.data
          .map(
            (note: any) =>
              `${dayjs(note.created).fromNow()}前\n[${note.title}](${webUrl}/notes/${note.nid})`,
          )
          .join('\n')

        const markupText = `*笔记列表*\n\n${text}`

        return markupText
      } catch (error) {
        logger.error('获取笔记列表失败:', error)
        return '获取笔记列表失败'
      }
    })

  cmd
    .subcommand('.post <offset>', '获取 Post 详情')
    .action(async ({ session }, offset = '1') => {
      try {
        const offsetNum = parseInt(offset) || 1
        const data = await apiClient.post.getList(offsetNum, 1)
        if (!data.data.length) {
          return '没有找到文章'
        }
        const postDetail = data.data[0]
        const url = await urlBuilder.build(ctx, config, postDetail)

        return `[${postDetail.title}](${url})\n\n${RemoveMarkdown(
          postDetail.text,
        )
          .split('\n\n')
          .slice(0, 3)
          .join('\n\n')}\n\n[阅读全文](${url})`
      } catch (error) {
        logger.error('获取文章详情失败:', error)
        return '获取文章详情失败'
      }
    })

  cmd
    .subcommand('.note <offset>', '获取 Note 详情')
    .action(async ({ session }, offset = '1') => {
      try {
        const offsetNum = parseInt(offset) || 1
        const data = await apiClient.note.getList(offsetNum, 1)
        if (!data.data.length) {
          return '没有找到笔记'
        }
        const noteDetail = data.data[0]
        const url = await urlBuilder.build(ctx, config, noteDetail)
        return `[${noteDetail.title}](${url})\n\n${RemoveMarkdown(
          noteDetail.text,
        )
          .split('\n\n')
          .slice(0, 3)
          .join('\n\n')}\n\n[阅读全文](${url})`
      } catch (error) {
        logger.error('获取笔记详情失败:', error)
        return '获取笔记详情失败'
      }
    })

  cmd.subcommand('.stat', '获取 MX Space 统计信息').action(async () => {
    try {
      const data = await apiClient.aggregate.getStat()
      const {
        callTime,
        posts,
        notes,
        linkApply,
        recently,
        says,
        todayIpAccessCount,
        todayMaxOnline,
        todayOnlineTotal,
        unreadComments,
        comments,
        links,
        online,
      } = data
      return (
        '状态信息：' +
        '\n\n' +
        `当前有文章 ${posts} 篇，生活记录 ${notes} 篇，评论 ${comments} 条，友链 ${links} 条，说说 ${says} 条，速记 ${recently} 条。` +
        '\n' +
        `未读评论 ${unreadComments} 条，友链申请 ${linkApply} 条。` +
        '\n' +
        `今日访问 ${todayIpAccessCount} 次，最高在线 ${todayMaxOnline} 人，总计在线 ${todayOnlineTotal} 人。` +
        '\n' +
        `调用次数 ${callTime} 次，当前在线 ${online} 人。`
      )
    } catch (error) {
      logger.error('获取统计信息失败:', error)
      return '获取统计信息失败'
    }
  })

  logger.info('MX Space 命令已注册')
}

async function sendToChannels(
  ctx: Context,
  channels: string[],
  message: string,
  logger: any,
) {
  for (const channelId of channels) {
    try {
      await ctx.broadcast([channelId], message)
    } catch (error) {
      logger.error(`发送消息到频道 ${channelId} 失败:`, error)
    }
  }
}
