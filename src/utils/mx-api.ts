import { allControllers, createClient } from '@mx-space/api-client'
import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'
import { Context } from 'koishi'
import { mxSpaceUserAgent } from '../constants'
import { assertSafeUrl, AXIOS_DEFAULT_TIMEOUT, logSimplifiedError } from './axios-error'

export interface Config {
  baseUrl?: string
  token?: string
  webhookSecret?: string
  watchGroupIds?: string[]
}

// 按 baseUrl + token 做 keyed 单例：token 变更时能拿到携带新 token 的 client，
// 且不同配置之间不会互相污染。
const apiClientCache = new Map<string, any>()

/**
 * 规范化 Authorization 头：无 Bearer 前缀则补上，已有则不重复添加。
 */
export function normalizeAuthorization(token?: string): string | undefined {
  if (!token) return undefined
  const trimmed = token.trim()
  if (!trimmed) return undefined
  if (/^bearer\s+/i.test(trimmed)) {
    return trimmed.replace(/^bearer\s+/i, 'Bearer ')
  }
  return `Bearer ${trimmed}`
}

/**
 * 为指定的 axios 实例构造与 axiosAdaptor 同形的 adaptor，
 * 使拦截器只挂在该实例上，不污染全局默认实例。
 */
function buildInstanceAdaptor(instance: AxiosInstance) {
  return {
    get default() {
      return instance
    },
    responseWrapper: {},
    get(url: string, options?: any) {
      return instance.get(url, options)
    },
    post(url: string, options?: any) {
      const { data, ...config } = options || {}
      return instance.post(url, data, config)
    },
    put(url: string, options?: any) {
      const { data, ...config } = options || {}
      return instance.put(url, data, config)
    },
    delete(url: string, options?: any) {
      const { ...config } = options || {}
      return instance.delete(url, config)
    },
    patch(url: string, options?: any) {
      const { data, ...config } = options || {}
      return instance.patch(url, data, config)
    },
  }
}

export function getApiClient(ctx: Context, config: Config) {
  if (!config.baseUrl) {
    throw new Error('MX Space baseUrl is required')
  }

  assertSafeUrl(config.baseUrl, 'MX Space baseUrl')

  const authorization = normalizeAuthorization(config.token)
  const cacheKey = `${config.baseUrl}::${authorization ?? ''}`
  const cached = apiClientCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const logger = ctx.logger('mx-space-api')

  const instance = axios.create({ timeout: AXIOS_DEFAULT_TIMEOUT })
  instance.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    req.headers = {
      ...req.headers,
      ...(authorization ? { 'Authorization': authorization } : {}),
      'user-agent': mxSpaceUserAgent,
      'x-request-id': Math.random().toString(36).slice(2),
    } as any

    return req
  })
  instance.interceptors.response.use(
    (res: AxiosResponse) => {
      return res
    },
    (err: AxiosError) => {
      const res = err.response
      if (!res) {
        // 网络错误等，记录简化日志
        logSimplifiedError(logger, err, 'MX Space API 请求')
      } else {
        // HTTP 错误，记录简化日志
        logSimplifiedError(logger, err, `MX Space API 请求 ${res.config.url}`)
      }
      return Promise.reject(err)
    },
  )
  const apiClient = createClient(buildInstanceAdaptor(instance))(config.baseUrl, {
    controllers: allControllers,
  })
  apiClientCache.set(cacheKey, apiClient)
  return apiClient
}

let aggregateDataCache: any
let aggregateDataCacheKey: string | undefined
let cacheTime: number
export async function getMxSpaceAggregateData(ctx: Context, config: Config) {
  const now = Date.now()
  const authorization = normalizeAuthorization(config.token)
  const cacheKey = `${config.baseUrl}::${authorization ?? ''}`
  if (aggregateDataCache && aggregateDataCacheKey === cacheKey && cacheTime && now - cacheTime < 1000 * 60 * 5) {
    return aggregateDataCache
  }
  const apiClient = getApiClient(ctx, config)
  const data = await apiClient.aggregate.getAggregateData()
  aggregateDataCache = data
  aggregateDataCacheKey = cacheKey
  cacheTime = now
  return data
}
