export interface CheckRun {
  action: string
  check_run: {
    id: number
    head_sha: string
    external_id: string
    url: string
    html_url: string
    details_url: string
    status: string
    conclusion: string | null
    started_at: string
    completed_at: string | null
    output: {
      title: string | null
      summary: string | null
      text: string | null
      annotations_count: number
      annotations_url: string
    }
    name: string
    check_suite: {
      id: number
      head_branch: string
      head_sha: string
      status: string
      conclusion: string | null
      url: string
      before: string
      after: string
      pull_requests: any[]
      app: {
        id: number
        slug: string
        name: string
        description: string
        external_url: string
        html_url: string
        created_at: string
        updated_at: string
        permissions: {
          [key: string]: string
        }
        events: string[]
      }
      created_at: string
      updated_at: string
    }
    app: {
      id: number
      slug: string
      name: string
      description: string
      external_url: string
      html_url: string
      created_at: string
      updated_at: string
      permissions: {
        [key: string]: string
      }
      events: string[]
    }
    pull_requests: any[]
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
