import { Context, Schema, h } from 'koishi'
import axios from 'axios'
import { truncateText } from '../utils/helper'
import { relativeTimeFromNow } from '../utils/time'
import { axiosRequestWithLog, simplifyAxiosError } from '../utils/axios-error'
import { sendMessage } from '../utils/broadcast'

export const name = 'bilibili'

export interface Config {
  enabled?: boolean
  /** 新字段：直播间 ID 列表（数字或数字字符串均可，内部归一化为 number[]） */
  roomIds?: (number | string)[]
  /** 兼容旧字段：单个直播间 ID（string 或 number） */
  roomId?: string | number
  watchChannels?: string[]
  checkInterval?: number
  broadcastToAll?: boolean
  excludeChannels?: string[]
  excludePlatforms?: string[]
  /** 保留字段：顶层透传的 UA，当前监控请求未使用 */
  userAgent?: string
}

export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().description('启用 Bilibili 直播监控').default(false),
  roomIds: Schema.array(Schema.union([Schema.number(), Schema.string()])).description('监控的直播间ID列表').default([]),
  roomId: Schema.union([Schema.string(), Schema.number()]).description('兼容旧配置：单个直播间ID'),
  watchChannels: Schema.array(Schema.string()).description('推送通知的频道ID列表').default([]),
  checkInterval: Schema.number().description('检查间隔（分钟）').default(5).min(1).max(60),
  broadcastToAll: Schema.boolean().description('是否广播到所有联系人').default(false),
  excludeChannels: Schema.array(Schema.string()).description('排除的频道ID列表（当启用广播到所有联系人时）').default([]),
  excludePlatforms: Schema.array(Schema.string()).description('排除的平台列表（如：telegram, discord, qq等）').default(['telegram']),
  userAgent: Schema.string().description('User-Agent（保留字段）'),
})

const liveStatusCache = new Map<number, boolean>()

/** 将 roomIds/roomId（number|string|数组）归一化为 number[]，过滤非法值并去重 */
export function normalizeRoomIds(input: { roomIds?: (number | string)[]; roomId?: string | number }): number[] {
  const out: number[] = []
  const push = (v: unknown) => {
    if (v === undefined || v === null || v === '') return
    const n = typeof v === 'number' ? v : Number(v)
    if (Number.isFinite(n) && n > 0) out.push(Math.floor(n))
  }
  if (Array.isArray(input.roomIds)) {
    for (const v of input.roomIds) push(v)
  }
  push(input.roomId)
  return [...new Set(out)]
}

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('bilibili')

  if (!config.enabled) {
    return
  }

  const roomIds = normalizeRoomIds(config)
  if (!roomIds.length) {
    logger.warn('Bilibili 已启用但未配置任何直播间 ID（roomIds/roomId），跳过监控')
    return
  }

  const normalizedConfig: Config & { roomIds: (number | string)[] } = { ...config, roomIds }

  const interval = setInterval(async () => {
    await checkLiveStatus(ctx, { ...normalizedConfig, roomIds }, logger)
  }, (config.checkInterval ?? 5) * 60 * 1000)

  ctx.on('dispose', () => {
    clearInterval(interval)
  })

  ctx.command('bili.status', '查看直播状态')
    .action(async ({ session }) => {
      if (!roomIds.length) {
        return '未配置监控房间'
      }

      const statusList = []
      for (const roomId of roomIds) {
        const isLive = await axiosRequestWithLog(
          logger,
          () => getRoomLiveStatus(roomId),
          `获取房间 ${roomId} 状态`
        )
        
        if (isLive !== null) {
          statusList.push(`房间 ${roomId}: ${isLive ? '🔴 直播中' : '⚫ 未直播'}`)
        } else {
          statusList.push(`房间 ${roomId}: ❌ 获取失败`)
        }
      }

      return statusList.join('\n')
    })

  logger.info(`Bilibili 模块已启动，监控 ${roomIds.length} 个房间`)
}

async function checkLiveStatus(ctx: Context, config: Config, logger: any) {
  const roomIds = normalizeRoomIds(config)
  for (const roomId of roomIds) {
    const isLive = await axiosRequestWithLog(
      logger,
      () => getRoomLiveStatus(roomId),
      `检查房间 ${roomId} 直播状态`
    )
    
    if (isLive === null) {
      continue
    }
    
    const wasLive = liveStatusCache.get(roomId) || false

    if (isLive && !wasLive) {
      const roomInfo = await axiosRequestWithLog(
        logger,
        () => getRoomInfo(roomId),
        `获取房间 ${roomId} 信息`
      )
      
      if (roomInfo) {
        const message = formatLiveMessage(roomInfo)
        await sendMessage(ctx, message, {
          watchChannels: config.watchChannels,
          broadcastToAll: config.broadcastToAll,
          excludeChannels: config.excludeChannels,
          excludePlatforms: config.excludePlatforms,
        }, logger)
      }
    }

    liveStatusCache.set(roomId, isLive)
  }
}

async function getRoomLiveStatus(roomId: number): Promise<boolean> {
  const response = await axios.get(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${roomId}`)
  return response.data.data.live_status === 1
}

async function getRoomInfo(roomId: number) {
  const response = await axios.get(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${roomId}`)
  return response.data.data
}

function formatLiveMessage(roomInfo: any): string {
  return [
    `🔴 ${roomInfo.uname} 开播了！`,
    `📺 ${roomInfo.title}`,
    `👥 观看人数: ${roomInfo.online}`,
    `🔗 https://live.bilibili.com/${roomInfo.room_id}`,
  ].join('\n')
}
