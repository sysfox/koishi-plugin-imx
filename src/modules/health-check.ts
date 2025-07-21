import { Context, Schema } from 'koishi'

export const name = 'health-check'

export interface Config {
  enabled?: boolean
  interval?: number
}

export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().default(true).description('启用健康检查'),
  interval: Schema.number().default(300000).description('检查间隔（毫秒）'),
})

class HealthCheckService {
  private checkFnList: Array<() => string | Promise<string>> = [() => 'UP!']
  
  registerHealthCheck(checkFn: () => string | Promise<string>) {
    this.checkFnList.push(checkFn)
    
    return () => {
      const idx = this.checkFnList.findIndex((fn) => fn === checkFn)
      return idx > -1 && this.checkFnList.splice(idx, 1)
    }
  }
  
  async call(): Promise<string[]> {
    return Promise.all(this.checkFnList.map((fn) => fn()))
  }
}

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger('health-check')
  
  if (!config.enabled) {
    return
  }

  const healthCheck = new HealthCheckService()
  
  // 注册到上下文中供其他插件使用
  ctx.provide('healthCheck', healthCheck)

  ctx.command('health', '健康检查')
    .action(async ({ session }) => {
      try {
        const results = await healthCheck.call()
        return session?.send(`健康检查结果:\n${results.join('\n')}`)
      } catch (error) {
        logger.error('Health check failed:', error)
        return session?.send('健康检查失败')
      }
    })

  // 注册基本的健康检查
  healthCheck.registerHealthCheck(() => {
    return `服务状态: 运行中`
  })

  healthCheck.registerHealthCheck(() => {
    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    return `运行时间: ${hours}小时${minutes}分钟`
  })

  healthCheck.registerHealthCheck(() => {
    const memUsage = process.memoryUsage()
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
    return `内存使用: ${usedMB}MB / ${totalMB}MB`
  })

  logger.info('Health check module loaded')
}
