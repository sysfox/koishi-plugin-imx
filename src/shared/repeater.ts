import { Context, Session, Next, Schema } from 'koishi'

export const name = 'repeater'

export interface Config {
  enabled?: boolean
  threshold?: number
  chance?: number
  breakThreshold?: number
}

export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().description('启用复读机').default(false),
  threshold: Schema.number().description('触发复读的次数').default(3).min(2).max(10),
  chance: Schema.number().description('复读概率 (0-1)').default(0.5).min(0).max(1),
  breakThreshold: Schema.number().description('连续复读多少次后打断').default(12).min(5).max(20),
})

const sessionToMessageQueue = new Map<string, string[]>()

export function apply(ctx: Context, config: Config = {}) {
  if (!config.enabled) return

  const logger = ctx.logger('repeater')
  const repeatCount = config.threshold || 3
  const breakRepeatCount = config.breakThreshold || 12
  const repeatChance = config.chance || 0.5

  ctx.middleware((session: Session, next: Next) => {
    const sessionId = `${session.platform}:${session.channelId}`
    const message = session.content
    
    if (!message || session.userId === ctx.bots[0]?.selfId || message.startsWith('/')) {
      return next()
    }

    const result = checkRepeater(sessionId, message)
    
    if (result === true) {
      if (Math.random() < repeatChance) {
        return session.send(message)
      }
    } else if (result === 'break') {
      const breakMessages = [
        '复读打断！',
        '不要再复读了！',
        '停止复读～',
        '复读机坏了',
        '打断复读',
        '够了够了',
      ]
      const randomMessage = breakMessages[Math.floor(Math.random() * breakMessages.length)]
      return session.send(randomMessage)
    }
    
    return next()
  })

  logger.info(`复读机已启用 - 阈值: ${repeatCount}, 概率: ${repeatChance}, 打断阈值: ${breakRepeatCount}`)
}

function checkRepeater(sessionId: string, message: string): boolean | 'break' {
  if (sessionToMessageQueue.has(sessionId)) {
    const messageQueue = sessionToMessageQueue.get(sessionId)!
    const latestMessage = messageQueue[messageQueue.length - 1]

    if (latestMessage === message) {
      messageQueue.push(message)
    } else {
      messageQueue.length = 0
      messageQueue.push(message)
    }

    const repeatCount = 3
    const breakRepeatCount = 12

    if (messageQueue.length === repeatCount) {
      messageQueue.length = repeatCount + 1
      return true
    } else if (messageQueue.length > repeatCount) {
      if (messageQueue.length - repeatCount === breakRepeatCount) {
        messageQueue.length = 0
        return 'break'
      }
    }
  } else {
    sessionToMessageQueue.set(sessionId, [message])
  }

  return false
}
