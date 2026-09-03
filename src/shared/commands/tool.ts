import { Context, Schema, h } from 'koishi'
import { createHash, randomBytes } from 'crypto'
import axios from 'axios'
import { isIPv4, isIPv6 } from 'net'
import dayjs from 'dayjs'
import { fetchHitokoto } from '../../utils/hitokoto'
import { randomColor } from '../../utils/helper'

export const name = 'tool-commands'

export interface Config {
  enabled?: boolean
}

export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().description('启用工具命令').default(true),
})

interface IpInfo {
  ip: string
  countryName: string
  regionName: string
  cityName: string
  ownerDomain: string
  ispDomain: string
  range?: {
    from: string
    to: string
  }
}

async function getIpInfo(ip: string): Promise<IpInfo | 'error'> {
  const isV4 = isIPv4(ip)
  const isV6 = isIPv6(ip)
  if (!isV4 && !isV6) {
    return 'error' as const
  }

  try {
    if (isV4) {
      const { data } = await axios.get(`https://api.i-meto.com/ip/v1/qqwry/${ip}`, { timeout: 5000 })
      return {
        ip: data.ip,
        countryName: data.country_name,
        regionName: data.region_name,
        cityName: data.city_name,
        ownerDomain: data.owner_domain,
        ispDomain: data.isp_domain,
        range: data.range
      } as IpInfo
    } else {
      const { data } = await axios.get(`https://ip-api.com/json/${ip}`, { timeout: 5000 })
      return {
        cityName: data.city,
        countryName: data.country,
        ip: data.query,
        ispDomain: data.as,
        ownerDomain: data.org,
        regionName: data.regionName,
      }
    }
  } catch (error) {
    return 'error'
  }
}

export function apply(ctx: Context, config: Config = {}) {
  if (!config.enabled) return

  const logger = ctx.logger('tool-commands')

  // 工具命令组
  ctx.command('tools', '实用工具命令')
    .alias('tool')

  // MD5 哈希
  ctx.command('tools.md5 <text:text>', '计算文本的 MD5 哈希值')
    .example('tools.md5 hello world')
    .action(({ session }, text) => {
      if (!text) return '请提供要计算哈希的文本'
      if (text.length > 4096) return '输入文本过长（最多 4096 字符）'

      const hash = createHash('md5').update(text).digest('hex')
      return `MD5: ${hash}`
    })

  // SHA256 哈希
  ctx.command('tools.sha256 <text:text>', '计算文本的 SHA256 哈希值')
    .example('tools.sha256 hello world')
    .action(({ session }, text) => {
      if (!text) return '请提供要计算哈希的文本'
      if (text.length > 4096) return '输入文本过长（最多 4096 字符）'

      const hash = createHash('sha256').update(text).digest('hex')
      return `SHA256: ${hash}`
    })

  // IP 查询
  ctx.command('tools.ip <ip:text>', '查询 IP 地址信息')
    .example('tools.ip 8.8.8.8')
    .action(async ({ session }, ip) => {
      if (!ip) return '请提供要查询的 IP 地址'

      try {
        const info = await getIpInfo(ip)
        
        if (info === 'error') {
          return '无效的 IP 地址或查询失败'
        }

        return [
          `🌐 IP 地址信息`,
          `IP: ${info.ip}`,
          `位置: ${info.countryName} ${info.regionName} ${info.cityName}`,
          `运营商: ${info.ispDomain}`,
          `组织: ${info.ownerDomain}`,
          info.range ? `IP 段: ${info.range.from} - ${info.range.to}` : '',
        ].filter(Boolean).join('\n')
      } catch (error) {
        logger.error('IP 查询失败:', error)
        return 'IP 查询失败'
      }
    })

  // 时间戳转换
  ctx.command('tools.timestamp [timestamp:number]', '转换时间戳或获取当前时间戳')
    .example('tools.timestamp')
    .example('tools.timestamp 1640995200')
    .action(({ session }, timestamp) => {
      if (timestamp) {
        // 转换时间戳为可读时间
        const time = dayjs(timestamp * 1000)
        return [
          `⏰ 时间戳转换`,
          `时间戳: ${timestamp}`,
          `本地时间: ${time.format('YYYY-MM-DD HH:mm:ss')}`,
          `相对时间: ${time.fromNow()}`,
          `ISO 时间: ${time.toISOString()}`,
        ].join('\n')
      } else {
        // 获取当前时间戳
        const now = dayjs()
        return [
          `⏰ 当前时间`,
          `时间戳: ${now.unix()}`,
          `本地时间: ${now.format('YYYY-MM-DD HH:mm:ss')}`,
          `ISO 时间: ${now.toISOString()}`,
        ].join('\n')
      }
    })

  // Base64 编码
  ctx.command('tools.base64 <action> <text:text>', 'Base64 编码/解码')
    .example('tools.base64 encode hello world')
    .example('tools.base64 decode aGVsbG8gd29ybGQ=')
    .action(({ session }, action, text) => {
      if (!action || !text) {
        return '用法: tools.base64 <encode|decode> <文本>'
      }
      if (text.length > 4096) return '输入文本过长（最多 4096 字符）'

      try {
        if (action === 'encode') {
          const encoded = Buffer.from(text, 'utf8').toString('base64')
          return `Base64 编码: ${encoded.slice(0, 8192)}`
        } else if (action === 'decode') {
          if (!/^[A-Za-z0-9+/=\s]+$/.test(text)) return '输入不是有效的 Base64 字符串'
          const decoded = Buffer.from(text.replace(/\s/g, ''), 'base64').toString('utf8')
          return `Base64 解码: ${decoded.slice(0, 4096)}`
        } else {
          return '操作类型必须是 encode 或 decode'
        }
      } catch (error) {
        return 'Base64 操作失败，请检查输入'
      }
    })

  // 随机数生成
  ctx.command('tools.random [min:number] [max:number]', '生成随机数')
    .example('tools.random')
    .example('tools.random 1 100')
    .action(({ session }, min = 1, max = 100) => {
      if (min > max) {
        [min, max] = [max, min]
      }
      
      const random = Math.floor(Math.random() * (max - min + 1)) + min
      return `🎲 随机数 (${min}-${max}): ${random}`
    })

  // UUID 生成
  ctx.command('tools.uuid', '生成 UUID')
    .action(() => {
      const uuid = randomBytes(16)
      uuid[6] = (uuid[6] & 0x0f) | 0x40
      uuid[8] = (uuid[8] & 0x3f) | 0x80
      
      const hex = uuid.toString('hex')
      const formatted = [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32)
      ].join('-')
      
      return `🆔 UUID: ${formatted}`
    })

  // 颜色生成
  ctx.command('tools.color', '生成随机颜色')
    .action(() => {
      const color = randomColor()
      const rgb = [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16)
      ]
      
      return [
        `🎨 随机颜色`,
        `HEX: ${color}`,
        `RGB: rgb(${rgb.join(', ')})`,
        `HSL: ${rgbToHsl(rgb[0], rgb[1], rgb[2])}`,
      ].join('\n')
    })

  // 一言
  ctx.command('tools.hitokoto', '获取一言')
    .alias('一言')
    .action(async ({ session }) => {
      try {
        const { hitokoto, from } = await fetchHitokoto()
        return `💭 ${hitokoto}\n\n—— ${from}`
      } catch (error) {
        logger.error('获取一言失败:', error)
        return '获取一言失败'
      }
    })

  // 短链接生成
  ctx.command('tools.shorturl <url:text>', '生成短链接')
    .example('tools.shorturl https://example.com')
    .action(async ({ session }, url) => {
      if (!url) return '请提供要缩短的 URL'

      try {
        // 验证 URL 格式
        new URL(url)
        
        // 使用简单的短链接服务（这里可以替换为其他服务）
        const { data } = await axios.post('https://api.short.io/links', {
          originalURL: url,
          domain: 'short.io'
        }, {
          headers: {
            'authorization': 'your-api-key', // 需要配置 API key
            'content-type': 'application/json'
          },
          timeout: 5000
        })
        
        return `🔗 短链接: ${data.shortURL}`
      } catch (error) {
        // 如果短链接服务失败，返回原链接
        return `❌ 生成短链接失败，原链接: ${url}`
      }
    })

  // 二维码生成
  ctx.command('tools.qrcode <text:text>', '生成二维码')
    .example('tools.qrcode hello world')
    .action(async ({ session }, text) => {
      if (!text) return '请提供要生成二维码的内容'

      try {
        // 使用在线二维码生成服务
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`
        
        return [
          h.text('📱 二维码已生成:'),
          h.image(qrUrl)
        ]
      } catch (error) {
        logger.error('生成二维码失败:', error)
        return '生成二维码失败'
      }
    })
}

// RGB 转 HSL 的辅助函数
function rgbToHsl(r: number, g: number, b: number): string {
  r /= 255
  g /= 255
  b /= 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h: number, s: number, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
      default: h = 0
    }
    h /= 6
  }

  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}
