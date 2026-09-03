import { Context, Schema } from 'koishi'
import { createHmac, timingSafeEqual } from 'crypto'
import { truncateText } from '../utils/helper'
import { sendMessage } from '../utils/broadcast'
import type { PushEvent } from '../types/github/push'
import type { IssueEvent } from '../types/github/issue'
import type { PullRequestPayload } from '../types/github/pull-request'

export const name = 'github'
export const inject = ['server']

export interface Config {
  enabled?: boolean
  webhook?: {
    secret?: string
    path?: string
    watchChannels?: string[]
    broadcastToAll?: boolean
    excludeChannels?: string[]
    excludePlatforms?: string[]
  }
}

export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().description('启用 GitHub 功能').default(false),
  webhook: Schema.object({
    secret: Schema.string().description('Webhook Secret').role('secret'),
    path: Schema.string().description('Webhook 路径').default('/github/webhook'),
    watchChannels: Schema.array(Schema.string()).description('推送通知的频道ID列表').default([]),
    broadcastToAll: Schema.boolean().description('是否广播到所有联系人').default(false),
    excludeChannels: Schema.array(Schema.string()).description('排除的频道ID列表（当启用广播到所有联系人时）').default([]),
    excludePlatforms: Schema.array(Schema.string()).description('排除的平台列表（如：telegram, discord, qq等）').default(['telegram']),
  }).description('Webhook 配置'),
})

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('github')
  
  if (!config.enabled) {
    return
  }

  setupWebhook(ctx, config, logger)
}

function setupWebhook(ctx: Context, config: Config, logger: any) {
  if (!config.webhook?.secret || !ctx.server) {
    return
  }

  const webhookPath = config.webhook.path || '/github/webhook'
  
  ctx.server.post(webhookPath, async (koaCtx: any) => {
    try {
      const body = koaCtx.request.body as any
      const headers = koaCtx.request.headers
      
      const signature = headers['x-hub-signature-256'] as string
      const event = headers['x-github-event'] as string
      const delivery = headers['x-github-delivery'] as string
      
      if (!body) {
        logger.warn('GitHub Webhook 请求体为空')
        koaCtx.status = 400
        koaCtx.body = { error: 'Request body is empty' }
        return
      }

      if (!event) {
        logger.warn('缺少 x-github-event 头')
        koaCtx.status = 400
        koaCtx.body = { error: 'Missing x-github-event header' }
        return
      }

      if (config.webhook?.secret) {
        if (!signature) {
          logger.warn('GitHub Webhook 缺少签名（已配置 secret，拒绝未签名请求）')
          koaCtx.status = 401
          koaCtx.body = { error: 'Missing signature' }
          return
        }
        // 优先使用原始请求体计算 HMAC；Koishi/koa 的 body 解析器可能重排 JSON，
        // 用 JSON.stringify 会导致合法签名验证失败。不可用时回退到序列化后的 body。
        const rawBody: string | undefined = (koaCtx.request as any).rawBody
        const payload = typeof rawBody === 'string' ? rawBody : JSON.stringify(body)
        const hmac = createHmac('sha256', config.webhook.secret)
        hmac.update(payload)
        const expectedSignature = 'sha256=' + hmac.digest('hex')

        if (!safeCompare(signature, expectedSignature)) {
          logger.warn('GitHub Webhook 签名验证失败')
          koaCtx.status = 401
          koaCtx.body = { error: 'Invalid signature' }
          return
        }
      }

      await handleGitHubEvent(ctx, config, logger, event, body)
      
      koaCtx.status = 200
      koaCtx.body = { message: 'OK' }
      
    } catch (error) {
      logger.error('处理 GitHub Webhook 时发生错误:', error)
      koaCtx.status = 500
      koaCtx.body = { error: 'Internal server error' }
    }
  })
  
  logger.info(`GitHub Webhook 已在 ${webhookPath} 上启用`)
}

async function handleGitHubEvent(ctx: Context, config: Config, logger: any, event: string, payload: any) {
  let message = ''
  
  try {
    switch (event) {
      case 'push':
        message = formatPushEvent(payload as PushEvent)
        break
      case 'issues':
        message = formatIssueEvent(payload as IssueEvent)
        break
      case 'pull_request':
        message = formatPullRequestEvent(payload as PullRequestPayload)
        break
      default:
        return
    }
    
    if (message) {
      const watchChannels = config.webhook?.watchChannels || []
      const broadcastToAll = config.webhook?.broadcastToAll || false
      const excludeChannels = config.webhook?.excludeChannels || []
      const excludePlatforms = config.webhook?.excludePlatforms || []
      
      await sendMessage(
        ctx,
        message,
        {
          watchChannels,
          broadcastToAll,
          excludeChannels,
          excludePlatforms,
        },
        logger
      )
    }
    
  } catch (error) {
    logger.error(`处理 GitHub 事件 ${event} 时发生错误:`, error)
  }
}

function formatPushEvent(payload: PushEvent): string {
  const repo = payload.repository.full_name
  const pusher = payload.pusher.name
  const branch = payload.ref.replace('refs/heads/', '')
  const commits = payload.commits.length
  
  let message = `🚀 **${repo}** 新推送\n`
  message += `👤 推送者: ${pusher}\n`
  message += `🌿 分支: ${branch}\n`
  message += `📝 提交数: ${commits}\n`
  
  if (payload.head_commit) {
    message += `💬 最新提交: ${truncateText(payload.head_commit.message, 100)}\n`
  }
  
  message += `🔗 查看: ${payload.repository.html_url}/commits/${branch}`
  
  return message
}

function formatIssueEvent(payload: IssueEvent): string {
  const action = payload.action
  const repo = payload.repository.full_name
  const issue = payload.issue
  const user = payload.sender.login
  
  let actionText = ''
  switch (action) {
    case 'opened':
      actionText = '创建了新'
      break
    case 'closed':
      actionText = '关闭了'
      break
    case 'reopened':
      actionText = '重新打开了'
      break
    default:
      actionText = `${action}了`
  }
  
  let message = `🐛 **${repo}** Issue 更新\n`
  message += `👤 ${user} ${actionText} Issue\n`
  message += `📋 标题: ${issue.title}\n`
  message += `🔢 编号: #${issue.number}\n`
  message += `📊 状态: ${issue.state}\n`
  message += `🔗 链接: ${issue.html_url}`
  
  return message
}

function formatPullRequestEvent(payload: PullRequestPayload): string {
  const action = payload.action
  const repo = payload.repository.full_name
  const pr = payload.pull_request
  const user = payload.sender.login
  
  let actionText = ''
  switch (action) {
    case 'opened':
      actionText = '创建了新的'
      break
    case 'closed':
      actionText = pr.merged ? '合并了' : '关闭了'
      break
    case 'reopened':
      actionText = '重新打开了'
      break
    default:
      actionText = `${action}了`
  }
  
  let message = `🔄 **${repo}** Pull Request 更新\n`
  message += `👤 ${user} ${actionText} PR\n`
  message += `📋 标题: ${pr.title}\n`
  message += `🔢 编号: #${pr.number}\n`
  message += `🌿 ${pr.head.ref} → ${pr.base.ref}\n`
  message += `📊 状态: ${pr.state}\n`
  message += `🔗 链接: ${pr.html_url}`

  return message
}

/**
 * 常量时间签名比较，防止时序攻击。
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
