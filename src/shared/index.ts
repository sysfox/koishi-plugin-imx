import { Context, Schema } from 'koishi'
import * as repeater from './repeater'
import * as toolCommands from './commands/tool'

export const name = 'shared'

export interface Config {
  errorNotify?: {
    enabled?: boolean
    channels?: string[]
  }
  repeater?: {
    enabled?: boolean
    threshold?: number
    chance?: number
  }
  tools?: {
    enabled?: boolean
  }
}

export const Config: Schema<Config> = Schema.object({
  errorNotify: Schema.object({
    enabled: Schema.boolean().description('启用错误通知').default(true),
    channels: Schema.array(Schema.string()).description('错误通知发送的频道').default([]),
  }).description('错误通知配置'),
  repeater: Schema.object({
    enabled: Schema.boolean().description('启用复读机').default(false),
    threshold: Schema.number().description('触发复读的次数').default(3).min(2).max(10),
    chance: Schema.number().description('复读概率 (0-1)').default(0.5).min(0).max(1),
  }).description('复读机配置'),
  tools: Schema.object({
    enabled: Schema.boolean().description('启用工具命令').default(true),
  }).description('工具命令配置'),
})

export function apply(ctx: Context, config: Config = {}) {
  const logger = ctx.logger('shared')

  // 注册复读机功能
  if (config.repeater?.enabled) {
    ctx.plugin(repeater, config.repeater)
  }

  // 注册工具命令
  if (config.tools?.enabled !== false) {
    ctx.plugin(toolCommands, config.tools || {})
  }

  // 错误处理和通知
  if (config.errorNotify?.enabled) {
    ctx.on('internal/error', (error) => {
      logger.error('插件内部错误:', error)
      
      // 发送错误通知到指定频道
      if (config.errorNotify?.channels?.length) {
        const errorMessage = `⚠️ 插件发生错误：${error.message}`
        
        config.errorNotify.channels.forEach(async (channelId) => {
          try {
            await ctx.broadcast([channelId], errorMessage)
          } catch (err) {
            logger.error(`发送错误通知到频道 ${channelId} 失败:`, err)
          }
        })
      }
    })
  }
}

export * from './repeater'
export * from './commands/tool'
