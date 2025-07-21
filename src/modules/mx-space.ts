import { Context, Schema, h } from 'koishi'
import { CronJob } from 'cron'
import { fetchHitokoto } from '../utils/hitokoto'

export const name = 'mx-space'

export interface Config {
  baseUrl?: string
  token?: string
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
        await sendToChannels(ctx, config.greeting!.channels || [], message, logger)
      } catch (error) {
        logger.error('发送早安消息失败:', error)
      }
    },
    null,
    false,
    'Asia/Shanghai'
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
        await sendToChannels(ctx, config.greeting!.channels || [], message, logger)
      } catch (error) {
        logger.error('发送晚安消息失败:', error)
      }
    },
    null,
    false,
    'Asia/Shanghai'
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
  // 一言命令
  ctx.command('hitokoto', '获取一言')
    .action(async ({ session }) => {
      try {
        const { hitokoto, from } = await fetchHitokoto()
        return `💭 ${hitokoto}\n\n—— ${from}`
      } catch (error) {
        logger.error('获取一言失败:', error)
        return '获取一言失败'
      }
    })

  logger.info('MX Space 命令已注册')
}

async function sendToChannels(ctx: Context, channels: string[], message: string, logger: any) {
  for (const channelId of channels) {
    try {
      await ctx.broadcast([channelId], message)
    } catch (error) {
      logger.error(`发送消息到频道 ${channelId} 失败:`, error)
    }
  }
}
