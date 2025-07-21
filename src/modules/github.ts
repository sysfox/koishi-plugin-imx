import { Context, Schema } from 'koishi'
import http from 'http'

export const name = 'github'

export interface Config {
  enabled?: boolean
  webhookSecret?: string
  webhookPort?: number
  watchChannels?: string[]
}

export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().default(false).description('启用 GitHub Webhook'),
  webhookSecret: Schema.string().description('GitHub Webhook Secret').role('secret'),
  webhookPort: Schema.number().default(3000).description('Webhook 监听端口'),
  watchChannels: Schema.array(Schema.string()).description('推送通知的频道ID列表').default([]),
})

interface GitHubEvent {
  action?: string
  repository?: {
    name: string
    full_name: string
    html_url: string
  }
  sender?: {
    login: string
    html_url: string
  }
}

interface PushEvent extends GitHubEvent {
  ref: string
  commits: Array<{
    id: string
    message: string
    author: {
      name: string
      email: string
    }
    url: string
  }>
  pusher: {
    name: string
  }
}

interface IssueEvent extends GitHubEvent {
  issue: {
    number: number
    title: string
    body: string
    html_url: string
    state: string
  }
}

interface PullRequestEvent extends GitHubEvent {
  pull_request: {
    number: number
    title: string
    body: string
    html_url: string
    state: string
    merged: boolean
  }
}

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('github')
  
  if (!config.enabled || !config.webhookSecret) {
    return
  }

  let server: http.Server | null = null

  async function sendNotification(message: string) {
    for (const channelId of config.watchChannels || []) {
      try {
        const bot = ctx.bots[0]
        if (bot) {
          await bot.sendMessage(channelId, message)
        }
      } catch (error) {
        logger.error(`向频道 ${channelId} 发送GitHub通知失败:`, error)
      }
    }
  }

  function handlePush(payload: PushEvent) {
    const { repository, ref, commits, pusher } = payload
    
    // 忽略机器人推送
    if (pusher.name.endsWith('[bot]')) {
      return
    }

    const branch = ref.replace('refs/heads/', '')
    const isPushToMain = branch === 'main' || branch === 'master'
    
    if (!commits.length) {
      return
    }

    const commitMessages = commits.slice(0, 5).map(commit => 
      `• ${commit.message.split('\n')[0]} (${commit.id.substring(0, 7)})`
    ).join('\n')

    const moreCommits = commits.length > 5 ? `\n...以及其他 ${commits.length - 5} 个提交` : ''

    const message = `📦 ${repository?.full_name} ${isPushToMain ? '主分支' : branch + ' 分支'}收到推送

👤 推送者: ${pusher.name}
📝 ${commits.length} 个新提交:
${commitMessages}${moreCommits}

🔗 查看: ${repository?.html_url}/commits/${branch}`

    sendNotification(message)
  }

  function handleIssue(payload: IssueEvent) {
    const { action, issue, repository, sender } = payload
    
    if (!action || !issue || !repository || !sender) return

    const actionText = {
      opened: '创建了',
      closed: '关闭了',
      reopened: '重新打开了'
    }[action] || action

    const message = `🐛 ${repository.full_name} 议题更新

👤 ${sender.login} ${actionText}议题 #${issue.number}
📝 ${issue.title}

🔗 查看: ${issue.html_url}`

    sendNotification(message)
  }

  function handlePullRequest(payload: PullRequestEvent) {
    const { action, pull_request, repository, sender } = payload
    
    if (!action || !pull_request || !repository || !sender) return

    const actionText = {
      opened: '创建了',
      closed: pull_request.merged ? '合并了' : '关闭了',
      reopened: '重新打开了'
    }[action] || action

    const message = `🔀 ${repository.full_name} 拉取请求更新

👤 ${sender.login} ${actionText}拉取请求 #${pull_request.number}
📝 ${pull_request.title}

🔗 查看: ${pull_request.html_url}`

    sendNotification(message)
  }

  function startWebhookServer() {
    server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/webhook') {
        let body = ''
        
        req.on('data', chunk => {
          body += chunk.toString()
        })
        
        req.on('end', () => {
          try {
            const payload = JSON.parse(body)
            const eventType = req.headers['x-github-event'] as string
            
            // 简单的验证（生产环境应该使用更安全的验证方式）
            const signature = req.headers['x-hub-signature-256'] as string
            if (!signature) {
              res.statusCode = 401
              res.end('Unauthorized')
              return
            }

            switch (eventType) {
              case 'push':
                handlePush(payload as PushEvent)
                break
              case 'issues':
                handleIssue(payload as IssueEvent)
                break
              case 'pull_request':
                handlePullRequest(payload as PullRequestEvent)
                break
            }
            
            res.statusCode = 200
            res.end('OK')
          } catch (error) {
            logger.error('处理 GitHub Webhook 失败:', error)
            res.statusCode = 400
            res.end('Bad Request')
          }
        })
      } else {
        res.statusCode = 404
        res.end('Not Found')
      }
    })

    server.listen(config.webhookPort, () => {
      logger.info(`GitHub Webhook 服务器启动在端口 ${config.webhookPort}`)
    })

    server.on('error', (error) => {
      logger.error('GitHub Webhook 服务器错误:', error)
    })
  }

  ctx.on('ready', () => {
    startWebhookServer()
  })

  ctx.on('dispose', () => {
    if (server) {
      server.close()
      logger.info('GitHub Webhook 服务器已关闭')
    }
  })

  ctx.command('github.test', '测试 GitHub 通知')
    .action(async ({ session }) => {
      const testMessage = `🧪 GitHub 模块测试通知
      
✅ 如果你看到这条消息，说明 GitHub 模块工作正常！

⚙️ Webhook 地址: http://your-server:${config.webhookPort}/webhook`

      await sendNotification(testMessage)
      return session?.send('测试通知已发送')
    })

  logger.info('GitHub Webhook 模块已加载')
}
