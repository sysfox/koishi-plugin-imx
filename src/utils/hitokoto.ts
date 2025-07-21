import axios from 'axios'

export interface HitokotoResponse {
  id: number
  uuid: string
  hitokoto: string
  type: string
  from: string
  from_who?: string
  creator: string
  creator_uid: number
  reviewer: number
  commit_from: string
  created_at: string
  length: number
}

export async function fetchHitokoto(): Promise<HitokotoResponse> {
  try {
    const { data } = await axios.get('https://v1.hitokoto.cn/', { 
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    return data
  } catch (error) {
    return {
      id: 0,
      uuid: '',
      hitokoto: '今天也要加油呀！',
      type: 'a',
      from: '系统默认',
      creator: 'system',
      creator_uid: 0,
      reviewer: 0,
      commit_from: 'web',
      created_at: new Date().toISOString(),
      length: 8
    }
  }
}
