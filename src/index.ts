import { Context, Schema } from 'koishi'
import * as mxSpace from './modules/mx-space'
import * as bilibili from './modules/bilibili'
import * as github from './modules/github'
import * as shared from './shared'

export const name = 'imx'

export interface Config {
  // MX Space 配置
  mxSpace?: {
    baseUrl?: string
    token?: string
  }
  
  // Bilibili 配置
  bilibili?: {
    enabled?: boolean
  }
  
  // GitHub 配置
  github?: {
    enabled?: boolean
    webhookSecret?: string
  }
  
  // 错误通知配置
  errorNotify?: {
    enabled?: boolean
  }
}

export const Config: Schema<Config> = Schema.object({
  mxSpace: Schema.object({
    baseUrl: Schema.string().description('MX Space API 地址'),
    token: Schema.string().description('MX Space API Token').role('secret'),
  }).description('MX Space 配置'),
  
  bilibili: Schema.object({
    enabled: Schema.boolean().default(false).description('启用 Bilibili 功能'),
  }).description('Bilibili 配置'),
  
  github: Schema.object({
    enabled: Schema.boolean().default(false).description('启用 GitHub 功能'),
    webhookSecret: Schema.string().description('GitHub Webhook Secret').role('secret'),
  }).description('GitHub 配置'),
  
  errorNotify: Schema.object({
    enabled: Schema.boolean().default(true).description('启用错误通知'),
  }).description('错误通知配置'),
})

export function apply(ctx: Context, config: Config) {
  // 注册各个模块
  if (config.mxSpace) {
    ctx.plugin(mxSpace, config.mxSpace)
  }
  
  if (config.bilibili?.enabled) {
    ctx.plugin(bilibili, config.bilibili)
  }
  
  if (config.github?.enabled) {
    ctx.plugin(github, config.github)
  }
  
  // 注册共享功能
  ctx.plugin(shared)
}
