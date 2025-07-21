import { Context, Schema, Time } from 'koishi'
import axios from 'axios'

export const name = 'mx-space'

export interface Config {
  baseUrl?: string
  token?: string
  watchChannels?: string[]
  enableGreeting?: boolean
}

export const Config: Schema<Config> = Schema.object({
  baseUrl: Schema.string().description('MX Space API 地址'),
  token: Schema.string().description('MX Space API Token').role('secret'),
  watchChannels: Schema.array(Schema.string()).description('监听的频道ID列表').default([]),
  enableGreeting: Schema.boolean().description('启用问候功能').default(true),
})

interface HitokotoResponse {
  hitokoto: string
  from: string
  type: string
}

async function fetchHitokoto(): Promise<HitokotoResponse> {
  try {
    const { data } = await axios.get('https://v1.hitokoto.cn/', { timeout: 2000 })
    return data
  } catch (error) {
    return { hitokoto: '', from: '', type: '' }
  }
}

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('mx-space')
  
  if (!config.baseUrl) {
    logger.warn('MX Space baseUrl not configured')
    return
  }

  // 新成员加入欢迎
  ctx.on('guild-member-added', async (session) => {
    if (!config.watchChannels?.includes(session.channelId!)) {
      return
    }

    const { hitokoto } = await fetchHitokoto()
    const welcomeText = `欢迎新成员 <at id="${session.userId}"/>！\n${hitokoto || ''}`
    
    await session.send(welcomeText)
  })

  if (config.enableGreeting) {
    // 早安问候 (每天6点)
    ctx.cron('0 6 * * *', async () => {
      const { hitokoto } = await fetchHitokoto()
      const greetings = [
        '新的一天也要加油哦',
        '今天也要元气满满哦！',
        '今天也是充满希望的一天',
      ]
      const greeting = greetings[Math.floor(Math.random() * greetings.length)]
      
      const message = `早上好！${greeting}\n\n${hitokoto || ''}`
      
      for (const channelId of config.watchChannels || []) {
        try {
          const session = ctx.bots[0]?.createSession({ channelId, platform: ctx.bots[0].platform })
          if (session) {
            await session.send(message)
          }
        } catch (error) {
          logger.error(`Failed to send morning greeting to ${channelId}:`, error)
        }
      }
    })

    // 晚安问候 (每天22点)
    ctx.cron('0 22 * * *', async () => {
      const { hitokoto } = await fetchHitokoto()
      const message = `晚安，早点睡哦！\n\n${hitokoto || ''}`
      
      for (const channelId of config.watchChannels || []) {
        try {
          const session = ctx.bots[0]?.createSession({ channelId, platform: ctx.bots[0].platform })
          if (session) {
            await session.send(message)
          }
        } catch (error) {
          logger.error(`Failed to send evening greeting to ${channelId}:`, error)
        }
      }
    })
  }

  // 一言命令
  ctx.command('hitokoto', '获取一言')
    .action(async ({ session }) => {
      const { hitokoto, from } = await fetchHitokoto()
      if (hitokoto) {
        return session?.send(`${hitokoto}\n\n——${from}`)
      } else {
        return session?.send('获取一言失败')
      }
    })

  logger.info('MX Space module loaded')
}
