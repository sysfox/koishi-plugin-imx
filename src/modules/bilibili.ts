import { Context, Schema, h } from 'koishi'
import axios from 'axios'
import { axiosRequestWithLog, simplifyAxiosError } from '../utils/axios-error'
import { sendMessage } from '../utils/broadcast'

const BILIBILI_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
const BILIBILI_TIMEOUT = 10_000
const LIVE_STATUS_CACHE_MAX = 500

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
  /** 请求 Bilibili 直播 API 时使用的 UA，未配置时使用内置默认 UA */
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

/** 带上限的开播状态缓存写入：超过上限时删除最旧条目 */
function setLiveStatusCache(roomId: number, isLive: boolean): void {
  if (!liveStatusCache.has(roomId) && liveStatusCache.size >= LIVE_STATUS_CACHE_MAX) {
    const oldest = liveStatusCache.keys().next()
    if (!oldest.done) liveStatusCache.delete(oldest.value)
  }
  liveStatusCache.set(roomId, isLive)
}
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
  const userAgent = config.userAgent || BILIBILI_UA

  const runCheck = () => checkLiveStatus(ctx, { ...normalizedConfig, roomIds }, logger)
  const interval = setInterval(() => {
    void runCheck()
  }, (config.checkInterval ?? 5) * 60 * 1000)

  // 启动后立即检查一次，不等待首个 interval
  void runCheck()

  ctx.on('dispose', () => {
    clearInterval(interval)
  })

  ctx.command('bili.status', '查看直播状态')
    .action(async ({ session }) => {
      if (!roomIds.length) {
        return '未配置监控房间'
      }

      const results = await Promise.allSettled(
        roomIds.map((roomId) =>
          axiosRequestWithLog(logger, () => getRoomLiveStatus(roomId, userAgent), `获取房间 ${roomId} 状态`),
        ),
      )

      return results
        .map((result, index) => {
          const roomId = roomIds[index]
          if (result.status === 'fulfilled' && result.value !== null) {
            return `房间 ${roomId}: ${result.value ? '🔴 直播中' : '⚫ 未直播'}`
          }
          return `房间 ${roomId}: ❌ 获取失败`
        })
        .join('\n')
    })

  logger.info(`Bilibili 模块已启动，监控 ${roomIds.length} 个房间`)
}

async function checkLiveStatus(ctx: Context, config: Config, logger: any) {
  const roomIds = normalizeRoomIds(config)
  if (!roomIds.length) return
  const userAgent = config.userAgent || BILIBILI_UA

  const checkOne = async (roomId: number): Promise<void> => {
    const isLive = await axiosRequestWithLog(
      logger,
      () => getRoomLiveStatus(roomId, userAgent),
      `检查房间 ${roomId} 直播状态`
    )

    if (isLive === null) {
      return
    }

    const wasLive = liveStatusCache.get(roomId) || false

    if (isLive && !wasLive) {
      const roomInfo = await axiosRequestWithLog(
        logger,
        () => getRoomInfo(roomId, userAgent),
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

    setLiveStatusCache(roomId, isLive)
  }

  await Promise.allSettled(roomIds.map((roomId) => checkOne(roomId)))
}

async function getRoomLiveStatus(roomId: number, userAgent: string = BILIBILI_UA): Promise<boolean> {
  const response = await axios.get(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${roomId}`, {
    timeout: BILIBILI_TIMEOUT,
    headers: { 'User-Agent': userAgent },
  })
  return response.data?.data?.live_status === 1
}

async function getRoomInfo(roomId: number, userAgent: string = BILIBILI_UA) {
  const response = await axios.get(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${roomId}`, {
    timeout: BILIBILI_TIMEOUT,
    headers: { 'User-Agent': userAgent },
  })
  return response.data?.data
}

function formatLiveMessage(roomInfo: any): string {
  if (!roomInfo || typeof roomInfo !== 'object') {
    return '🔴 主播开播了！（房间信息获取异常）'
  }
  const uname = roomInfo.uname ?? '未知主播'
  const title = roomInfo.title ?? '（无标题）'
  const online = roomInfo.online ?? '未知'
  const roomId = roomInfo.room_id ?? ''
  return [
    `🔴 ${uname} 开播了！`,
    `📺 ${title}`,
    `👥 观看人数: ${online}`,
    `🔗 https://live.bilibili.com/${roomId}`,
  ].join('\n')
}
