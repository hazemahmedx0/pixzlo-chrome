/**
 * Services Module
 *
 * This module exports all services following the SOLID principles:
 *
 * - Single Responsibility: Each service handles one specific domain
 * - Open/Closed: Services are open for extension via interfaces
 * - Liskov Substitution: Services can be substituted with mock implementations
 * - Interface Segregation: Small, focused interfaces for each service
 * - Dependency Inversion: Services depend on abstractions (interfaces)
 *
 * Usage:
 *
 * ```typescript
 * // Using the global container (recommended)
 * import { getLinearService, getFigmaService } from '@/lib/services'
 *
 * const linearService = getLinearService()
 * const status = await linearService.checkStatus()
 *
 * // Using custom container (for testing)
 * import { createServiceContainer } from '@/lib/services'
 *
 * const container = createServiceContainer({ apiBaseUrl: 'http://test' })
 * const linearService = container.linearService
 * ```
 */

// =============================================================================
// Interface Exports
// =============================================================================
export type {
  // Base interfaces
  IBaseService,
  ServiceResponse,

  // Service interfaces
  IWorkspaceService,
  IUserProfileService,
  ILinearService,
  IFigmaService,
  IScreenshotService,
  IIssueSubmissionService,
  IMessageHandlerService,

  // Data types
  ProfileResponse,
  WorkspaceData,
  LinearStatusResponse,
  LinearIntegrationData,
  LinearCreateIssueRequest,
  LinearCreateIssueResponse,
  LinearOptionsResponse,
  LinearTeam,
  LinearProject,
  LinearUser,
  LinearWorkflowState,
  LinearPreference,
  LinearPreferenceResponse,
  LinearPreferenceUpdateRequest,
  FigmaMetadataOptions,
  FigmaMetadataResponse,
  FigmaIntegration,
  FigmaToken,
  FigmaWebsite,
  FigmaDesignLink,
  FigmaPreference,
  FigmaPreferenceResponse,
  FigmaPreferenceUpdateRequest,
  FigmaDesignLinkCreateRequest,
  FigmaFileResponse,
  FigmaFrame,
  FigmaFrameRenderResponse,
  FigmaElementRenderResponse,
  CaptureArea,
  CaptureResponse,
  IssueSubmissionPayload,
  IssueSubmissionResponse,
  ExtensionMessage
} from "./interfaces"

// =============================================================================
// Service Implementation Exports
// =============================================================================
export { WorkspaceService, UserProfileService, createWorkspaceService, WORKSPACE_STORAGE_KEY } from "./workspace-service"
export { LinearService, severityToPriority, buildLinearDescription } from "./linear-service"
export { FigmaApiService } from "./figma-api-service"
export { ScreenshotService, dataUrlToBlob, fetchImageAsDataUrl } from "./screenshot-service"
export { IssueSubmissionService } from "./issue-submission-service"
export { MessageHandlerService, MESSAGE_TYPES } from "./message-handler-service"

// =============================================================================
// Service Container Exports
// =============================================================================
export {
  ServiceContainer,
  getServiceContainer,
  createServiceContainer,
  resetServiceContainer,
  getWorkspaceService,
  getLinearService,
  getFigmaService,
  getScreenshotService,
  getIssueSubmissionService,
  getMessageHandlerService
} from "./service-container"

export type { ServiceContainerConfig } from "./service-container"
