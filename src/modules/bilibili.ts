import { Context, Schema, h } from 'koishi'
import axios from 'axios'
import { truncateText } from '../utils/helper'
import { relativeTimeFromNow } from '../utils/time'
import { axiosRequestWithLog, simplifyAxiosError } from '../utils/axios-error'
import { sendMessage } from '../utils/broadcast'

export const name = 'bilibili'

export interface Config {
  enabled?: boolean
  roomIds?: number[]
  watchChannels?: string[]
  checkInterval?: number
  broadcastToAll?: boolean
  excludeChannels?: string[]
}

export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().description('启用 Bilibili 直播监控').default(false),
  roomIds: Schema.array(Schema.number()).description('监控的直播间ID列表').default([]),
  watchChannels: Schema.array(Schema.string()).description('推送通知的频道ID列表').default([]),
  checkInterval: Schema.number().description('检查间隔（分钟）').default(5).min(1).max(60),
  broadcastToAll: Schema.boolean().description('是否广播到所有联系人').default(false),
  excludeChannels: Schema.array(Schema.string()).description('排除的频道ID列表（当启用广播到所有联系人时）').default([]),
})

const liveStatusCache = new Map<number, boolean>()

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('bilibili')
  
  if (!config.enabled || !config.roomIds?.length) {
    return
  }

  const interval = setInterval(async () => {
    await checkLiveStatus(ctx, config, logger)
  }, config.checkInterval! * 60 * 1000)

  ctx.on('dispose', () => {
    clearInterval(interval)
  })

  ctx.command('bili.status', '查看直播状态')
    .action(async ({ session }) => {
      if (!config.roomIds?.length) {
        return '未配置监控房间'
      }

      const statusList = []
      for (const roomId of config.roomIds) {
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

  logger.info(`Bilibili 模块已启动，监控 ${config.roomIds.length} 个房间`)
}

async function checkLiveStatus(ctx: Context, config: Config, logger: any) {
  for (const roomId of config.roomIds!) {
    const isLive = await axiosRequestWithLog(
      logger,
      () => getRoomLiveStatus(roomId),
      `检查房间 ${roomId} 直播状态`
    )
    
    if (isLive === null) {
      // 请求失败，跳过此次检查
      continue
    }
    
    const wasLive = liveStatusCache.get(roomId) || false

    if (isLive && !wasLive) {
      // 开播通知
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
