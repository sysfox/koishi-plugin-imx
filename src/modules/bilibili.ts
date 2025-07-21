import { Context, Schema } from 'koishi'
import axios from 'axios'

export const name = 'bilibili'

export interface Config {
  enabled?: boolean
  liveRoomId?: string
  watchChannels?: string[]
  checkInterval?: number
  atAll?: boolean
}

export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().default(false).description('启用 Bilibili 直播监控'),
  liveRoomId: Schema.string().description('B站直播间ID'),
  watchChannels: Schema.array(Schema.string()).description('推送通知的频道ID列表').default([]),
  checkInterval: Schema.number().default(60000).description('检查间隔（毫秒）').min(30000),
  atAll: Schema.boolean().default(false).description('开播时是否@全体成员'),
})

interface BilibiliLiveInfo {
  live_status: number
  uid: number
  uname: string
  title: string
  cover: string
  room_id: number
}

interface LivePlayInfo {
  live_status: number
  playurl_info?: any
}

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('bilibili')
  
  if (!config.enabled || !config.liveRoomId) {
    return
  }

  let isLive = false
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://www.bilibili.com'
  }

  async function checkLiveStatus(): Promise<void> {
    try {
      // 获取直播状态
      const playInfoResponse = await axios.get(
        `https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${config.liveRoomId}&protocol=0,1&format=0,1,2&codec=0,1&qn=0&platform=web&ptype=8&dolby=5`,
        { headers, timeout: 10000 }
      )

      const playInfo: LivePlayInfo = playInfoResponse.data?.data
      
      if (!playInfo) {
        return
      }

      const isCurrentlyLive = playInfo.live_status === 1 && !!playInfo.playurl_info
      
      // 如果状态从不在线变为在线，发送通知
      if (!isLive && isCurrentlyLive) {
        await sendLiveNotification()
        isLive = true
      } else if (isLive && !isCurrentlyLive) {
        isLive = false
      }
      
    } catch (error) {
      logger.error('检查直播状态失败:', error)
    }
  }

  async function sendLiveNotification(): Promise<void> {
    try {
      // 获取主播信息
      const userInfoResponse = await axios.get(
        `https://api.live.bilibili.com/live_user/v1/UserInfo/get_anchor_in_room?roomid=${config.liveRoomId}`,
        { headers, timeout: 10000 }
      )

      const userInfo = userInfoResponse.data?.data?.info
      if (!userInfo) {
        return
      }

      // 获取直播间信息
      const roomInfoResponse = await axios.get(
        `https://api.live.bilibili.com/xlive/web-room/v1/index/getRoomBaseInfo?room_ids=${config.liveRoomId}&req_biz=link-center`,
        { headers, timeout: 10000 }
      )

      const roomInfo = roomInfoResponse.data?.data?.by_room_ids?.[config.liveRoomId!]
      
      let coverImage: Buffer | null = null
      if (roomInfo?.cover) {
        try {
          const imageResponse = await axios.get(roomInfo.cover, {
            headers,
            responseType: 'arraybuffer',
            timeout: 10000
          })
          coverImage = Buffer.from(imageResponse.data)
        } catch (error) {
          logger.warn('获取直播间封面失败:', error)
        }
      }

      const message = [
        coverImage ? `<image data="base64://${coverImage.toString('base64')}"/>` : '',
        config.atAll ? '<at type="all"/>' : '',
        `${userInfo.uname}(${userInfo.uid}) 开播了！\n\n`,
        roomInfo?.title ? `标题: ${roomInfo.title}\n` : '',
        `直播间: https://live.bilibili.com/${config.liveRoomId}`
      ].filter(Boolean).join('')

      // 向所有监控频道发送通知
      for (const channelId of config.watchChannels || []) {
        try {
          const session = ctx.bots[0]?.createSession({ 
            channelId, 
            platform: ctx.bots[0].platform 
          })
          if (session) {
            await session.send(message)
          }
        } catch (error) {
          logger.error(`向频道 ${channelId} 发送开播通知失败:`, error)
        }
      }
      
      logger.info(`发送开播通知: ${userInfo.uname}`)
      
    } catch (error) {
      logger.error('发送直播通知失败:', error)
    }
  }

  // 定时检查直播状态
  ctx.setInterval(checkLiveStatus, config.checkInterval || 60000)
  
  // 立即检查一次
  setTimeout(checkLiveStatus, 5000)

  ctx.command('bili.status', '查看B站直播状态')
    .action(async ({ session }) => {
      try {
        const response = await axios.get(
          `https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${config.liveRoomId}&protocol=0,1&format=0,1,2&codec=0,1&qn=0&platform=web&ptype=8&dolby=5`,
          { headers, timeout: 10000 }
        )

        const playInfo = response.data?.data
        const isCurrentlyLive = playInfo?.live_status === 1 && !!playInfo?.playurl_info
        
        return session?.send(`直播间 ${config.liveRoomId} 当前状态: ${isCurrentlyLive ? '直播中' : '未直播'}`)
      } catch (error) {
        logger.error('查询直播状态失败:', error)
        return session?.send('查询直播状态失败')
      }
    })

  logger.info(`Bilibili 直播监控已启动，监控房间: ${config.liveRoomId}`)
}
