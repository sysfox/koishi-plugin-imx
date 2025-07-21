import { Context, Schema } from 'koishi'
import * as mxSpace from './modules/mx-space'
import * as openai from './modules/openai'
import * as bilibili from './modules/bilibili'
import * as github from './modules/github'
import * as healthCheck from './modules/health-check'
import * as shared from './shared'

export const name = 'imx'

export interface Config {
  // MX Space 配置
  mxSpace?: {
    baseUrl?: string
    token?: string
  }
  
  // OpenAI 配置
  openai?: {
    apiKey: string
    model?: string
    temperature?: number
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
  
  // 健康检查配置
  healthCheck?: {
    enabled?: boolean
    interval?: number
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
  
  openai: Schema.object({
    apiKey: Schema.string().description('OpenAI API Key').role('secret').required(),
    model: Schema.string().default('gpt-3.5-turbo').description('模型名称'),
    temperature: Schema.number().min(0).max(2).default(0.6).description('温度参数'),
  }).description('OpenAI 配置'),
  
  bilibili: Schema.object({
    enabled: Schema.boolean().default(false).description('启用 Bilibili 功能'),
  }).description('Bilibili 配置'),
  
  github: Schema.object({
    enabled: Schema.boolean().default(false).description('启用 GitHub 功能'),
    webhookSecret: Schema.string().description('GitHub Webhook Secret').role('secret'),
  }).description('GitHub 配置'),
  
  healthCheck: Schema.object({
    enabled: Schema.boolean().default(true).description('启用健康检查'),
    interval: Schema.number().default(300000).description('检查间隔（毫秒）'),
  }).description('健康检查配置'),
  
  errorNotify: Schema.object({
    enabled: Schema.boolean().default(true).description('启用错误通知'),
  }).description('错误通知配置'),
})

export function apply(ctx: Context, config: Config) {
  // 注册各个模块
  if (config.mxSpace) {
    ctx.plugin(mxSpace, config.mxSpace)
  }
  
  if (config.openai?.apiKey) {
    ctx.plugin(openai, config.openai)
  }
  
  if (config.bilibili?.enabled) {
    ctx.plugin(bilibili, config.bilibili)
  }
  
  if (config.github?.enabled) {
    ctx.plugin(github, config.github)
  }
  
  if (config.healthCheck?.enabled) {
    ctx.plugin(healthCheck, config.healthCheck)
  }
  
  // 注册共享功能
  ctx.plugin(shared)
}
