/**
 * API Response Types
 *
 * This module defines all response types for API calls made by the background script.
 * These types ensure type-safe communication with external services and the Pixzlo backend.
 */

/**
 * Generic API response wrapper providing consistent error handling
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Linear integration status response
 */
export interface LinearStatusResponse {
  connected: boolean
  integration?: {
    id?: string
    user_id?: string
    workspace_id?: string
    integration_type?: "linear" | "figma"
    configured_by?: string
    is_active?: boolean
    created_at?: string
    updated_at?: string
    integration_data?: LinearIntegrationData
  }
}

/**
 * Linear integration data containing user and organization details
 */
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

/**
 * Linear issue creation response
 */
export interface LinearCreateIssueResponse {
  success: boolean
  issue?: {
    id: string
    identifier: string
    title: string
    url: string
    state?: string
  }
  error?: string
}

/**
 * Linear metadata response containing teams, projects, users, and workflow states
 */
export interface LinearOptionsResponse {
  teams?: LinearTeam[]
  projects?: LinearProject[]
  users?: LinearUser[]
  workflowStates?: LinearWorkflowState[]
  preference?: LinearPreference
}

/**
 * Linear team structure
 */
export interface LinearTeam {
  id: string
  name: string
  key: string
  description?: string
  color?: string
}

/**
 * Linear project structure
 */
export interface LinearProject {
  id: string
  name: string
  description?: string
  state: string
  progress: number
  url: string
}

/**
 * Linear user structure
 */
export interface LinearUser {
  id: string
  name: string
  displayName: string
  email?: string
  avatarUrl?: string
  isActive: boolean
}

/**
 * Linear workflow state structure
 */
export interface LinearWorkflowState {
  id: string
  name: string
  color: string
  description?: string
  type: string
  position: number
  team?: {
    id: string
    name: string
  }
}

/**
 * Linear preference structure for persisting user selections
 */
export interface LinearPreference {
  id: string
  lastUsedTeamId?: string
  lastUsedTeamName?: string
  lastUsedProjectId?: string
  lastUsedProjectName?: string
  updatedAt: string
}

/**
 * Figma integration metadata response
 */
export interface FigmaMetadataResponse {
  integration?: {
    id: string
    workspace_id: string
    integration_type: string
    configured_by: string
    is_active: boolean
    created_at: string
    updated_at: string
    integration_data: Record<string, unknown> | undefined
  }
  token?: {
    accessToken?: string
    expiresAt?: string
    status: "valid" | "missing" | "expired" | "invalid"
    error?: string
  }
  website?: {
    domain: string
    url: string
    id: string | undefined
  }
  designLinks: FigmaDesignLinkData[]
  preference?: FigmaPreference
}

/**
 * Figma design link data structure
 */
export interface FigmaDesignLinkData {
  id: string
  website_id: string
  figma_file_id: string
  figma_frame_id: string
  frame_name: string | undefined
  frame_url: string
  thumbnail_url: string | undefined
  created_at: string
  created_by: string | undefined
  updated_at: string
  is_active: boolean | undefined
}

/**
 * Figma preference structure for persisting user selections
 */
export interface FigmaPreference {
  id: string
  lastUsedFrameId: string
  lastUsedFrameName: string | undefined
  lastUsedFileId: string
  frameUrl: string | undefined
  frameImageUrl: string | undefined
  updatedAt: string
}

/**
 * Figma frame render response
 */
export interface FrameRenderResponse {
  fileId: string
  nodeId: string
  frameData: import("@/types/figma").FigmaNode
  elements: Array<{
    id: string
    name: string
    type: string
    absoluteBoundingBox: import("@/types/figma").FigmaBoundingBox | undefined
    relativeTransform: unknown
    constraints: unknown
    depth: number
  }>
  imageUrl: string
  fileName: string
}

/**
 * User profile response from Pixzlo backend
 */
export interface ProfileResponse {
  success: boolean
  profile?: {
    workspaces?: WorkspaceData[]
  }
  needsOnboarding?: boolean
}

/**
 * Workspace data structure
 */
export interface WorkspaceData {
  id: string
  name?: string
  status: string
  slug?: string
  workspace_slug?: string
  workspace_id?: string
  workspace_name?: string
}

/**
 * Issue submission response
 */
export interface IssueSubmissionResponse {
  success: boolean
  data?: {
    issueId: string
    issueUrl?: string
  }
  error?: string
}

/**
 * Pages tree response for hierarchical page selection
 */
export interface PagesTreeResponse {
  success: boolean
  data?: unknown
  error?: string
}
