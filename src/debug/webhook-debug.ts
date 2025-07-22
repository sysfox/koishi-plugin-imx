import { Context, Schema } from 'koishi'

export const name = 'webhook-debug'
export const inject = ['server']

export interface Config {
  path?: string
}

export const Config: Schema<Config> = Schema.object({
  path: Schema.string().description('调试 Webhook 路径').default('/debug/webhook'),
})

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('webhook-debug')

  if (!ctx.server) {
    logger.error('server 插件未启用')
    return
  }

  const webhookPath = config.path || '/debug/webhook'

  // 创建一个简单的调试 webhook 处理器
  ctx.server.post(webhookPath, async (koaCtx: any) => {
    logger.info('=== Webhook Debug Info ===')
    logger.info('Method:', koaCtx.method)
    logger.info('URL:', koaCtx.url)
    logger.info('Headers:', JSON.stringify(koaCtx.headers, null, 2))
    logger.info('Raw Body:', koaCtx.request.rawBody)
    logger.info('Parsed Body:', JSON.stringify(koaCtx.request.body, null, 2))
    logger.info('Body Type:', typeof koaCtx.request.body)
    logger.info('Content-Type:', koaCtx.headers['content-type'])
    logger.info('Content-Length:', koaCtx.headers['content-length'])
    logger.info('========================')

    // 检查各种可能的问题
    const diagnostics = {
      hasBody: !!koaCtx.request.body,
      bodyType: typeof koaCtx.request.body,
      isObject: typeof koaCtx.request.body === 'object',
      hasType: !!(koaCtx.request.body && koaCtx.request.body.type),
      hasData: !!(koaCtx.request.body && koaCtx.request.body.data),
      contentType: koaCtx.headers['content-type'],
      bodyKeys: koaCtx.request.body ? Object.keys(koaCtx.request.body) : [],
    }

    logger.info('Diagnostics:', JSON.stringify(diagnostics, null, 2))

    koaCtx.status = 200
    koaCtx.body = {
      message: 'Debug webhook received',
      diagnostics,
      receivedData: koaCtx.request.body
    }
  })

  // 也处理 GET 请求用于简单测试
  ctx.server.get(webhookPath, async (koaCtx: any) => {
    koaCtx.status = 200
    koaCtx.body = {
      message: 'Webhook debug endpoint is working',
      method: 'GET',
      timestamp: new Date().toISOString()
    }
  })

  logger.info(`调试 Webhook 已启动，路径: ${webhookPath}`)
  logger.info(`测试 GET: curl ${ctx.server.config.selfUrl || 'http://localhost:5140'}${webhookPath}`)
  logger.info(`测试 POST: curl -X POST -H "Content-Type: application/json" -d '{"test": "data"}' ${ctx.server.config.selfUrl || 'http://localhost:5140'}${webhookPath}`)
}
