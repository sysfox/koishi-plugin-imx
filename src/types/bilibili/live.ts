export interface BLLive {
  code: number
  message: string
  ttl: number
  data: {
    live_status: number
    live_time: string
    playurl_info?: {
      conf_json: string
      playurl: {
        cid: number
        g_qn_desc: Array<{
          qn: number
          desc: string
        }>
        stream: Array<{
          protocol_name: string
          format: Array<{
            format_name: string
            codec: Array<{
              codec_name: string
              current_qn: number
              accept_qn: number[]
              base_url: string
              url_info: Array<{
                host: string
                extra: string
                stream_ttl: number
              }>
            }>
          }>
        }>
      }
    }
  }
}
