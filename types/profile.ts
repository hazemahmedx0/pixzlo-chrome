export interface Workspace {
  // From get_user_profile RPC
  id: string
  name: string
  role: string
  slug?: string
  status: string
  // From get_user_workspaces RPC (extended fields)
  workspace_id?: string
  workspace_name?: string
  workspace_logo_url?: string | null
  member_count?: number
  issue_count?: number
  joined_at?: string
  is_owner?: boolean
}

export interface Profile {
  id?: string
  email?: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  is_onboarded?: boolean
  workspaces?: Workspace[]
}
