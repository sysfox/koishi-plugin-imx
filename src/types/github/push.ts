export interface PushEvent {
  ref: string
  before: string
  after: string
  repository: {
    id: number
    name: string
    full_name: string
    private: boolean
    html_url: string
    description: string
    fork: boolean
    url: string
  }
  pusher: {
    name: string
    email: string
  }
  sender: {
    login: string
    id: number
    avatar_url: string
    gravatar_id: string
    url: string
    html_url: string
    type: string
    site_admin: boolean
  }
  commits: Array<{
    id: string
    tree_id: string
    distinct: boolean
    message: string
    timestamp: string
    url: string
    author: {
      name: string
      email: string
      username?: string
    }
    committer: {
      name: string
      email: string
      username?: string
    }
    added: string[]
    removed: string[]
    modified: string[]
  }>
  head_commit: {
    id: string
    tree_id: string
    distinct: boolean
    message: string
    timestamp: string
    url: string
    author: {
      name: string
      email: string
      username?: string
    }
    committer: {
      name: string
      email: string
      username?: string
    }
    added: string[]
    removed: string[]
    modified: string[]
  }
}
