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
  POST_CREATE = 'post_create',
  POST_UPDATE = 'post_update',
  NOTE_CREATE = 'note_create',
  COMMENT_CREATE = 'comment_create',
  LINK_APPLY = 'link_apply',
  SAY_CREATE = 'say_create',
  RECENTLY_CREATE = 'recently_create',
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

    if (!broadcastToAll && !watchChannels.length) {
      logger.warn('没有配置监听频道且未启用广播到所有联系人，跳过事件处理')
      return
    }

    const sendToChannels = async (message: string | h[]) => {
      await sendMessage(ctx, message, {
        watchChannels,
        broadcastToAll,
        excludeChannels,
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
        const { title, text, mood, weather, images, hide, password } = payload as NoteModel
        
        // 检查是否为隐私内容
        const isSecret = checkNoteIsSecret(payload as NoteModel)
        if (hide || password || isSecret) {
          return
        }

        const simplePreview = getSimplePreview(text)
        const status = [mood ? `心情: ${mood}` : '', weather ? `天气: ${weather}` : '']
          .filter(Boolean)
          .join('\t')

        const url = await urlBuilder.build(ctx, config, payload as NoteModel)
        let message = `📔 ${owner.name} ${publishDescription}: ${title}\n${
          status ? `\n${status}\n\n` : '\n'
        }${simplePreview}\n\n🔗 前往阅读：${url}`

        // 如果有图片，发送图片消息
        if (Array.isArray(images) && images.length > 0) {
          const imageMessages = images.map(img => h.image(img.src))
          await sendToChannels([h.text(message), ...imageMessages])
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
          `📝 名称: ${name}\n` +
          `🌐 链接: ${url}\n` +
          `📄 描述: ${description}`

        if (avatar) {
          await sendToChannels([h.image(avatar), h.text(message)])
        } else {
          await sendToChannels(message)
        }
        return
      }

      case BusinessEvents.COMMENT_CREATE: {
        const { author, text, refType, parent, id, isWhispers } = payload as CommentModel
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

        if (isMaster && !parent) {
          const timeAgo = dayjs(refModel.created).fromNow()
          message = `💬 ${author} 在「${refModel.title}」发表之后的 ${timeAgo}又说：\n\n${text}`
        } else {
          message = `💬 ${author} 在「${refModel.title}」发表了评论：\n\n${text}`
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
