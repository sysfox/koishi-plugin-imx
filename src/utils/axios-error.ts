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