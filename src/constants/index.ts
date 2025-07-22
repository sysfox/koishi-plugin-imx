/**
 * 常见的机器人账号列表
 * 用于过滤自动化提交、PR等
 */
export const botList = [
  'dependabot[bot]',
  'github-actions[bot]',
  'renovate[bot]',
  'allcontributors[bot]',
  'codecov[bot]',
  'dependabot-preview[bot]',
  'snyk-bot',
  'greenkeeper[bot]',
  'sonarcloud[bot]',
  'deepsource-autofix[bot]',
  'gitpod-io[bot]',
  'mergify[bot]',
  'semantic-release-bot',
  'stale[bot]',
  'wakatime[bot]',
  'vercel[bot]',
  'netlify[bot]',
  'actions-user',
  'github-pages[bot]',
  'whitesource-bolt[bot]',
  'circleci[bot]',
  'travis[bot]',
  'appveyor[bot]',
  'azure-pipelines[bot]',
]

/**
 * 检查是否为机器人账号
 */
export function isBot(username: string): boolean {
  return username.endsWith('[bot]') || botList.includes(username)
}

/**
 * 用户代理字符串
 */
export const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

/**
 * MX Space API 专用用户代理（常见浏览器 UA）
 */
export const mxSpaceUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

/**
 * 开发环境检测
 */
export const isDev = process.env.NODE_ENV === 'development'
