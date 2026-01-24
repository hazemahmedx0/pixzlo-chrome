/**
 * Background Script Types
 * 
 * This module contains all type definitions used by the background script
 * and its related services.
 */

import type { FigmaNode } from "@/types/figma"

// ============================================================================
// Workspace Types
// ============================================================================

export interface WorkspaceData {
  id: string
  name?: string
  status: string
  slug?: string
  workspace_slug?: string
  workspace_id?: string
  workspace_name?: string
}

export interface ProfileResponse {
  success: boolean
  profile?: {
    workspaces?: WorkspaceData[]
  }
  needsOnboarding?: boolean
}

export interface UserProfileCache {
  data: ProfileResponse
  fetchedAt: number
}

// ============================================================================
// Linear Integration Types
// ============================================================================

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

export interface LinearCreateIssueRequest {
  title: string
  description: string
  priority?: number
  linearOptions?: {
    teamId?: string
    projectId?: string
    assigneeId?: string
    stateId?: string
  }
}

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

export interface LinearTeam {
  id: string
  name: string
  key: string
  description?: string
  color?: string
}

export interface LinearProject {
  id: string
  name: string
  description?: string
  state: string
  progress: number
  url: string
}

export interface LinearUser {
  id: string
  name: string
  displayName: string
  email?: string
  avatarUrl?: string
  isActive: boolean
}

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

export interface LinearPreference {
  id: string
  lastUsedTeamId?: string
  lastUsedTeamName?: string
  lastUsedProjectId?: string
  lastUsedProjectName?: string
  updatedAt: string
}

export interface LinearOptionsResponse {
  teams?: LinearTeam[]
  projects?: LinearProject[]
  users?: LinearUser[]
  workflowStates?: LinearWorkflowState[]
  preference?: LinearPreference
}

export interface LinearPreferenceUpdateRequest {
  teamId?: string
  teamName?: string
  projectId?: string
  projectName?: string
}

// ============================================================================
// Figma Integration Types
// ============================================================================

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

export interface FigmaPreference {
  id: string
  lastUsedFrameId: string
  lastUsedFrameName: string | undefined
  lastUsedFileId: string
  frameUrl: string | undefined
  frameImageUrl: string | undefined
  updatedAt: string
}

export interface FigmaPreferenceUpdateRequest {
  websiteUrl: string
  frameId: string
  frameName?: string
  fileId?: string
  frameUrl?: string
  frameImageUrl?: string
}

export interface FigmaDesignLinkCreateRequest {
  websiteUrl?: string
  pageTitle?: string
  faviconUrl?: string
  linkData: {
    figma_file_id: string
    figma_frame_id: string
    frame_name?: string
    frame_url: string
    thumbnail_url?: string
  }
}

export interface FrameRenderResponse {
  fileId: string
  nodeId: string
  frameData: FigmaNode
  elements: FigmaExtractedElement[]
  imageUrl: string
  fileName: string
}

export interface FigmaExtractedElement {
  id: string
  name: string
  type: string
  absoluteBoundingBox:
    | {
        x: number
        y: number
        width: number
        height: number
      }
    | undefined
  relativeTransform: unknown
  constraints: unknown
  depth: number
}

export interface ParsedFigmaUrl {
  fileId: string | undefined
  nodeId: string | undefined
}

// ============================================================================
// Issue Submission Types
// ============================================================================

export interface CssStyleProperty {
  property_name: string
  implemented_value?: string
  design_value?: string
}

export interface BrowserInfo {
  name?: string
  version?: string
  userAgent?: string
}

export interface IssueMetadata {
  url?: string
  browser?: string
  device?: string
  screenResolution?: string
  viewportSize?: string
}

export interface IssueImages {
  clean?: string
  annotated?: string
}

export interface IssueFigmaData {
  figmaUrl?: string
  imageUrl?: string
  fileId?: string
  frameId?: string
  frameName?: string
  thumbnailUrl?: string
}

export interface IssueLinearOptions {
  teams?: { id: string }
  projects?: { id: string }
  users?: { id: string }
  workflowStates?: { id: string }
}

export interface IssueSubmissionPayload {
  title?: string
  description?: string
  priority?: string
  issue_type?: string
  isElementCapture?: boolean
  metadata?: IssueMetadata
  images?: IssueImages
  figma?: IssueFigmaData
  cssStyles?: CssStyleProperty[]
  browserInfo?: BrowserInfo
  linearEnabled?: boolean
  linearOptions?: IssueLinearOptions
}

export interface IssueSubmissionResult {
  issueId: string
  issueUrl?: string
}

// ============================================================================
// Screenshot Types
// ============================================================================

export interface ScreenshotArea {
  x: number
  y: number
  width: number
  height: number
}

export interface ElementScreenshotRequest {
  area: ScreenshotArea
}

export interface ScreenshotResponse {
  success: boolean
  screenshotDataUrl?: string
  area?: ScreenshotArea
  error?: string
}

// ============================================================================
// Message Handler Types
// ============================================================================

export type MessageType =
  | "GET_PINNED_STATE"
  | "OPEN_INTEGRATIONS_SETTINGS"
  | "linear-check-status"
  | "linear-create-issue"
  | "linear-fetch-options"
  | "linear-fetch-metadata"
  | "linear-fetch-preference"
  | "linear-update-preference"
  | "FETCH_PAGES_TREE"
  | "FIGMA_API_CALL"
  | "FIGMA_RENDER_FRAME"
  | "FIGMA_RENDER_ELEMENT"
  | "FIGMA_GET_IMAGE"
  | "FIGMA_OAUTH"
  | "FETCH_IMAGE_DATA_URL"
  | "CAPTURE_ELEMENT_SCREENSHOT"
  | "capture-screen"
  | "API_CALL"
  | "dummy-api-call"
  | "SUBMIT_ISSUE"
  | "figma-fetch-preference"
  | "figma-update-preference"
  | "figma-fetch-metadata"
  | "figma-create-design-link"
  | "figma-delete-design-link"

export interface BackgroundMessage {
  type: MessageType
  data?: unknown
  method?: string
  fileId?: string
  nodeId?: string
  figmaUrl?: string
  url?: string
  area?: ScreenshotArea
  endpoint?: string
  options?: {
    method?: string
    headers?: Record<string, string>
    body?: string
  }
  payload?: IssueSubmissionPayload
}

export interface MessageResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export type MessageHandler = (
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender
) => Promise<MessageResponse>

// ============================================================================
// Service Result Types
// ============================================================================

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: string
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T> {
  data: T
  expiresAt: number
}

export interface FigmaMetadataCache {
  data: FigmaMetadataResponse | undefined
  expiresAt: Date | undefined
}
