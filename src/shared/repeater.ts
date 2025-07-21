import { Context, Session, Next } from 'koishi'

export const name = 'repeater'

// 存储每个会话的消息队列
const sessionToMessageQueue = new Map<string, string[]>()

const repeatCount = 3 // 重复几次后触发复读
const breakRepeatCount = 12 // 连续复读多少次后打断

export function apply(ctx: Context) {
  ctx.middleware((session: Session, next: Next) => {
    const sessionId = `${session.platform}:${session.channelId}`
    const message = session.content
    
    if (!message || session.userId === ctx.bots[0]?.selfId) {
      return next()
    }

    const result = checkRepeater(sessionId, message)
    
    if (result === true) {
      // 触发复读
      return session.send(message)
    } else if (result === 'break') {
      // 打断复读
      return session.send('复读打断！')
    }
    
    return next()
  })
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

    if (messageQueue.length === repeatCount) {
      messageQueue.length = repeatCount + 1
      return true
    } else if (messageQueue.length > repeatCount) {
      if (messageQueue.length - repeatCount === breakRepeatCount) {
        messageQueue.length = 0
        return 'break'
      }
    }

    sessionToMessageQueue.set(sessionId, [...messageQueue])
  } else {
    sessionToMessageQueue.set(sessionId, [message])
  }

  return false
}
