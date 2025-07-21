export interface BLRoom {
  code: number
  message: string
  ttl: number
  data: {
    by_room_ids: {
      [roomId: string]: {
        room_id: number
        uid: number
        title: string
        live_status: number
        live_start_time: number
        short_id: number
        area: number
        area_name: string
        area_v2_id: number
        area_v2_name: string
        area_v2_parent_name: string
        area_v2_parent_id: number
        uname: string
        face: string
        tag_name: string
        tags: string
        cover_from_user: string
        keyframe: string
        lock_till: string
        hidden_till: string
        broadcast_type: number
        cover: string
      }
    }
  }
}
