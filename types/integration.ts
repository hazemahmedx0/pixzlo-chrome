export interface LinearIntegrationData {
  linear_user_id?: string
  linear_user_name?: string
  linear_user_email?: string
  linear_organization_id?: string
  linear_organization_name?: string
  default_team_id?: string
  default_team_name?: string
  available_teams?: Array<{ id: string; name: string; key?: string }>
  permissions?: string[]
  connected_at?: string
  expires_at?: string
  api_version?: string
}

export interface IntegrationStatusResponse {
  connected: boolean
  integration?: {
    id?: string
    user_id?: string
    integration_type?: "linear" | "figma"
    configured_by?: string
    is_active?: boolean
    created_at?: string
    updated_at?: string
    integration_data?: LinearIntegrationData
  }
}

export interface LinearIssueCreateRequest {
  title: string
  description: string
  teamId?: string
  priority?: number
  labels?: string[]
  assigneeId?: string
  projectId?: string
}

export interface LinearIssueResponse {
  success: boolean
  issue?: {
    id: string
    identifier: string
    url: string
    title: string
  }
  error?: string
}
