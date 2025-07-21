export interface BLUser {
  code: number
  msg: string
  message: string
  data: {
    info: {
      uid: number
      uname: string
      face: string
      official_verify: {
        type: number
        desc: string
      }
      gender: number
    }
  }
}
