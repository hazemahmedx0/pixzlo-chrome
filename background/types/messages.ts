/**
 * Message Types for Chrome Extension Communication
 *
 * This module defines all message types used for communication between
 * the content script, popup, and background service worker.
 */

/**
 * Union type of all supported message type identifiers.
 * Each message type corresponds to a specific action handled by the background script.
 */
export type MessageType =
  // Extension state
  | "GET_PINNED_STATE"
  | "OPEN_INTEGRATIONS_SETTINGS"
  // Linear integration
  | "linear-check-status"
  | "linear-create-issue"
  | "linear-fetch-options"
  | "linear-fetch-metadata"
  | "linear-fetch-preference"
  | "linear-update-preference"
  // Figma integration
  | "FIGMA_API_CALL"
  | "FIGMA_RENDER_FRAME"
  | "FIGMA_RENDER_ELEMENT"
  | "FIGMA_GET_IMAGE"
  | "FIGMA_OAUTH"
  | "figma-fetch-preference"
  | "figma-update-preference"
  | "figma-fetch-metadata"
  | "figma-create-design-link"
  | "figma-delete-design-link"
  // Capture operations
  | "capture-screen"
  | "CAPTURE_ELEMENT_SCREENSHOT"
  | "FETCH_IMAGE_DATA_URL"
  // API calls
  | "API_CALL"
  | "dummy-api-call"
  // Issue submission
  | "SUBMIT_ISSUE"
  // Pages tree
  | "FETCH_PAGES_TREE"

/**
 * Base message structure for all extension messages
 */
export interface BaseMessage {
  type: MessageType
}

/**
 * Generic message with optional data payload
 */
export interface MessageWithData<T = unknown> extends BaseMessage {
  data?: T
}

/**
 * Message for Linear issue creation
 */
export interface LinearCreateIssueMessage extends BaseMessage {
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

/**
 * Message for Figma API calls
 */
export interface FigmaApiCallMessage extends BaseMessage {
  type: "FIGMA_API_CALL"
  method: "GET_FILE"
  fileId: string
}

/**
 * Message for Figma frame rendering
 */
export interface FigmaRenderFrameMessage extends BaseMessage {
  type: "FIGMA_RENDER_FRAME"
  figmaUrl: string
}

/**
 * Message for Figma element rendering
 */
export interface FigmaRenderElementMessage extends BaseMessage {
  type: "FIGMA_RENDER_ELEMENT"
  fileId: string
  nodeId: string
}

/**
 * Message for Figma OAuth flow
 */
export interface FigmaOAuthMessage extends BaseMessage {
  type: "FIGMA_OAUTH"
  data?: {
    workspaceId?: string
  }
}

/**
 * Message for generic API calls
 */
export interface ApiCallMessage extends BaseMessage {
  type: "API_CALL"
  endpoint: string
  options: {
    method?: string
    headers?: Record<string, string>
    body?: string
  }
}

/**
 * Message for capturing visible tab screenshot
 */
export interface CaptureScreenMessage extends BaseMessage {
  type: "capture-screen"
}

/**
 * Message for capturing element screenshot with area
 */
export interface CaptureElementScreenshotMessage extends BaseMessage {
  type: "CAPTURE_ELEMENT_SCREENSHOT"
  area?: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * Message for fetching image as data URL
 */
export interface FetchImageDataUrlMessage extends BaseMessage {
  type: "FETCH_IMAGE_DATA_URL"
  url: string
}

/**
 * Message for issue submission
 */
export interface SubmitIssueMessage extends BaseMessage {
  type: "SUBMIT_ISSUE"
  payload: IssueSubmissionPayload
}

/**
 * Payload structure for issue submission
 */
export interface IssueSubmissionPayload {
  title?: string
  description?: string
  priority?: string
  issue_type?: string
  isElementCapture?: boolean
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
    teams?: { id?: string }
    projects?: { id?: string }
    users?: { id?: string }
    workflowStates?: { id?: string }
  }
}

/**
 * Message for Figma preference operations
 */
export interface FigmaPreferenceMessage extends BaseMessage {
  type: "figma-fetch-preference" | "figma-update-preference"
  data: {
    websiteUrl: string
    frameId?: string
    frameName?: string
    fileId?: string
    frameUrl?: string
    frameImageUrl?: string
  }
}

/**
 * Message for Figma metadata operations
 */
export interface FigmaMetadataMessage extends BaseMessage {
  type: "figma-fetch-metadata"
  data?: {
    websiteUrl?: string
    force?: boolean
    workspaceId?: string
  }
}

/**
 * Message for Figma design link operations
 */
export interface FigmaDesignLinkMessage extends BaseMessage {
  type: "figma-create-design-link" | "figma-delete-design-link"
  data: {
    websiteUrl?: string
    pageTitle?: string
    faviconUrl?: string
    linkId?: string
    linkData?: {
      figma_file_id: string
      figma_frame_id: string
      frame_name?: string
      frame_url: string
      thumbnail_url?: string
    }
  }
}

/**
 * Message for Linear preference update
 */
export interface LinearPreferenceUpdateMessage extends BaseMessage {
  type: "linear-update-preference"
  data: {
    teamId?: string
    teamName?: string
    projectId?: string
    projectName?: string
  }
}

/**
 * Union type of all message types for type-safe message handling
 */
export type ExtensionMessage =
  | BaseMessage
  | MessageWithData
  | LinearCreateIssueMessage
  | FigmaApiCallMessage
  | FigmaRenderFrameMessage
  | FigmaRenderElementMessage
  | FigmaOAuthMessage
  | ApiCallMessage
  | CaptureScreenMessage
  | CaptureElementScreenshotMessage
  | FetchImageDataUrlMessage
  | SubmitIssueMessage
  | FigmaPreferenceMessage
  | FigmaMetadataMessage
  | FigmaDesignLinkMessage
  | LinearPreferenceUpdateMessage
