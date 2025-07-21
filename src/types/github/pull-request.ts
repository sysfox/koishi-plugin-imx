export interface PullRequestPayload {
  action: string
  number: number
  pull_request: {
    id: number
    number: number
    state: string
    locked: boolean
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
    body: string
    created_at: string
    updated_at: string
    closed_at: any
    merged_at: any
    merge_commit_sha: any
    assignee: any
    assignees: any[]
    requested_reviewers: any[]
    requested_teams: any[]
    labels: any[]
    milestone: any
    commits_url: string
    review_comments_url: string
    review_comment_url: string
    comments_url: string
    statuses_url: string
    head: {
      label: string
      ref: string
      sha: string
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
      repo: {
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
    base: {
      label: string
      ref: string
      sha: string
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
      repo: {
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
    _links: {
      self: { href: string }
      html: { href: string }
      issue: { href: string }
      comments: { href: string }
      review_comments: { href: string }
      review_comment: { href: string }
      commits: { href: string }
      statuses: { href: string }
    }
    author_association: string
    auto_merge: any
    draft: boolean
    merged: boolean
    mergeable: any
    rebaseable: any
    mergeable_state: string
    merged_by: any
    comments: number
    review_comments: number
    maintainer_can_modify: boolean
    commits: number
    additions: number
    deletions: number
    changed_files: number
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
