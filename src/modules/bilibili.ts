import { Context, Schema, h } from 'koishi'
import axios from 'axios'
import { truncateText } from '../utils/helper'
import { relativeTimeFromNow } from '../utils/time'

export const name = 'bilibili'

export interface Config {
  enabled?: boolean
  roomIds?: number[]
  watchChannels?: string[]
  checkInterval?: number
}

export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().description('启用 Bilibili 直播监控').default(false),
  roomIds: Schema.array(Schema.number()).description('监控的直播间ID列表').default([]),
  watchChannels: Schema.array(Schema.string()).description('推送通知的频道ID列表').default([]),
  checkInterval: Schema.number().description('检查间隔（分钟）').default(5).min(1).max(60),
})

const liveStatusCache = new Map<number, boolean>()

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('bilibili')
  
  if (!config.enabled || !config.roomIds?.length) {
    logger.info('Bilibili 模块未启用或未配置房间ID')
    return
  }

  // 定时检查直播状态
  const interval = setInterval(async () => {
    await checkLiveStatus(ctx, config, logger)
  }, config.checkInterval! * 60 * 1000)

  // 插件停止时清理定时器
  ctx.on('dispose', () => {
    clearInterval(interval)
    logger.info('Bilibili 监控已停止')
  })

  // 注册命令
  ctx.command('bili.status', '查看直播状态')
    .action(async ({ session }) => {
      if (!config.roomIds?.length) {
        return '未配置监控房间'
      }

      const statusList = []
      for (const roomId of config.roomIds) {
        try {
          const isLive = await getRoomLiveStatus(roomId)
          statusList.push(`房间 ${roomId}: ${isLive ? '🔴 直播中' : '⚫ 未直播'}`)
        } catch (error) {
          statusList.push(`房间 ${roomId}: ❌ 获取失败`)
        }
      }

      return statusList.join('\n')
    })

  logger.info(`Bilibili 直播监控已启动，监控 ${config.roomIds.length} 个房间`)
}

async function checkLiveStatus(ctx: Context, config: Config, logger: any) {
  for (const roomId of config.roomIds!) {
    try {
      const isLive = await getRoomLiveStatus(roomId)
      const wasLive = liveStatusCache.get(roomId) || false

      if (isLive && !wasLive) {
        // 开播通知
        const roomInfo = await getRoomInfo(roomId)
        const message = formatLiveMessage(roomInfo)
        await sendToChannels(ctx, config.watchChannels!, message, logger)
      }

      liveStatusCache.set(roomId, isLive)
    } catch (error) {
      logger.error(`检查房间 ${roomId} 状态失败:`, error)
    }
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

async function sendToChannels(ctx: Context, channels: string[], message: string, logger: any) {
  for (const channelId of channels) {
    try {
      await ctx.broadcast([channelId], message)
    } catch (error) {
      logger.error(`发送消息到频道 ${channelId} 失败:`, error)
    }
  }
}
