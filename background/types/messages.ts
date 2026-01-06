/**
 * Message types for communication between content scripts and background service worker.
 * Follows Interface Segregation Principle - specific types for each message category.
 */

// Base response type for all API operations
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Linear Message Types
export interface LinearStatusRequest {
  type: "linear-check-status"
}

export interface LinearCreateIssueRequest {
  type: "linear-create-issue"
  data: {
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
}

export interface LinearFetchMetadataRequest {
  type: "linear-fetch-metadata" | "linear-fetch-options"
}

export interface LinearFetchPreferenceRequest {
  type: "linear-fetch-preference"
}

export interface LinearUpdatePreferenceRequest {
  type: "linear-update-preference"
  data: {
    teamId?: string
    teamName?: string
    projectId?: string
    projectName?: string
  }
}

// Figma Message Types
export interface FigmaApiCallRequest {
  type: "FIGMA_API_CALL"
  method: "GET_FILE"
  fileId: string
}

export interface FigmaRenderFrameRequest {
  type: "FIGMA_RENDER_FRAME"
  figmaUrl: string
}

export interface FigmaRenderElementRequest {
  type: "FIGMA_RENDER_ELEMENT"
  fileId: string
  nodeId: string
}

export interface FigmaGetImageRequest {
  type: "FIGMA_GET_IMAGE"
  fileId: string
  nodeId: string
}

export interface FigmaOAuthRequest {
  type: "FIGMA_OAUTH"
}

export interface FigmaFetchMetadataRequest {
  type: "figma-fetch-metadata"
  data?: {
    websiteUrl?: string
  }
}

export interface FigmaFetchPreferenceRequest {
  type: "figma-fetch-preference"
  data: {
    websiteUrl: string
  }
}

export interface FigmaUpdatePreferenceRequest {
  type: "figma-update-preference"
  data: {
    websiteUrl: string
    frameId: string
    frameName?: string
    fileId?: string
    frameUrl?: string
    frameImageUrl?: string
  }
}

export interface FigmaCreateDesignLinkRequest {
  type: "figma-create-design-link"
  data: {
    websiteUrl?: string
    linkData: {
      figma_file_id: string
      figma_frame_id: string
      frame_name?: string
      frame_url: string
      thumbnail_url?: string
    }
  }
}

export interface FigmaDeleteDesignLinkRequest {
  type: "figma-delete-design-link"
  data: {
    websiteUrl?: string
    linkId: string
  }
}

// Screenshot Message Types
export interface CaptureScreenshotRequest {
  type: "CAPTURE_ELEMENT_SCREENSHOT"
  area?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface CaptureScreenRequest {
  type: "capture-screen"
}

// API Call Message Types
export interface GenericApiCallRequest {
  type: "API_CALL"
  endpoint: string
  options: {
    method?: string
    headers?: Record<string, string>
    body?: string
  }
}

// Issue Submission Message Types
export interface SubmitIssueRequest {
  type: "SUBMIT_ISSUE"
  payload: IssuePayload
}

export interface IssuePayload {
  title?: string
  description?: string
  priority?: string
  issue_type?: string
  isElementCapture?: boolean
  metadata?: {
    url?: string
    device?: string
    screenResolution?: string
    viewportSize?: string
  }
  browserInfo?: {
    name?: string
    version?: string
  }
  images?: {
    clean?: string
    annotated?: string
  }
  figma?: {
    figmaUrl?: string
    imageUrl?: string
    fileId?: string
    frameId?: string
    frameName?: string
    thumbnailUrl?: string
  }
  cssStyles?: Array<{
    property_name: string
    implemented_value?: string
    design_value?: string
  }>
  linearEnabled?: boolean
  linearOptions?: {
    teams?: { id: string }
    projects?: { id: string }
    users?: { id: string }
    workflowStates?: { id: string }
  }
}

// Utility Message Types
export interface PingRequest {
  type: "ping"
}

export interface DummyApiCallRequest {
  type: "dummy-api-call"
}

// Union type for all message requests
export type BackgroundMessage =
  | LinearStatusRequest
  | LinearCreateIssueRequest
  | LinearFetchMetadataRequest
  | LinearFetchPreferenceRequest
  | LinearUpdatePreferenceRequest
  | FigmaApiCallRequest
  | FigmaRenderFrameRequest
  | FigmaRenderElementRequest
  | FigmaGetImageRequest
  | FigmaOAuthRequest
  | FigmaFetchMetadataRequest
  | FigmaFetchPreferenceRequest
  | FigmaUpdatePreferenceRequest
  | FigmaCreateDesignLinkRequest
  | FigmaDeleteDesignLinkRequest
  | CaptureScreenshotRequest
  | CaptureScreenRequest
  | GenericApiCallRequest
  | SubmitIssueRequest
  | PingRequest
  | DummyApiCallRequest

// Response types for Figma operations
export interface FigmaMetadataResponse {
  integration?: {
    id: string
    workspace_id: string
    integration_type: string
    configured_by: string
    is_active: boolean
    created_at: string
    updated_at: string
    integration_data?: Record<string, unknown>
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
    id?: string
  }
  designLinks: Array<{
    id: string
    website_id: string
    figma_file_id: string
    figma_frame_id: string
    frame_name?: string
    frame_url: string
    thumbnail_url?: string
    created_at: string
    created_by?: string
    updated_at: string
    is_active?: boolean
  }>
  preference?: {
    id: string
    lastUsedFrameId: string
    lastUsedFrameName?: string
    lastUsedFileId: string
    frameUrl?: string
    frameImageUrl?: string
    updatedAt: string
  }
}

export interface FrameRenderResponse {
  fileId: string
  nodeId: string
  frameData: unknown
  elements: unknown[]
  imageUrl: string
  fileName: string
}

// Response types for Linear operations
export interface LinearStatusResponse {
  connected: boolean
  integration?: {
    id: string
    workspace_id: string
    integration_type: "linear" | "figma"
    configured_by: string
    is_active: boolean
    created_at: string
    updated_at: string
    integration_data: {
      type: "linear"
      user_name: string
      organization_name: string
      team_name?: string
      teams_count: number
      connected_at: string
      expires_at?: string
    }
  }
}

export interface LinearOptionsResponse {
  teams?: Array<{
    id: string
    name: string
    key: string
    description?: string
    color?: string
  }>
  projects?: Array<{
    id: string
    name: string
    description?: string
    state: string
    progress: number
    url: string
  }>
  users?: Array<{
    id: string
    name: string
    displayName: string
    email?: string
    avatarUrl?: string
    isActive: boolean
  }>
  workflowStates?: Array<{
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
  }>
  preference?: {
    id: string
    lastUsedTeamId?: string
    lastUsedTeamName?: string
    lastUsedProjectId?: string
    lastUsedProjectName?: string
    updatedAt: string
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
