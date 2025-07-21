import { Context, Schema, h } from 'koishi'
import axios from 'axios'
import { truncateText } from '../utils/helper'
import { relativeTimeFromNow } from '../utils/time'

export const name = 'github'

export interface Config {
  enabled?: boolean
  repositories?: string[]
  watchChannels?: string[]
  webhook?: {
    secret?: string
    path?: string
  }
}

export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().description('启用 GitHub 功能').default(false),
  repositories: Schema.array(Schema.string()).description('监控的仓库列表（格式：owner/repo）').default([]),
  watchChannels: Schema.array(Schema.string()).description('推送通知的频道ID列表').default([]),
  webhook: Schema.object({
    secret: Schema.string().description('Webhook Secret').role('secret'),
    path: Schema.string().description('Webhook 路径').default('/github/webhook'),
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
        try {
          const repoInfo = await getRepoInfo(repo)
          statusList.push(`${repo}: ⭐ ${repoInfo.stargazers_count} | 🍴 ${repoInfo.forks_count}`)
        } catch (error) {
          statusList.push(`${repo}: ❌ 获取失败`)
        }
      }

      return statusList.join('\n')
    })

  logger.info('GitHub 模块已启动')
}

async function getRepoInfo(repo: string) {
  const response = await axios.get(`https://api.github.com/repos/${repo}`)
  return response.data
}
