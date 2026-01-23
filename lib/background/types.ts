/**
 * Background Script Type Definitions
 *
 * Contains interfaces and types for message handling, responses,
 * and service contracts in the background script.
 */

/**
 * Standard response format for all message handlers
 */
export interface MessageResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Base message structure
 */
export interface BaseMessage {
  type: string
}

/**
 * Message handler function signature
 */
export type MessageHandler<TMessage extends BaseMessage, TResponse> = (
  message: TMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse<TResponse>) => void
) => boolean | void

/**
 * Message handler registry entry
 */
export interface MessageHandlerEntry {
  handler: MessageHandler<BaseMessage, unknown>
  description?: string
}

/**
 * Linear Integration Types
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
    integration_data?: {
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
  preference?: LinearPreference | undefined
}

export interface LinearIssueData {
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

/**
 * Figma Integration Types
 */
export interface FigmaMetadataResponse {
  integration:
    | {
        id: string
        workspace_id: string
        integration_type: string
        configured_by: string
        is_active: boolean
        created_at: string
        updated_at: string
        integration_data: Record<string, unknown> | undefined
      }
    | undefined
  token:
    | {
        accessToken?: string
        expiresAt?: string | undefined
        status: "valid" | "missing" | "expired" | "invalid"
        error?: string
      }
    | undefined
  website:
    | {
        domain: string
        url: string
        id: string | undefined
      }
    | undefined
  designLinks: Array<{
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
  }>
  preference:
    | {
        id: string
        lastUsedFrameId: string
        lastUsedFrameName: string | undefined
        lastUsedFileId: string
        frameUrl: string | undefined
        frameImageUrl: string | undefined
        updatedAt: string
      }
    | undefined
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

/**
 * Workspace Types
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

export interface ProfileResponse {
  success: boolean
  profile?: {
    workspaces?: WorkspaceData[]
  }
}

/**
 * Issue Submission Types
 */
export interface IssueSubmissionPayload {
  title?: string
  description?: string
  priority?: string
  issue_type?: string
  isElementCapture?: boolean
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
    implemented_value: string
    design_value?: string
  }>
  metadata?: {
    url?: string
    device?: string
    browser?: string
    screenResolution?: string
    viewportSize?: string
  }
  browserInfo?: {
    name?: string
    version?: string
    userAgent?: string
  }
  linearEnabled?: boolean
  linearOptions?: {
    teams?: { id: string }
    projects?: { id: string }
    users?: { id: string }
    workflowStates?: { id: string }
  }
}

/**
 * Frame Render Types
 */
export interface FrameRenderResponse {
  fileId: string
  nodeId: string
  frameData: unknown
  elements: Array<{
    id: string
    name: string
    type: string
    absoluteBoundingBox: { x: number; y: number; width: number; height: number } | undefined
    relativeTransform: unknown
    constraints: unknown
    depth: number
  }>
  imageUrl: string
  fileName: string
}

/**
 * Message Types Enum
 */
export const MessageTypes = {
  // Extension State
  GET_PINNED_STATE: "GET_PINNED_STATE",
  OPEN_INTEGRATIONS_SETTINGS: "OPEN_INTEGRATIONS_SETTINGS",

  // Capture
  CAPTURE_SCREEN: "capture-screen",
  CAPTURE_ELEMENT_SCREENSHOT: "CAPTURE_ELEMENT_SCREENSHOT",

  // Linear Integration
  LINEAR_CHECK_STATUS: "linear-check-status",
  LINEAR_CREATE_ISSUE: "linear-create-issue",
  LINEAR_FETCH_OPTIONS: "linear-fetch-options",
  LINEAR_FETCH_METADATA: "linear-fetch-metadata",
  LINEAR_FETCH_PREFERENCE: "linear-fetch-preference",
  LINEAR_UPDATE_PREFERENCE: "linear-update-preference",

  // Figma Integration
  FIGMA_API_CALL: "FIGMA_API_CALL",
  FIGMA_RENDER_FRAME: "FIGMA_RENDER_FRAME",
  FIGMA_RENDER_ELEMENT: "FIGMA_RENDER_ELEMENT",
  FIGMA_GET_IMAGE: "FIGMA_GET_IMAGE",
  FIGMA_OAUTH: "FIGMA_OAUTH",
  FIGMA_FETCH_METADATA: "figma-fetch-metadata",
  FIGMA_FETCH_PREFERENCE: "figma-fetch-preference",
  FIGMA_UPDATE_PREFERENCE: "figma-update-preference",
  FIGMA_CREATE_DESIGN_LINK: "figma-create-design-link",
  FIGMA_DELETE_DESIGN_LINK: "figma-delete-design-link",

  // API
  API_CALL: "API_CALL",
  FETCH_IMAGE_DATA_URL: "FETCH_IMAGE_DATA_URL",
  FETCH_PAGES_TREE: "FETCH_PAGES_TREE",

  // Issue
  SUBMIT_ISSUE: "SUBMIT_ISSUE",

  // Test
  DUMMY_API_CALL: "dummy-api-call"
} as const

export type MessageType = (typeof MessageTypes)[keyof typeof MessageTypes]
