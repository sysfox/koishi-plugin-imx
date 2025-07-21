export interface ActivityPresenceType {
  type: 'POST' | 'NOTE' | 'RECENTLY' | 'SAY'
  id: string
  title: string
  content?: string
  created: string
  updated?: string
}

export interface Activity {
  timestamp: string
  data: ActivityPresenceType
}
