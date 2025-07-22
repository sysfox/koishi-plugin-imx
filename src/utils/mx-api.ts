import { allControllers, createClient } from '@mx-space/api-client'
import { axiosAdaptor } from '@mx-space/api-client/dist/adaptors/axios'
import { Context } from 'koishi'
import { mxSpaceUserAgent } from '../constants'

export interface Config {
  baseUrl?: string
  token?: string
  webhookSecret?: string
  watchGroupIds?: string[]
}

let apiClientInstance: any

export function getApiClient(ctx: Context, config: Config) {
  if (apiClientInstance) {
    return apiClientInstance
  }
  
  if (!config.baseUrl) {
    throw new Error('MX Space baseUrl is required')
  }
  
  const logger = ctx.logger('mx-space-api')

  axiosAdaptor.default.interceptors.request.use((req) => {
    req.headers = {
      ...req.headers,
      authorization: config.token,
      'user-agent': mxSpaceUserAgent,
      'x-request-id': Math.random().toString(36).slice(2),
    } as any

    return req
  })
  axiosAdaptor.default.interceptors.response.use(
    (res) => {
      return res
    },
    (err) => {
      const res = err.response
      const error = Promise.reject(err)
      if (!res) {
        return error
      }
      logger.error(
        `HTTP Response Failed ${`${res.config.baseURL || ''}${res.config.url}`}`,
      )
      return error
    },
  )
  const apiClient = createClient(axiosAdaptor)(config.baseUrl, {
    controllers: allControllers,
  })
  apiClientInstance = apiClient
  return apiClient
}

let aggregateDataCache: any
let cacheTime: number
export async function getMxSpaceAggregateData(ctx: Context, config: Config) {
  const now = Date.now()
  if (aggregateDataCache && cacheTime && now - cacheTime < 1000 * 60 * 5) {
    return aggregateDataCache
  }
  const apiClient = getApiClient(ctx, config)
  const data = await apiClient.aggregate.getAggregateData()
  aggregateDataCache = data
  cacheTime = now
  return data
}
