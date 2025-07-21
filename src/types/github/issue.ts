export interface IssueEvent {
  action: string
  issue: {
    id: number
    number: number
    title: string
    user: {
      login: string
      id: number
      avatar_url: string
      gravatar_id: string
      url: string
      html_url: string
      type: string
      site_admin: boolean
    }
    labels: Array<{
      id: number
      url: string
      name: string
      color: string
      default: boolean
    }>
    state: string
    locked: boolean
    assignee: any
    assignees: any[]
    milestone: any
    comments: number
    created_at: string
    updated_at: string
    closed_at: any
    author_association: string
    body: string
    html_url: string
  }
  repository: {
    id: number
    name: string
    full_name: string
    private: boolean
    owner: {
      login: string
      id: number
      avatar_url: string
      gravatar_id: string
      url: string
      html_url: string
      type: string
      site_admin: boolean
    }
    html_url: string
    description: string
    fork: boolean
    url: string
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
}
