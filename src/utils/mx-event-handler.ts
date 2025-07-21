import { Context } from 'koishi'
import { inspect } from 'util'
import dayjs from 'dayjs'
import RemoveMarkdown from 'remove-markdown'
import {
  BusinessEvents,
  type IActivityLike,
} from '@mx-space/webhook'
import { createHandler } from '@mx-space/webhook'
import { Config } from './mx-api'
import { getApiClient, getMxSpaceAggregateData } from './mx-api'
import { urlBuilder } from './mx-url-builder'
import {
  CollectionRefTypes,
  CommentModel,
  LinkModel,
  LinkState,
  NoteModel,
  PageModel,
  PostModel,
  RecentlyModel,
  SayModel,
} from '../types/mx-space/api'

export function setupWebhook(ctx: Context, config: Config) {
  const logger = ctx.logger('mx-space-webhook')
  
  if (!config.webhookSecret) {
    logger.warn('Webhook secret not configured, skipping webhook setup')
    return
  }
  
  // TODO: 实现 webhook 功能，需要使用正确的 Koishi 路由方式
  logger.warn('Webhook functionality temporarily disabled - needs proper Koishi routing implementation')
}

const handleEvent =
  (ctx: Context, config: Config) =>
  async (type: BusinessEvents, payload: any) => {
    const logger = ctx.logger('mx-space-event')
    logger.debug(type, inspect(payload))

    const aggregateData = await getMxSpaceAggregateData(ctx, config)
    const owner = aggregateData.user

    const sendToChannels = async (message: string, channels: string[]) => {
      for (const channelId of channels) {
        try {
          await ctx.broadcast([channelId], message)
        } catch (error) {
          logger.error(`发送消息到频道 ${channelId} 失败:`, error)
        }
      }
    }

    switch (type) {
      case BusinessEvents.POST_CREATE:
      case BusinessEvents.POST_UPDATE: {
        const isNew = type === BusinessEvents.POST_CREATE
        const publishDescription = isNew ? '发布了新文章' : '更新了文章'
        const { title, category, id, summary, created } = payload as PostModel

        if (type === BusinessEvents.POST_UPDATE) {
          const createdDate = dayjs(created)
          const now = dayjs()
          const diff = now.diff(createdDate, 'day')
          if (diff < 90) {
            return
          }
        }
        if (!category) {
          logger.error(`category not found, post id: ${id}`)
          return
        }

        const url = await urlBuilder.build(ctx, config, payload as PostModel)
        const message = `${owner.name} ${publishDescription}: ${title}\n\n${
          summary ? `${summary}\n\n` : ''
        }\n前往阅读：${url}`
        await sendToChannels(message, config.watchGroupIds || [])

        return
      }
      case BusinessEvents.NOTE_CREATE: {
        const publishDescription = '发布了新生活观察日记'
        const { title, text, mood, weather, images, hide, password } =
          payload as NoteModel
        const isSecret = checkNoteIsSecret(payload as NoteModel)

        if (hide || password || isSecret) {
          return
        }
        const simplePreview = getSimplePreview(text)

        const status = [mood ? `心情: ${mood}` : '']
          .concat(weather ? `天气: ${weather}` : '')
          .filter(Boolean)
          .join('\t')
        const message = `${owner.name} ${publishDescription}: ${title}\n${
          status ? `\n${status}\n\n` : '\n'
        }${simplePreview}\n\n前往阅读：${await urlBuilder.build(
          ctx,
          config,
          payload as NoteModel,
        )}`

        if (Array.isArray(images) && images.length > 0) {
          // TODO: send image
          await sendToChannels(message, config.watchGroupIds || [])
        } else {
          await sendToChannels(message, config.watchGroupIds || [])
        }

        return
      }

      case BusinessEvents.LINK_APPLY: {
        const { name, url, description, state } = payload as LinkModel
        if (state !== LinkState.Audit) {
          return
        }

        const message =
          `有新的友链申请了耶！\n` + `${name}\n${url}\n\n` + `${description}`

        await sendToChannels(message, config.watchGroupIds || [])
        return
      }
      case BusinessEvents.COMMENT_CREATE: {
        const apiClient = getApiClient(ctx, config)
        const { author, text, refType, parent, isWhispers } =
          payload as CommentModel
        const siteTitle = aggregateData.seo.title
        if (isWhispers) {
          await sendToChannels(
            `「${siteTitle}」嘘，有人说了一句悄悄话。是什么呢`,
            config.watchGroupIds || [],
          )
        }

        const parentIsWhispers = (() => {
          const walk: (parent: any) => boolean = (parent) => {
            if (!parent || typeof parent == 'string') {
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

        if (!refModel) {
          logger.error(`[comment]: ref model not found, refId: ${refId}`)
          return
        }
        const isMaster = author === owner.name || author === owner.username
        let message: string
        if (isMaster && !parent) {
          message = `${author} 在「${
            refModel.title
          }」发表之后的 ${dayjs(refModel.created).fromNow()}又说：${text}`
        } else {
          message = `${author} 在「${refModel.title}」发表了评论：${text}`
        }

        const url = await urlBuilder.build(ctx, config, refModel)

        if (!isWhispers) {
          await sendToChannels(
            `${RemoveMarkdown(message)}\n\n查看: ${url}`,
            config.watchGroupIds || [],
          )
        }
        return
      }
      case BusinessEvents.SAY_CREATE: {
        const { author, source, text } = payload as SayModel

        const message =
          `${owner.name} 发布一条说说：\n` +
          `${text}\n${source || author ? `来自: ${source || author}` : ''}`
        await sendToChannels(message, config.watchGroupIds || [])

        return
      }
      case BusinessEvents.RECENTLY_CREATE: {
        const { content } = payload as RecentlyModel

        const message = `${owner.name} 发布一条动态说：\n${content}`
        await sendToChannels(message, config.watchGroupIds || [])

        return
      }

      case BusinessEvents.ACTIVITY_LIKE: {
        const {
          ref: { id, title },
          reader,
        } = payload as IActivityLike
        const apiClient = getApiClient(ctx, config)
        const refModelUrl = await apiClient.proxy
          .helper('url-builder')(id)
          .get()
          .then((res: any) => res.data)

        await sendToChannels(
          (reader
            ? `${reader.name} 点赞了「${title}」\n`
            : `「${title}」有人点赞了哦！\n`) + `\n查看: ${refModelUrl}`,
          config.watchGroupIds || [],
        )

        return
      }
    }
  }

const getSimplePreview = (text: string) => {
  const rawText = RemoveMarkdown(text) as string
  return rawText.length > 200 ? `${rawText.slice(0, 200)}...` : rawText
}

function checkNoteIsSecret(note: NoteModel) {
  if (!note.publicAt) {
    return false
  }
  const isSecret = dayjs(note.publicAt).isAfter(new Date())

  return isSecret
}
