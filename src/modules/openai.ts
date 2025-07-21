import { Context, Schema } from 'koishi'
import { Configuration, OpenAIApi } from 'openai'

export const name = 'openai'

export interface Config {
  apiKey: string
  model?: string
  temperature?: number
}

export const Config: Schema<Config> = Schema.object({
  apiKey: Schema.string().description('OpenAI API Key').role('secret'),
  model: Schema.string().default('gpt-3.5-turbo').description('使用的模型'),
  temperature: Schema.number().min(0).max(2).default(0.6).description('温度参数'),
})

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('openai')
  
  if (!config.apiKey) {
    logger.warn('OpenAI API Key not configured')
    return
  }

  const configuration = new Configuration({
    apiKey: config.apiKey,
  })
  const openai = new OpenAIApi(configuration)

  // 存储用户对话上下文
  const userConversations = new Map<string, Array<{ role: string; content: string }>>()

  async function generateResponse(userId: string, message: string): Promise<string> {
    try {
      let conversation = userConversations.get(userId) || []
      
      // 添加用户消息
      conversation.push({ role: 'user', content: message })
      
      // 限制对话历史长度
      if (conversation.length > 10) {
        conversation = conversation.slice(-10)
      }

      const response = await openai.createChatCompletion({
        model: config.model || 'gpt-3.5-turbo',
        messages: conversation,
        temperature: config.temperature || 0.6,
        max_tokens: 1000,
      })

      const reply = response.data.choices[0]?.message?.content
      if (reply) {
        // 添加助手回复到对话历史
        conversation.push({ role: 'assistant', content: reply })
        userConversations.set(userId, conversation)
        return reply
      }
      
      return '抱歉，我无法生成回复。'
    } catch (error) {
      logger.error('OpenAI API error:', error)
      return '抱歉，OpenAI 服务暂时不可用。'
    }
  }

  ctx.command('ask <message:text>', '询问 AI')
    .action(async ({ session }, message) => {
      if (!message) {
        return session?.send('请输入要询问的问题')
      }

      const userId = session?.userId!
      const response = await generateResponse(userId, message)
      return session?.send(response)
    })

  ctx.command('chat <message:text>', 'AI 对话')
    .action(async ({ session }, message) => {
      if (!message) {
        return session?.send('请输入对话内容')
      }

      const userId = session?.userId!
      
      // 重置对话
      if (message.trim() === 'reset') {
        userConversations.delete(userId)
        return session?.send('ChatGPT: 已重置对话上下文')
      }

      const response = await generateResponse(userId, message)
      return session?.send(response)
    })

  // 监听 @ 机器人的消息
  ctx.middleware((session, next) => {
    if (session.content && session.parsed?.appel) {
      const userId = session.userId!
      generateResponse(userId, session.content).then(response => {
        session.send(response)
      }).catch(error => {
        logger.error('Failed to generate response:', error)
      })
      return
    }
    return next()
  })

  logger.info('OpenAI module loaded')
}
