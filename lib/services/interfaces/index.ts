/**
 * Service Interfaces Module
 *
 * This module defines the abstract interfaces for all services following
 * the Dependency Inversion Principle (DIP) from SOLID.
 *
 * All services depend on these abstractions rather than concrete implementations.
 */

/**
 * Generic API response wrapper for consistent error handling
 */
export interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Base service interface that all services must implement
 */
export interface IBaseService {
  /**
   * Service identifier for logging and debugging
   */
  readonly serviceName: string
}

/**
 * Workspace management service interface
 */
export interface IWorkspaceService extends IBaseService {
  getStoredWorkspaceId(): Promise<string | undefined>
  getUserActiveWorkspaceId(): Promise<string | undefined>
  getSelectedWorkspaceSlug(): Promise<string | undefined>
  setWorkspaceId(workspaceId: string): Promise<void>
}

/**
 * User profile service interface
 */
export interface IUserProfileService extends IBaseService {
  getProfile(): Promise<ProfileResponse | undefined>
  clearCache(): void
}

/**
 * Linear integration service interface
 */
export interface ILinearService extends IBaseService {
  checkStatus(): Promise<ServiceResponse<LinearStatusResponse>>
  createIssue(
    issueData: LinearCreateIssueRequest
  ): Promise<ServiceResponse<LinearCreateIssueResponse>>
  fetchMetadata(): Promise<ServiceResponse<LinearOptionsResponse>>
  fetchPreference(): Promise<ServiceResponse<LinearPreferenceResponse>>
  updatePreference(
    data: LinearPreferenceUpdateRequest
  ): Promise<ServiceResponse<LinearPreferenceResponse>>
}

/**
 * Figma integration service interface
 */
export interface IFigmaService extends IBaseService {
  fetchMetadata(
    websiteUrl?: string,
    options?: FigmaMetadataOptions
  ): Promise<ServiceResponse<FigmaMetadataResponse>>
  updatePreference(
    data: FigmaPreferenceUpdateRequest
  ): Promise<ServiceResponse<FigmaMetadataResponse>>
  createDesignLink(
    data: FigmaDesignLinkCreateRequest
  ): Promise<ServiceResponse<FigmaMetadataResponse>>
  deleteDesignLink(linkId: string): Promise<ServiceResponse<FigmaMetadataResponse>>
  fetchPreference(websiteUrl: string): Promise<ServiceResponse<FigmaPreferenceResponse>>
  startOAuth(workspaceId?: string): Promise<ServiceResponse<{ authUrl: string }>>
  fetchFile(fileId: string): Promise<ServiceResponse<FigmaFileResponse>>
  renderFrame(figmaUrl: string): Promise<ServiceResponse<FigmaFrameRenderResponse>>
  renderElement(fileId: string, nodeId: string): Promise<ServiceResponse<FigmaElementRenderResponse>>
  clearMetadataCache(): void
}

/**
 * Screenshot capture service interface
 */
export interface IScreenshotService extends IBaseService {
  captureVisibleTab(windowId?: number): Promise<ServiceResponse<{ dataUrl: string }>>
  captureElementScreenshot(area: CaptureArea): Promise<ServiceResponse<CaptureResponse>>
}

/**
 * Issue submission service interface
 */
export interface IIssueSubmissionService extends IBaseService {
  submitIssue(payload: IssueSubmissionPayload): Promise<ServiceResponse<IssueSubmissionResponse>>
}

/**
 * Message handler service interface for Chrome extension message routing
 */
export interface IMessageHandlerService extends IBaseService {
  handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): boolean | void
}

// =============================================================================
// Type Definitions
// =============================================================================

export interface ProfileResponse {
  success: boolean
  profile?: {
    workspaces?: WorkspaceData[]
  }
}

export interface WorkspaceData {
  id: string
  name?: string
  status: string
  slug?: string
  workspace_slug?: string
  workspace_id?: string
  workspace_name?: string
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

export interface LinearOptionsResponse {
  teams?: LinearTeam[]
  projects?: LinearProject[]
  users?: LinearUser[]
  workflowStates?: LinearWorkflowState[]
  preference?: LinearPreference | undefined
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

export interface LinearPreferenceResponse {
  id: string
  lastUsedTeamId: string | undefined
  lastUsedTeamName: string | undefined
  lastUsedProjectId: string | undefined
  lastUsedProjectName: string | undefined
  updatedAt: string
}

export interface LinearPreferenceUpdateRequest {
  teamId?: string
  teamName?: string
  projectId?: string
  projectName?: string
}

export interface FigmaMetadataOptions {
  force?: boolean
  workspaceId?: string
}

export interface FigmaMetadataResponse {
  integration: FigmaIntegration | undefined
  token: FigmaToken | undefined
  website: FigmaWebsite | undefined
  designLinks: FigmaDesignLink[]
  preference: FigmaPreference | undefined
}

export interface FigmaIntegration {
  id: string
  workspace_id: string
  integration_type: string
  configured_by: string
  is_active: boolean
  created_at: string
  updated_at: string
  integration_data: Record<string, unknown> | undefined
}

export interface FigmaToken {
  accessToken?: string
  expiresAt?: string | undefined
  status: "valid" | "missing" | "expired" | "invalid"
  error?: string
}

export interface FigmaWebsite {
  domain: string
  url: string
  id: string | undefined
}

export interface FigmaDesignLink {
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

export interface FigmaPreferenceResponse {
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

export interface FigmaFileResponse {
  id: string
  name: string
  pages: unknown[]
  frames: FigmaFrame[]
  document: unknown
}

export interface FigmaFrame {
  id: string
  name: string
  type: string
  absoluteBoundingBox: unknown
}

export interface FigmaFrameRenderResponse {
  fileId: string
  nodeId: string
  frameData: unknown
  elements: unknown[]
  imageUrl: string
  fileName: string
}

export interface FigmaElementRenderResponse {
  imageUrl: string
  nodeId: string
  fileId: string
}

export interface CaptureArea {
  x: number
  y: number
  width: number
  height: number
}

export interface CaptureResponse {
  screenshotDataUrl: string
  area: CaptureArea
}

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
  metadata?: {
    url?: string
    device?: string
    screenResolution?: string
    viewportSize?: string
  }
  browserInfo?: {
    name?: string
    version?: string
    userAgent?: string
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

export interface IssueSubmissionResponse {
  issueId: string
  issueUrl: string
}

export interface ExtensionMessage {
  type: string
  data?: unknown
  [key: string]: unknown
}
