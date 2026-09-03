import { Context, Schema } from 'koishi'
import type {} from '@koishijs/plugin-server'
import * as mxSpace from './modules/mx-space'
import * as bilibili from './modules/bilibili'
import * as github from './modules/github'
import * as shared from './shared'

export const name = 'imx'
export const inject = ['server']

export interface Config {
  // MX Space 配置
  mxSpace?: {
    baseUrl?: string
    token?: string
    webhook?: {
      secret?: string
      path?: string
      watchChannels?: string[]
      broadcastToAll?: boolean
      excludeChannels?: string[]
      excludePlatforms?: string[]
    }
    greeting?: {
      enabled?: boolean
      channels?: string[]
      morningTime?: string
      eveningTime?: string
      broadcastToAll?: boolean
      excludeChannels?: string[]
      excludePlatforms?: string[]
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
  
  // Bilibili 配置（同时接受新旧字段：顶层 roomIds/roomId 与旧 liveRoom.roomId/liveRoom.roomIds）
  bilibili?: {
    enabled?: boolean
    roomId?: string | number
    roomIds?: (number | string)[]
    liveRoom?: {
      roomId?: string | number
      roomIds?: (number | string)[]
      watchChannels?: string[]
      checkInterval?: number
      broadcastToAll?: boolean
      excludeChannels?: string[]
      excludePlatforms?: string[]
    }
    watchChannels?: string[]
    checkInterval?: number
    broadcastToAll?: boolean
    excludeChannels?: string[]
    excludePlatforms?: string[]
    userAgent?: string
  }
  
  // GitHub 配置
  github?: {
    enabled?: boolean
    webhook?: {
      secret?: string
      path?: string
      watchChannels?: string[]
      broadcastToAll?: boolean
      excludeChannels?: string[]
      excludePlatforms?: string[]
    }
  }
  
  // 共享功能配置
  shared?: {
    errorNotify?: {
      enabled?: boolean
      channels?: string[]
    }
    repeater?: {
      enabled?: boolean
      threshold?: number
      chance?: number
      breakThreshold?: number
    }
    tools?: {
      enabled?: boolean
    }
  }
}

export const Config: Schema<Config> = Schema.object({
  mxSpace: Schema.object({
    baseUrl: Schema.string().description('MX Space API 地址').required(),
    token: Schema.string().description('MX Space API Token').role('secret'),
    webhook: Schema.object({
      secret: Schema.string().description('MX Space Webhook Secret').role('secret'),
      path: Schema.string().description('Webhook 路径').default('/mx-space/webhook'),
      watchChannels: Schema.array(Schema.string()).description('监听的频道ID列表').default([]),
      broadcastToAll: Schema.boolean().description('是否广播到所有联系人').default(false),
      excludeChannels: Schema.array(Schema.string()).description('排除的频道ID列表（当启用广播到所有联系人时）').default([]),
      excludePlatforms: Schema.array(Schema.string()).description('排除的平台列表（如：telegram, discord, qq等）').default(['telegram']),
    }).description('Webhook 配置'),
    greeting: Schema.object({
      enabled: Schema.boolean().description('启用问候功能').default(true),
      channels: Schema.array(Schema.string()).description('问候消息发送的频道').default([]),
      morningTime: Schema.string().description('早安时间 (cron格式)').default('0 0 6 * * *'),
      eveningTime: Schema.string().description('晚安时间 (cron格式)').default('0 0 22 * * *'),
      broadcastToAll: Schema.boolean().description('是否广播问候消息到所有联系人').default(false),
      excludeChannels: Schema.array(Schema.string()).description('排除的频道ID列表（当启用广播到所有联系人时）').default([]),
      excludePlatforms: Schema.array(Schema.string()).description('排除的平台列表（如：telegram, discord, qq等）').default(['telegram']),
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
  }).description('MX Space 配置'),
  
  bilibili: Schema.object({
    enabled: Schema.boolean().description('启用 Bilibili 功能').default(false),
    roomId: Schema.union([Schema.string(), Schema.number()]).description('兼容旧配置：单个直播间ID'),
    roomIds: Schema.array(Schema.union([Schema.number(), Schema.string()])).description('监控的直播间ID列表').default([]),
    liveRoom: Schema.object({
      roomId: Schema.union([Schema.string(), Schema.number()]).description('兼容旧配置：直播间房间号（单个）'),
      roomIds: Schema.array(Schema.union([Schema.number(), Schema.string()])).description('兼容字段：直播间ID列表').default([]),
      watchChannels: Schema.array(Schema.string()).description('监听的频道ID列表').default([]),
      checkInterval: Schema.number().description('检查间隔（分钟）').default(1).min(1).max(10),
      broadcastToAll: Schema.boolean().description('是否广播到所有联系人').default(false),
      excludeChannels: Schema.array(Schema.string()).description('排除的频道ID列表（当启用广播到所有联系人时）').default([]),
      excludePlatforms: Schema.array(Schema.string()).description('排除的平台列表（如：telegram, discord, qq等）').default(['telegram']),
    }).description('直播间监控配置（兼容旧字段）'),
    watchChannels: Schema.array(Schema.string()).description('推送通知的频道ID列表').default([]),
    checkInterval: Schema.number().description('检查间隔（分钟）').default(5).min(1).max(60),
    broadcastToAll: Schema.boolean().description('是否广播到所有联系人').default(false),
    excludeChannels: Schema.array(Schema.string()).description('排除的频道ID列表（当启用广播到所有联系人时）').default([]),
    excludePlatforms: Schema.array(Schema.string()).description('排除的平台列表（如：telegram, discord, qq等）').default(['telegram']),
    userAgent: Schema.string().description('User-Agent（Bilibili 直播 API 请求头，未配置时使用内置默认 UA）').default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'),
  }).description('Bilibili 配置'),
  
  github: Schema.object({
    enabled: Schema.boolean().description('启用 GitHub 功能').default(false),
    webhook: Schema.object({
      secret: Schema.string().description('GitHub Webhook Secret').role('secret'),
      path: Schema.string().description('Webhook 路径').default('/github/webhook'),
      watchChannels: Schema.array(Schema.string()).description('监听的频道ID列表').default([]),
      broadcastToAll: Schema.boolean().description('是否广播到所有联系人').default(false),
      excludeChannels: Schema.array(Schema.string()).description('排除的频道ID列表（当启用广播到所有联系人时）').default([]),
      excludePlatforms: Schema.array(Schema.string()).description('排除的平台列表（如：telegram, discord, qq等）').default(['telegram']),
    }).description('GitHub Webhook 配置'),
  }).description('GitHub 配置'),
  
  shared: Schema.object({
    errorNotify: Schema.object({
      enabled: Schema.boolean().description('启用错误通知').default(true),
      channels: Schema.array(Schema.string()).description('错误通知发送的频道').default([]),
    }).description('错误通知配置'),
    repeater: Schema.object({
      enabled: Schema.boolean().description('启用复读机').default(false),
      threshold: Schema.number().description('触发复读的次数').default(3).min(2).max(10),
      chance: Schema.number().description('复读概率 (0-1)').default(0.5).min(0).max(1),
      breakThreshold: Schema.number().description('连续复读多少次后打断').default(12).min(5).max(20),
    }).description('复读机配置'),
    tools: Schema.object({
      enabled: Schema.boolean().description('启用工具命令').default(true),
    }).description('工具命令配置'),
  }).description('共享功能配置'),
})

export function normalizeBilibiliConfig(raw: NonNullable<Config['bilibili']>): bilibili.Config {
  const toNumbers = (values: (number | string | undefined | null)[]): number[] => {
    const out: number[] = []
    for (const v of values) {
      if (v === undefined || v === null || v === '') continue
      const n = typeof v === 'number' ? v : Number(v)
      if (Number.isFinite(n) && n > 0) out.push(Math.floor(n))
    }
    return [...new Set(out)]
  }

  const roomIds = toNumbers([
    ...(Array.isArray(raw.roomIds) ? raw.roomIds : []),
    ...(Array.isArray(raw.liveRoom?.roomIds) ? raw.liveRoom.roomIds : []),
    raw.roomId,
    raw.liveRoom?.roomId,
  ])

  return {
    enabled: raw.enabled,
    roomIds,
    watchChannels: raw.watchChannels ?? raw.liveRoom?.watchChannels ?? [],
    checkInterval: raw.checkInterval ?? raw.liveRoom?.checkInterval ?? 5,
    broadcastToAll: raw.broadcastToAll ?? raw.liveRoom?.broadcastToAll ?? false,
    excludeChannels: raw.excludeChannels ?? raw.liveRoom?.excludeChannels ?? [],
    excludePlatforms: raw.excludePlatforms ?? raw.liveRoom?.excludePlatforms ?? ['telegram'],
    userAgent: raw.userAgent,
  }
}

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('imx')

  if (config.mxSpace?.baseUrl) {
    try {
      ctx.plugin(mxSpace, config.mxSpace)
    } catch (error) {
      logger.error('MX Space 模块加载错误:', error)
    }
  }
  
  if (config.bilibili?.enabled) {
    try {
      ctx.plugin(bilibili, normalizeBilibiliConfig(config.bilibili))
    } catch (error) {
      logger.error('Bilibili 模块加载错误:', error)
    }
  }
  
  if (config.github?.enabled) {
    try {
      ctx.plugin(github, config.github)
    } catch (error) {
      logger.error('GitHub 模块加载错误:', error)
    }
  }
  
  if (config.shared) {
    try {
      ctx.plugin(shared, config.shared)
    } catch (error) {
      logger.error('共享功能模块加载错误:', error)
    }
  }
  
  logger.info('IMX 插件启动完成')
}
