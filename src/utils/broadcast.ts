import { Context, h } from 'koishi'

export interface BroadcastOptions {
  watchChannels?: string[]
  broadcastToAll?: boolean
  excludeChannels?: string[]
  excludePlatforms?: string[]
}

export async function broadcastToAllContacts(
  ctx: Context,
  message: string | h[],
  excludeChannels: string[] = [],
  excludePlatforms: string[] = [],
  logger: any,
) {
  try {
    let totalSent = 0
    let totalFailed = 0

    for (const bot of ctx.bots) {
      if (!bot.online) continue
      
      // Skip platforms that are configured to be excluded
      if (excludePlatforms.includes(bot.platform)) {
        logger.info(`跳过已配置排除的平台: ${bot.platform}:${bot.selfId}`)
        continue
      }

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
            // Silently handle channel list fetch errors
          }
        }

        try {
          const friends = await bot.getFriendList()
          for (const friend of friends.data) {
            if (excludeChannels.includes(friend.id)) continue

            try {
              await bot.sendPrivateMessage(friend.id, message)
              totalSent++
            } catch (error) {
              totalFailed++
            }
          }
        } catch (error) {
          // Silently handle error for unsupported platforms
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

export async function sendMessage(
  ctx: Context,
  message: string | h[],
  options: BroadcastOptions,
  logger: any,
) {
  const { watchChannels = [], broadcastToAll = false, excludeChannels = [], excludePlatforms = [] } = options

  if (broadcastToAll) {
    await broadcastToAllContacts(ctx, message, excludeChannels, excludePlatforms, logger)
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
