import axios, { AxiosError } from 'axios'
import { Logger } from 'koishi'

export interface SimplifiedError {
  message: string
  status?: number
  code?: string
}

/**
 * 简化 axios 错误信息
 * @param error axios 错误对象
 * @param context 错误上下文描述
 * @returns 简化的错误信息
 */
export function simplifyAxiosError(error: any, context = '请求'): SimplifiedError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError
    
    // 网络错误
    if (!axiosError.response) {
      return {
        message: `${context}失败: 网络连接错误`,
        code: axiosError.code || 'NETWORK_ERROR'
      }
    }
    
    // HTTP 错误状态码
    const status = axiosError.response.status
    const statusText = axiosError.response.statusText
    
    switch (status) {
      case 400:
        return { message: `${context}失败: 请求参数错误`, status }
      case 401:
        return { message: `${context}失败: 未授权访问`, status }
      case 403:
        return { message: `${context}失败: 访问被拒绝`, status }
      case 404:
        return { message: `${context}失败: 资源不存在`, status }
      case 429:
        return { message: `${context}失败: 请求过于频繁`, status }
      case 500:
        return { message: `${context}失败: 服务器内部错误`, status }
      case 502:
        return { message: `${context}失败: 网关错误`, status }
      case 503:
        return { message: `${context}失败: 服务不可用`, status }
      default:
        return { 
          message: `${context}失败: HTTP ${status} ${statusText}`, 
          status 
        }
    }
  }
  
  // 其他类型的错误
  return {
    message: `${context}失败: ${error?.message || '未知错误'}`,
    code: 'UNKNOWN_ERROR'
  }
}

/**
 * 记录简化的错误日志
 * @param logger 日志记录器
 * @param error 错误对象
 * @param context 错误上下文
 */
export function logSimplifiedError(logger: Logger, error: any, context = '操作') {
  const simplified = simplifyAxiosError(error, context)
  
  if (simplified.status && simplified.status >= 500) {
    // 服务器错误使用 error 级别
    logger.error(simplified.message)
  } else if (simplified.status && simplified.status >= 400) {
    // 客户端错误使用 warn 级别
    logger.warn(simplified.message)
  } else {
    // 网络错误等使用 error 级别
    logger.error(simplified.message)
  }
}

/**
 * 安全的 axios 请求包装器
 * @param requestFn axios 请求函数
 * @param context 请求上下文描述
 * @returns Promise<T | null>
 */
export async function safeAxiosRequest<T>(
  requestFn: () => Promise<T>,
  context = '请求'
): Promise<T | null> {
  try {
    return await requestFn()
  } catch (error) {
    // 静默处理错误，返回 null
    return null
  }
}

/**
 * 带日志的 axios 请求包装器
 * @param logger 日志记录器
 * @param requestFn axios 请求函数
 * @param context 请求上下文描述
 * @returns Promise<T | null>
 */
export async function axiosRequestWithLog<T>(
  logger: Logger,
  requestFn: () => Promise<T>,
  context = '请求'
): Promise<T | null> {
  try {
    return await requestFn()
  } catch (error) {
    logSimplifiedError(logger, error, context)
    return null
  }
}

/**
 * axios 请求默认超时（毫秒）。所有新建 axios 实例 / 请求都应设置 timeout，
 * 避免无超时请求永久挂起拖住事件循环。
 */
export const AXIOS_DEFAULT_TIMEOUT = 8000

/**
 * 内网云元数据地址，禁止作为出站请求目标（SSRF 防护）。
 */
const BLOCKED_HOSTS = new Set([
  '169.254.169.254', // AWS / 阿里云 / 腾讯云等元数据服务
  'metadata.google.internal',
])

/**
 * 校验出站 URL 是否安全：仅允许 http(s)，拒绝 file:// 等非 http 协议
 * 与云元数据地址。
 */
export function isSafeUrl(url: string): boolean {
  if (typeof url !== 'string' || !url.trim()) return false
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false
  }
  const host = parsed.hostname.toLowerCase()
  if (!host || BLOCKED_HOSTS.has(host)) {
    return false
  }
  return true
}

/**
 * 断言 URL 安全，不安全时抛出错误，阻止请求发出。
 */
export function assertSafeUrl(url: string, context = '请求'): void {
  if (!isSafeUrl(url)) {
    throw new Error(`${context}失败: 不安全的请求地址已拦截`)
  }
}

/**
 * 带 URL 白名单校验 + 默认超时 + 简化错误日志的 GET 包装器。
 */
export async function safeAxiosGet<T>(
  url: string,
  config: Record<string, any> = {},
  logger?: Logger,
  context = '请求'
): Promise<T | null> {
  assertSafeUrl(url, context)
  try {
    const { data } = await axios.get<T>(url, { timeout: AXIOS_DEFAULT_TIMEOUT, ...config })
    return data
  } catch (error) {
    if (logger) logSimplifiedError(logger, error, context)
    return null
  }
}

/**
 * 带 URL 白名单校验 + 默认超时 + 简化错误日志的 POST 包装器。
 */
export async function safeAxiosPost<T>(
  url: string,
  data?: any,
  config: Record<string, any> = {},
  logger?: Logger,
  context = '请求'
): Promise<T | null> {
  assertSafeUrl(url, context)
  try {
    const res = await axios.post<T>(url, data, { timeout: AXIOS_DEFAULT_TIMEOUT, ...config })
    return res.data
  } catch (error) {
    if (logger) logSimplifiedError(logger, error, context)
    return null
  }
}