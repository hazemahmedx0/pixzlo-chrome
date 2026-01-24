/**
 * Background Services Module
 *
 * Central export point for all service classes used by the background script.
 * Services encapsulate business logic and API interactions.
 */

export { WorkspaceService, WORKSPACE_STORAGE_KEY } from "./workspace-service"
export { LinearService } from "./linear-service"
export { FigmaService } from "./figma-service"
export { CaptureService } from "./capture-service"
export { IssueService } from "./issue-service"

// Re-export service-specific types
export type { LinearIssueData, LinearPreferenceUpdate } from "./linear-service"
export type {
  FigmaPreferenceUpdate,
  FigmaDesignLinkData
} from "./figma-service"
export type { CaptureArea, CaptureResult } from "./capture-service"
