import { Context } from 'koishi'
import { createHash } from 'crypto'
import axios from 'axios'
import { isIPv4, isIPv6 } from 'net'

export const name = 'tool-commands'

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
      const { data } = await axios.get(`https://api.i-meto.com/ip/v1/qqwry/${ip}`)
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
      const { data } = await axios.get(`http://ip-api.com/json/${ip}`)
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

export function apply(ctx: Context) {
  ctx.command('tool', '工具命令')

  ctx.command('tool.ip <ip:string>', '查询 IP 信息')
    .action(async ({ session }, ip) => {
      if (!ip) {
        return session?.send('请提供要查询的 IP 地址')
      }

      const ipInfo = await getIpInfo(ip)

      if (ipInfo === 'error') {
        return session?.send(`${ip} 不是一个有效的 IP 地址`)
      }

      const locationInfo = [ipInfo.countryName, ipInfo.regionName, ipInfo.cityName]
        .filter(Boolean)
        .join(' - ') || 'N/A'

      const rangeInfo = ipInfo.range 
        ? `\n范围: ${Object.values(ipInfo.range).join(' - ')}`
        : ''

      return session?.send(`IP: ${ipInfo.ip}
城市: ${locationInfo}
ISP: ${ipInfo.ispDomain || 'N/A'}
组织: ${ipInfo.ownerDomain || 'N/A'}${rangeInfo}`)
    })

  ctx.command('tool.base64 <text:string>', 'Base64 编码/解码')
    .option('decode', '-d 解码模式')
    .action(async ({ session, options }, text) => {
      if (!text) {
        return session?.send('请提供要编码/解码的文本')
      }

      if (text.length > 10e6) {
        return session?.send('文本长度不能超过 10MB')
      }

      try {
        let result: string
        if (options?.decode) {
          result = Buffer.from(text, 'base64').toString()
        } else {
          result = Buffer.from(text).toString('base64')
        }

        return session?.send(`Base64 ${options?.decode ? '解码' : '编码'}结果: ${result}`)
      } catch (error) {
        return session?.send('编码/解码失败，请检查输入')
      }
    })

  ctx.command('tool.md5 <text:string>', '计算 MD5 哈希值')
    .action(async ({ session }, text) => {
      if (!text) {
        return session?.send('请提供要计算 MD5 的文本')
      }

      if (text.length > 10e6) {
        return session?.send('文本长度不能超过 10MB')
      }

      const md5Hash = createHash('md5').update(text).digest('hex')
      return session?.send(`${text}\n\nMD5 结果: ${md5Hash}`)
    })
}
