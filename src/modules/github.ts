import { Context, Schema, h } from 'koishi'
import axios from 'axios'
import { createHmac } from 'crypto'
import { truncateText } from '../utils/helper'
import { relativeTimeFromNow } from '../utils/time'
import { axiosRequestWithLog, simplifyAxiosError } from '../utils/axios-error'
import { sendMessage } from '../utils/broadcast'
import type { PushEvent } from '../types/github/push'
import type { IssueEvent } from '../types/github/issue'
import type { PullRequestPayload } from '../types/github/pull-request'

export const name = 'github'
export const inject = ['server']

export interface Config {
  enabled?: boolean
  repositories?: string[]
  watchChannels?: string[]
  webhook?: {
    secret?: string
    path?: string
    watchChannels?: string[]
    broadcastToAll?: boolean
    excludeChannels?: string[]
  }
}

export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().description('启用 GitHub 功能').default(false),
  repositories: Schema.array(Schema.string()).description('监控的仓库列表（格式：owner/repo）').default([]),
  watchChannels: Schema.array(Schema.string()).description('推送通知的频道ID列表').default([]),
  webhook: Schema.object({
    secret: Schema.string().description('Webhook Secret').role('secret'),
    path: Schema.string().description('Webhook 路径').default('/github/webhook'),
    watchChannels: Schema.array(Schema.string()).description('推送通知的频道ID列表').default([]),
    broadcastToAll: Schema.boolean().description('是否广播到所有联系人').default(false),
    excludeChannels: Schema.array(Schema.string()).description('排除的频道ID列表（当启用广播到所有联系人时）').default([]),
  }).description('Webhook 配置'),
})

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('github')
  
  if (!config.enabled) {
    logger.info('GitHub 模块未启用')
    return
  }

  // 注册命令
  ctx.command('github', 'GitHub 相关功能')
  
  ctx.command('github.status', '查看仓库状态')
    .action(async ({ session }) => {
      if (!config.repositories?.length) {
        return '未配置监控仓库'
      }

      const statusList = []
      for (const repo of config.repositories) {
        const repoInfo = await axiosRequestWithLog(
          logger,
          () => getRepoInfo(repo),
          `获取仓库 ${repo} 信息`
        )
        
        if (repoInfo) {
          statusList.push(`${repo}: ⭐ ${repoInfo.stargazers_count} | 🍴 ${repoInfo.forks_count}`)
        } else {
          statusList.push(`${repo}: ❌ 获取失败`)
        }
      }

      return statusList.join('\n')
    })

  // 设置 Webhook 支持
  setupWebhook(ctx, config, logger)

  logger.info('GitHub 模块已启动')
}

async function getRepoInfo(repo: string) {
  const response = await axios.get(`https://api.github.com/repos/${repo}`)
  return response.data
}

function setupWebhook(ctx: Context, config: Config, logger: any) {
  if (!config.webhook?.secret || !ctx.server) {
    logger.warn('GitHub Webhook 配置不完整或 server 插件未启用')
    return
  }

  const webhookPath = config.webhook.path || '/github/webhook'
  
  ctx.server.post(webhookPath, async (koaCtx: any) => {
    try {
      logger.debug('收到 GitHub webhook 请求:', {
        method: koaCtx.method,
        url: koaCtx.url,
        headers: koaCtx.headers
      })

      const body = koaCtx.request.body as any
      const headers = koaCtx.request.headers
      
      // GitHub webhook 签名验证
      const signature = headers['x-hub-signature-256'] as string
      const event = headers['x-github-event'] as string
      const delivery = headers['x-github-delivery'] as string
      
      // 检查请求体是否存在
      if (!body) {
        logger.warn('GitHub Webhook 请求体为空')
        koaCtx.status = 400
        koaCtx.body = { error: 'Request body is empty' }
        return
      }

      // 检查事件类型
      if (!event) {
        logger.warn('缺少 x-github-event 头')
        koaCtx.status = 400
        koaCtx.body = { error: 'Missing x-github-event header' }
        return
      }

      // 验证 GitHub webhook 签名
      if (config.webhook?.secret && signature) {
        const payload = JSON.stringify(body)
        const hmac = createHmac('sha256', config.webhook.secret)
        hmac.update(payload)
        const expectedSignature = 'sha256=' + hmac.digest('hex')
        
        if (signature !== expectedSignature) {
          logger.warn('GitHub Webhook 签名验证失败')
          koaCtx.status = 401
          koaCtx.body = { error: 'Invalid signature' }
          return
        }
        
        logger.debug('GitHub Webhook 签名验证成功')
      }

      // 处理 GitHub 事件
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
  logger.info(`收到 GitHub 事件: ${event}`)
  
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
        logger.debug(`未处理的 GitHub 事件类型: ${event}`)
        return
    }
    
    if (message) {
      // 发送消息到配置的频道
      const watchChannels = config.webhook?.watchChannels || []
      const broadcastToAll = config.webhook?.broadcastToAll || false
      const excludeChannels = config.webhook?.excludeChannels || []
      
      await sendMessage(
        ctx,
        message,
        {
          watchChannels,
          broadcastToAll,
          excludeChannels,
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
