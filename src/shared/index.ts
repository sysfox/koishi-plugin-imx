import { Context } from 'koishi'
import * as repeater from './repeater'
import * as toolCommands from './commands/tool'

export const name = 'shared'

export function apply(ctx: Context) {
  // 注册复读机功能
  ctx.plugin(repeater)
  
  // 注册工具命令
  ctx.plugin(toolCommands)
}

export * from './repeater'
export * from './commands/tool'
