import { Context, h } from 'koishi'

export interface BroadcastOptions {
  watchChannels?: string[]
  broadcastToAll?: boolean
  excludeChannels?: string[]
}

export async function broadcastToAllContacts(
  ctx: Context,
  message: string | h[],
  excludeChannels: string[] = [],
  logger: any,
) {
  try {
    let totalSent = 0
    let totalFailed = 0

    for (const bot of ctx.bots) {
      if (!bot.online) continue

      try {
        const guilds = await bot.getGuildList()
        for (const guild of guilds.data) {
          if (excludeChannels.includes(guild.id)) continue

          try {
            const channels = await bot.getChannelList(guild.id)
            for (const channel of channels.data) {
              if (excludeChannels.includes(channel.id)) continue
              
              try {
                await bot.sendMessage(channel.id, message)
                totalSent++
              } catch (error) {
                totalFailed++
              }
            }
          } catch (error) {
            logger.debug(`获取群组 ${guild.id} 的频道列表失败:`, error)
          }
        }

        // 获取好友列表（私聊）
        try {
          const friends = await bot.getFriendList()
          for (const friend of friends.data) {
            if (excludeChannels.includes(friend.id)) continue

            try {
              await bot.sendPrivateMessage(friend.id, message)
              totalSent++
              logger.debug(`成功发送私聊消息到 ${friend.nickname || friend.id}`)
            } catch (error) {
              totalFailed++
              logger.debug(`发送私聊消息到 ${friend.id} 失败:`, error)
            }
          }
        } catch (error) {
          logger.debug('获取好友列表失败 (可能平台不支持):', error)
        }

      } catch (error) {
        logger.warn(`机器人 ${bot.platform}:${bot.selfId} 广播失败:`, error)
      }
    }

    logger.info(`广播消息完成: 成功 ${totalSent} 个，失败 ${totalFailed} 个`)
  } catch (error) {
    logger.error('广播消息时发生错误:', error)
  }
}

/**
 * 根据配置发送消息到指定频道或广播到所有联系人
 * @param ctx Koishi 上下文
 * @param message 要发送的消息
 * @param options 广播选项
 * @param logger 日志记录器
 */
export async function sendMessage(
  ctx: Context,
  message: string | h[],
  options: BroadcastOptions,
  logger: any,
) {
  const { watchChannels = [], broadcastToAll = false, excludeChannels = [] } = options

  if (broadcastToAll) {
    await broadcastToAllContacts(ctx, message, excludeChannels, logger)
  } else if (watchChannels.length > 0) {
    const tasks = watchChannels.map(async (channelId: string) => {
      try {
        const bot = ctx.bots.find(bot => bot.selfId)
        if (bot) {
          await bot.sendMessage(channelId, message)
        }
      } catch (error) {
        logger.error(`发送消息到频道 ${channelId} 失败:`, error)
      }
    })
    await Promise.allSettled(tasks)
  }
}
