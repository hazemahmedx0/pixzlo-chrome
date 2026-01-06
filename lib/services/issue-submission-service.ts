/**
 * Issue Submission Service
 *
 * Handles issue creation and submission to the Pixzlo backend.
 * Implements Single Responsibility Principle by focusing solely on issue operations.
 */

import type {
  IIssueSubmissionService,
  IWorkspaceService,
  IssueSubmissionPayload,
  IssueSubmissionResponse,
  ServiceResponse
} from "./interfaces"

/**
 * Issue Submission Service Implementation
 */
export class IssueSubmissionService implements IIssueSubmissionService {
  readonly serviceName = "IssueSubmissionService"

  private readonly apiBaseUrl: string
  private readonly workspaceService: IWorkspaceService

  constructor(apiBaseUrl: string, workspaceService: IWorkspaceService) {
    this.apiBaseUrl = apiBaseUrl
    this.workspaceService = workspaceService
  }

  /**
   * Submits an issue with all associated data
   */
  async submitIssue(
    payload: IssueSubmissionPayload
  ): Promise<ServiceResponse<IssueSubmissionResponse>> {
    try {
      console.log(`[${this.serviceName}] Using batch create endpoint for faster issue creation...`)

      const workspaceId = await this.workspaceService.getUserActiveWorkspaceId()

      if (!workspaceId) {
        return {
          success: false,
          error: "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      console.log(`[${this.serviceName}] Using workspace ID:`, workspaceId)

      const batchBody = this.buildBatchCreateBody(payload, workspaceId)

      console.log(`[${this.serviceName}] Sending batch create request...`)

      const response = await fetch(`${this.apiBaseUrl}/api/issues/batch-create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(batchBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Batch create failed: ${response.status} ${(errorData as { error?: string }).error || ""}`
        )
      }

      const result = (await response.json()) as {
        data?: { issueId?: string; issueUrl?: string }
      }

      const issueId = result.data?.issueId
      const issueUrl = result.data?.issueUrl

      if (!issueId) {
        throw new Error("No issue ID returned from batch create")
      }

      console.log(`[${this.serviceName}] Issue created successfully:`, issueUrl)

      return {
        success: true,
        data: { issueId, issueUrl: issueUrl ?? "" }
      }
    } catch (error) {
      console.error(`[${this.serviceName}] Issue submission error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Submit failed"
      }
    }
  }

  /**
   * Builds the batch create request body
   */
  private buildBatchCreateBody(
    payload: IssueSubmissionPayload,
    workspaceId: string
  ): BatchCreateBody {
    const websiteUrl = payload.metadata?.url
    const title = (payload.title || "Untitled issue").slice(0, 200)
    const description = payload.description || ""
    const hasDesign = !!payload.figma?.figmaUrl
    const issueType = hasDesign
      ? "screenshot_with_design"
      : payload.issue_type || (payload.isElementCapture ? "comparison" : "screenshot")
    const severity = payload.priority || "medium"

    // Prepare images array
    const images = this.prepareImages(payload)

    // Prepare device info
    const deviceInfo = payload.metadata?.device
      ? {
          device: payload.metadata.device,
          os: "unknown" as const,
          version: undefined
        }
      : undefined

    // Prepare browser info
    const browserInfo = this.parseBrowserInfo(payload.browserInfo)

    // Build the body
    const body: BatchCreateBody = {
      workspace_id: workspaceId,
      title,
      description,
      severity,
      issue_type: issueType,
      website_url: websiteUrl,
      figma_link: payload.figma?.figmaUrl,
      device_info: deviceInfo,
      browser_info: browserInfo,
      screen_resolution: this.sanitizeDimension(payload.metadata?.screenResolution),
      viewport_size: this.sanitizeDimension(payload.metadata?.viewportSize),
      images: images.length > 0 ? images : undefined,
      css_styles: payload.cssStyles,
      figma_link_data: this.buildFigmaLinkData(payload, websiteUrl),
      linear_enabled: payload.linearEnabled || false,
      linear_options: this.buildLinearOptions(payload.linearOptions)
    }

    return body
  }

  /**
   * Prepares image data for submission
   */
  private prepareImages(payload: IssueSubmissionPayload): BatchCreateImage[] {
    const images: BatchCreateImage[] = []

    if (payload.images?.clean) {
      images.push({
        data: payload.images.clean,
        type: "element",
        order_index: 0
      })
    }

    if (payload.images?.annotated) {
      images.push({
        data: payload.images.annotated,
        type: "main",
        order_index: 1
      })
    }

    return images
  }

  /**
   * Builds Figma link data if available
   */
  private buildFigmaLinkData(
    payload: IssueSubmissionPayload,
    websiteUrl?: string
  ): FigmaLinkData | undefined {
    if (!payload.figma?.fileId || !payload.figma?.frameId) {
      return undefined
    }

    return {
      figma_file_id: payload.figma.fileId,
      figma_frame_id: payload.figma.frameId,
      frame_name: payload.figma.frameName,
      frame_url: payload.figma.figmaUrl,
      thumbnail_url: payload.figma.thumbnailUrl,
      page_url: websiteUrl
    }
  }

  /**
   * Builds Linear options if available
   */
  private buildLinearOptions(
    options?: IssueSubmissionPayload["linearOptions"]
  ): LinearOptionsBody | undefined {
    if (!options) {
      return undefined
    }

    return {
      teamId: options.teams?.id,
      projectId: options.projects?.id,
      assigneeId: options.users?.id,
      stateId: options.workflowStates?.id
    }
  }

  /**
   * Sanitizes dimension values (e.g., "1920×1080" -> "1920x1080")
   */
  private sanitizeDimension(value?: string): string | undefined {
    if (!value || typeof value !== "string") {
      return undefined
    }

    return value
      .replace(/×/g, "x")
      .replace(/\s+/g, "")
      .replace(/px/gi, "")
      .replace(/[^0-9x]/g, "")
  }

  /**
   * Parses browser info from the payload
   */
  private parseBrowserInfo(
    browserInfo?: IssueSubmissionPayload["browserInfo"]
  ): BrowserInfo | undefined {
    if (!browserInfo) {
      return undefined
    }

    return {
      name: browserInfo.name || "Unknown",
      version: browserInfo.version || "Unknown",
      userAgent: browserInfo.userAgent
    }
  }
}

// =============================================================================
// Type Definitions
// =============================================================================

interface BatchCreateBody {
  workspace_id: string
  title: string
  description: string
  severity: string
  issue_type: string
  website_url?: string
  figma_link?: string
  device_info?: {
    device: string
    os: string
    version?: string
  }
  browser_info?: BrowserInfo
  screen_resolution?: string
  viewport_size?: string
  images?: BatchCreateImage[]
  css_styles?: Array<{
    property_name: string
    implemented_value?: string
    design_value?: string
  }>
  figma_link_data?: FigmaLinkData
  linear_enabled: boolean
  linear_options?: LinearOptionsBody
}

interface BatchCreateImage {
  data: string
  type: "element" | "main" | "figma"
  order_index: number
}

interface FigmaLinkData {
  figma_file_id: string
  figma_frame_id: string
  frame_name?: string
  frame_url?: string
  thumbnail_url?: string
  page_url?: string
}

interface LinearOptionsBody {
  teamId?: string
  projectId?: string
  assigneeId?: string
  stateId?: string
}

interface BrowserInfo {
  name: string
  version: string
  userAgent?: string
}
