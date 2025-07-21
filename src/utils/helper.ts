/**
 * 转义 Markdown 特殊字符
 */
export function escapeMarkdown(text: string): string {
  // Escape markdown special characters for MarkdownV2
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
}

/**
 * 生成随机颜色
 */
export function randomColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength) + '...'
}

/**
 * 清理 HTML 标签
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

/**
 * 获取用户标识符
 */
export function getUserIdentifier(userId: string, username?: string, firstName?: string): string {
  if (username) {
    return `@${username}`
  }
  if (firstName) {
    return `${firstName}(${userId})`
  }
  return userId
}
