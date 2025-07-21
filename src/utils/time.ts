import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export function relativeTimeFromNow(time: string | Date) {
  return dayjs(time).fromNow()
}

export function formatTime(time: string | Date, format = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(time).format(format)
}

export function isToday(time: string | Date) {
  return dayjs(time).isSame(dayjs(), 'day')
}

export function isYesterday(time: string | Date) {
  return dayjs(time).isSame(dayjs().subtract(1, 'day'), 'day')
}
