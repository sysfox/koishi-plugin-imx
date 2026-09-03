import { Context, h } from 'koishi'
import dayjs from 'dayjs'
import RemoveMarkdown from 'remove-markdown'
import type { CommentModel, LinkModel, NoteModel, PageModel, PostModel } from '@mx-space/api-client'
import { CollectionRefTypes, LinkState } from '@mx-space/api-client'
import { getApiClient, getMxSpaceAggregateData } from './mx-api'
import { urlBuilder } from './mx-url-builder'
import { sendMessage } from './broadcast'

// MX Space 事件类型
export enum BusinessEvents {
  POST_CREATE = 'POST_CREATE',
  POST_UPDATE = 'POST_UPDATE',
  NOTE_CREATE = 'NOTE_CREATE',
  COMMENT_CREATE = 'COMMENT_CREATE',
  LINK_APPLY = 'LINK_APPLY',
  SAY_CREATE = 'SAY_CREATE',
  RECENTLY_CREATE = 'RECENTLY_CREATE',
}

export async function handleMxSpaceEvent(
  ctx: Context,
  config: any,
  type: string,
  payload: any,
  logger: any,
) {
  logger.info(`处理 MX Space 事件: ${type}`)

  try {
    const aggregateData = await getMxSpaceAggregateData(ctx, config)
    const owner = aggregateData.user
    const watchChannels = config.webhook?.watchChannels || []
    const broadcastToAll = config.webhook?.broadcastToAll || false
    const excludeChannels = config.webhook?.excludeChannels || []
    const excludePlatforms = config.webhook?.excludePlatforms || []

    if (!broadcastToAll && !watchChannels.length) {
      logger.warn('没有配置监听频道且未启用广播到所有联系人，跳过事件处理')
      return
    }

    const sendToChannels = async (message: string | h[]) => {
      await sendMessage(ctx, message, {
        watchChannels,
        broadcastToAll,
        excludeChannels,
        excludePlatforms,
      }, logger)
    }

    switch (type) {
      case BusinessEvents.POST_CREATE:
      case BusinessEvents.POST_UPDATE: {
        const isNew = type === BusinessEvents.POST_CREATE
        const publishDescription = isNew ? '发布了新文章' : '更新了文章'
        const { title, category, id, summary, created } = payload as PostModel

        if (type === BusinessEvents.POST_UPDATE) {
          // 只有创建90天内的文章更新才发送通知
          const createdDate = dayjs(created)
          const now = dayjs()
          const diff = now.diff(createdDate, 'day')
          if (diff >= 90) {
            return
          }
        }

        if (!category) {
          logger.error(`category not found, post id: ${id}`)
          return
        }

        const url = await urlBuilder.build(ctx, config, payload as PostModel)
        const message = `📚 ${owner.name} ${publishDescription}: ${title}\n\n${
          summary ? `${summary}\n\n` : ''
        }🔗 前往阅读：${url}`

        await sendToChannels(message)
        return
      }

      case BusinessEvents.NOTE_CREATE: {
        const publishDescription = '发布了新的日记'
        const note = payload as NoteModel & { hide?: boolean; password?: string }
        const { title, text, mood, weather, images, hide, password } = note
        
        // 检查是否为隐私内容
        const isSecret = checkNoteIsSecret(note)
        if (hide || password || isSecret) {
          return
        }

        const simplePreview = getSimplePreview(text ?? '')
        const status = [mood ? `心情: ${mood}` : '', weather ? `天气: ${weather}` : '']
          .filter(Boolean)
          .join('\t')

        const url = await urlBuilder.build(ctx, config, payload as NoteModel)
        let message = `📔 ${owner.name} ${publishDescription}: ${title}\n${
          status ? `\n${status}\n\n` : '\n'
        }${simplePreview}\n\n🔗 前往阅读：${url}`

        // 图片 URL 来自 webhook 负载（外部输入），仅允许 http(s)，
        // 防止 bot 被诱导发送 file://、内网 URL 等危险资源。
        if (Array.isArray(images) && images.length > 0) {
          const imageMessages = images
            .filter(img => img && isSafeHttpUrl(img.src))
            .slice(0, 4)
            .map(img => h.image(img.src))
          if (imageMessages.length > 0) {
            await sendToChannels([h.text(message), ...imageMessages])
          } else {
            await sendToChannels(message)
          }
        } else {
          await sendToChannels(message)
        }

        return
      }

      case BusinessEvents.LINK_APPLY: {
        const { avatar, name, url, description, state } = payload as LinkModel
        if (state !== LinkState.Audit) {
          return
        }

        let message = `🔗 有新的友链申请！\n\n` +
          `📝 名称: ${sanitizeChatText(name, 50)}\n` +
          `🌐 链接: ${sanitizeChatText(url, 200)}\n` +
          `📄 描述: ${sanitizeChatText(description, 200)}`

        if (avatar) {
          if (isSafeHttpUrl(avatar)) {
            await sendToChannels([h.image(avatar), h.text(message)])
          } else {
            await sendToChannels(message)
          }
        } else {
          await sendToChannels(message)
        }
        return
      }

      case BusinessEvents.COMMENT_CREATE: {
        const { author, text, refType, id, isWhispers } = payload as CommentModel
        const parent = (payload as CommentModel & { parent?: unknown }).parent
        const siteTitle = aggregateData.seo.title

        if (isWhispers) {
          await sendToChannels(`🤫 「${siteTitle}」嘘，有人说了一句悄悄话...`)
          return
        }

        // 检查父评论是否为悄悄话
        const parentIsWhispers = (() => {
          const walk: (parent: any) => boolean = (parent) => {
            if (!parent || typeof parent === 'string') {
              return false
            }
            return parent.isWhispers || walk(parent?.parent)
          }
          return walk(parent)
        })()

        if (parentIsWhispers) {
          logger.warn('[comment]: parent comment is whispers, ignore')
          return
        }

        const refId = payload.ref?.id || payload.ref?._id || payload.ref
        let refModel: PostModel | NoteModel | PageModel | null = null

        try {
          const apiClient = getApiClient(ctx, config)
          switch (refType) {
            case CollectionRefTypes.Post: {
              refModel = await apiClient.post.getPost(refId)
              break
            }
            case CollectionRefTypes.Note: {
              refModel = await apiClient.note.getNoteById(refId as string)
              break
            }
            case CollectionRefTypes.Page: {
              refModel = await apiClient.page.getById(refId)
              break
            }
          }
        } catch (error) {
          logger.error(`[comment]: 获取引用内容失败, refId: ${refId}`, error)
          return
        }

        if (!refModel) {
          logger.error(`[comment]: ref model not found, refId: ${refId}`)
          return
        }

        const isMaster = author === owner.name || author === owner.username
        let message: string

        // author / title / text 均来自 webhook 外部输入，截断并去除控制字符，
        // 防止超长消息刷屏与伪造系统通知。
        const safeAuthor = sanitizeChatText(author, 50)
        const safeTitle = sanitizeChatText(refModel.title, 100)
        const safeText = sanitizeChatText(text, 500)

        if (isMaster && !parent) {
          const timeAgo = dayjs(refModel.created).fromNow()
          message = `💬 ${safeAuthor} 在「${safeTitle}」发表之后的 ${timeAgo}又说：\n\n${safeText}`
        } else {
          message = `💬 ${safeAuthor} 在「${safeTitle}」发表了评论：\n\n${safeText}`
        }

        await sendToChannels(message)
        return
      }

      default: {
        logger.info(`未处理的事件类型: ${type}`)
      }
    }
  } catch (error) {
    logger.error('处理 MX Space 事件失败:', error)
  }
}

function checkNoteIsSecret(note: NoteModel): boolean {
  // 检查是否包含敏感关键词
  const sensitiveKeywords = ['密码', '私密', '秘密', '不公开']
  const text = note.text?.toLowerCase() || ''
  const title = note.title?.toLowerCase() || ''
  
  return sensitiveKeywords.some(keyword => 
    text.includes(keyword) || title.includes(keyword)
  )
}

function getSimplePreview(text: string): string {
  if (!text) return ''
  
  const cleaned = RemoveMarkdown(text)
  const preview = cleaned
    .split('\n\n')
    .slice(0, 3)
    .join('\n\n')
    .substring(0, 200)
  
  return preview + (preview.length >= 200 ? '...' : '')
}

/**
 * 仅允许 http(s) 公网 URL，避免 file://、内网地址等危险资源。
 */
function isSafeHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 清理聊天回显文本：去控制字符并截断，防止超长刷屏与通知伪造。
 */
function sanitizeChatText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, '')
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) + '...' : cleaned
}
