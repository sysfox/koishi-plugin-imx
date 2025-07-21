export interface WorkflowEvent {
  action: string
  workflow_run: {
    id: number
    name: string
    node_id: string
    head_branch: string
    head_sha: string
    run_number: number
    event: string
    status: string
    conclusion: string | null
    workflow_id: number
    url: string
    html_url: string
    pull_requests: any[]
    created_at: string
    updated_at: string
    jobs_url: string
    logs_url: string
    check_suite_url: string
    artifacts_url: string
    cancel_url: string
    rerun_url: string
    workflow_url: string
    head_commit: {
      id: string
      tree_id: string
      message: string
      timestamp: string
      author: {
        name: string
        email: string
      }
      committer: {
        name: string
        email: string
      }
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
    head_repository: {
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
