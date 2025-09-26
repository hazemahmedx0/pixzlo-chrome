export interface LinearIntegrationData {
  type: "linear"
  user_name: string
  organization_name: string
  team_name?: string
  teams_count: number
  connected_at: string
  expires_at?: string
}

export interface IntegrationStatusResponse {
  connected: boolean
  integration?: {
    id: string
    workspace_id: string
    integration_type: "linear" | "figma"
    configured_by: string
    is_active: boolean
    created_at: string
    updated_at: string
    integration_data: LinearIntegrationData
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
