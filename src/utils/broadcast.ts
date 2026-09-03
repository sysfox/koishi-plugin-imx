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
      if (bot.platform && excludePlatforms.includes(bot.platform)) {
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
            logger.warn(`获取频道列表失败，已跳过该群组:`, error)
          }
        }

        try {
          const friends = await bot.getFriendList()
          for (const friend of friends.data) {
            const friendId = friend.user?.id
            if (!friendId || excludeChannels.includes(friendId)) continue

            try {
              await bot.sendPrivateMessage(friendId, message)
              totalSent++
            } catch (error) {
              totalFailed++
            }
          }
        } catch (error) {
          logger.warn(`获取好友列表失败，已跳过该机器人 ${bot.platform}:${bot.selfId}:`, error)
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
): Promise<boolean> {
  const { watchChannels = [], broadcastToAll = false, excludeChannels = [], excludePlatforms = [] } = options

  if (broadcastToAll) {
    await broadcastToAllContacts(ctx, message, excludeChannels, excludePlatforms, logger)
    return true
  }

  if (watchChannels.length === 0) {
    return false
  }

  const tasks = watchChannels.map((rawChannelId: string) => sendToChannel(ctx, rawChannelId, message, excludePlatforms, logger))
  const results = await Promise.allSettled(tasks)
  return results.some((r) => r.status === 'fulfilled' && r.value === true)
}

/**
 * 解析频道目标，支持可选的 `platform:channelId` 前缀。
 */
function parseChannelTarget(rawChannelId: string): { platform?: string; channelId: string } {
  const idx = rawChannelId.indexOf(':')
  if (idx > 0) {
    const platform = rawChannelId.slice(0, idx)
    const rest = rawChannelId.slice(idx + 1)
    if (platform && rest && /^[a-z0-9_-]+$/i.test(platform)) {
      return { platform, channelId: rest }
    }
  }
  return { channelId: rawChannelId }
}

/**
 * 按频道归属 bot 发送：platform 前缀匹配的 bot 优先，
 * 无前缀时按序尝试在线 bot，首个成功即停，避免恒取首个 bot 发错位置。
 */
async function sendToChannel(
  ctx: Context,
  rawChannelId: string,
  message: string | h[],
  excludePlatforms: string[],
  logger: any,
): Promise<boolean> {
  const target = parseChannelTarget(rawChannelId)
  const onlineBots = ctx.bots.filter((bot) => {
    if (!bot.online) return false
    if (bot.platform && excludePlatforms.includes(bot.platform)) return false
    return true
  })

  if (onlineBots.length === 0) {
    logger.error(`发送消息到频道 ${rawChannelId} 失败: 无可用机器人`)
    return false
  }

  const candidates = target.platform
    ? [
        ...onlineBots.filter((bot) => bot.platform === target.platform),
        ...onlineBots.filter((bot) => bot.platform !== target.platform),
      ]
    : onlineBots

  let lastError: any = null
  for (const bot of candidates) {
    try {
      await bot.sendMessage(target.channelId, message)
      return true
    } catch (error) {
      lastError = error
    }
  }

  logger.error(`发送消息到频道 ${rawChannelId} 失败:`, lastError)
  return false
}
