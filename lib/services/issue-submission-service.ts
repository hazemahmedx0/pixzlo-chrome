/**
 * Issue Submission Service
 *
 * This service handles all issue submission operations following the Single
 * Responsibility Principle (SRP). It manages issue creation with images,
 * Figma links, and Linear integration.
 *
 * Features:
 * - Issue creation with batch upload
 * - Image processing and upload
 * - Figma image fetching
 * - Linear issue creation integration
 */

import { PIXZLO_WEB_URL } from "~lib/constants"
import { workspaceService } from "~lib/services/workspace-service"

import type {
  BrowserInfo,
  IssueSubmissionPayload,
  IssueSubmissionResult,
  ServiceResult
} from "@/types/background"

// ============================================================================
// Types
// ============================================================================

interface BatchCreateBody {
  workspace_id: string
  title: string
  description: string
  severity: string
  issue_type: string
  website_url: string | undefined
  figma_link: string | undefined
  device_info:
    | {
        device: string
        os: string
        version: string | undefined
      }
    | undefined
  browser_info: BrowserInfo | undefined
  screen_resolution: string | undefined
  viewport_size: string | undefined
  images:
    | Array<{
        data: string
        type: string
        order_index: number
      }>
    | undefined
  css_styles: unknown[] | undefined
  figma_link_data:
    | {
        figma_file_id: string
        figma_frame_id: string
        frame_name: string | undefined
        frame_url: string | undefined
        thumbnail_url: string | undefined
        page_url: string | undefined
      }
    | undefined
  linear_enabled: boolean
  linear_options:
    | {
        teamId: string | undefined
        projectId: string | undefined
        assigneeId: string | undefined
        stateId: string | undefined
      }
    | undefined
}

interface ImageData {
  data: string
  type: string
  order_index: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sanitize dimension string (e.g., "1920x1080px" -> "1920x1080")
 */
function sanitizeDimension(value: unknown): string | undefined {
  if (!value || typeof value !== "string") {
    return undefined
  }
  return value
    .replace(/\u00d7/g, "x") // Replace multiplication sign with x
    .replace(/\s+/g, "")
    .replace(/px/gi, "")
    .replace(/[^0-9x]/g, "")
}

/**
 * Parse browser info from payload
 */
function parseBrowserInfo(browserInfo: unknown): BrowserInfo | undefined {
  if (!browserInfo || typeof browserInfo !== "object") {
    return undefined
  }
  const info = browserInfo as Record<string, unknown>
  return {
    name: (info.name as string) || "Unknown",
    version: (info.version as string) || "Unknown",
    userAgent: info.userAgent as string | undefined
  }
}

/**
 * Fetch image as base64 data URL
 */
async function fetchImageAsBase64(imageUrl: string): Promise<string | undefined> {
  try {
    const response = await fetch(imageUrl, { cache: "no-store" })
    if (!response.ok) {
      return undefined
    }
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(undefined)
      reader.readAsDataURL(blob)
    })
  } catch {
    return undefined
  }
}

// ============================================================================
// Issue Submission Service Class
// ============================================================================

/**
 * IssueSubmissionService handles all issue submission operations.
 * Implements the Singleton pattern to ensure consistent state across the extension.
 */
class IssueSubmissionService {
  private static instance: IssueSubmissionService

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of IssueSubmissionService
   */
  public static getInstance(): IssueSubmissionService {
    if (!IssueSubmissionService.instance) {
      IssueSubmissionService.instance = new IssueSubmissionService()
    }
    return IssueSubmissionService.instance
  }

  /**
   * Submit an issue with all related data
   */
  public async submitIssue(
    payload: IssueSubmissionPayload
  ): Promise<ServiceResult<IssueSubmissionResult>> {
    try {
      // Get workspace ID - MUST respect the user's selected workspace
      const workspaceResult = await workspaceService.requireWorkspaceId()
      if (!workspaceResult.success || !workspaceResult.data) {
        return {
          success: false,
          error: workspaceResult.error
        }
      }

      const workspaceId = workspaceResult.data

      // Prepare data
      const websiteUrl = payload.metadata?.url
      const title = (payload.title || "Untitled issue").slice(0, 200)
      const description = payload.description || ""
      const hasDesign = Boolean(payload.figma?.figmaUrl)
      const issueType = hasDesign
        ? "screenshot_with_design"
        : payload.issue_type ||
          (payload.isElementCapture ? "comparison" : "screenshot")
      const severity = payload.priority || "medium"

      // Prepare images array
      const images = await this.prepareImages(payload)

      // Prepare device info
      const deviceInfo = payload.metadata?.device
        ? {
            device: payload.metadata.device,
            os: "unknown",
            version: undefined
          }
        : undefined

      // Prepare Figma link data
      const figmaLinkData =
        payload.figma?.fileId && payload.figma?.frameId
          ? {
              figma_file_id: payload.figma.fileId,
              figma_frame_id: payload.figma.frameId,
              frame_name: payload.figma.frameName,
              frame_url: payload.figma.figmaUrl,
              thumbnail_url: payload.figma.thumbnailUrl,
              page_url: websiteUrl
            }
          : undefined

      // Prepare Linear options
      const linearOptions = payload.linearOptions
        ? {
            teamId: payload.linearOptions.teams?.id,
            projectId: payload.linearOptions.projects?.id,
            assigneeId: payload.linearOptions.users?.id,
            stateId: payload.linearOptions.workflowStates?.id
          }
        : undefined

      // Build batch create body
      const batchBody: BatchCreateBody = {
        workspace_id: workspaceId,
        title,
        description,
        severity,
        issue_type: issueType,
        website_url: websiteUrl,
        figma_link: payload.figma?.figmaUrl,
        device_info: deviceInfo,
        browser_info: parseBrowserInfo(payload.browserInfo),
        screen_resolution: sanitizeDimension(payload.metadata?.screenResolution),
        viewport_size: sanitizeDimension(payload.metadata?.viewportSize),
        images: images.length > 0 ? images : undefined,
        css_styles: payload.cssStyles || undefined,
        figma_link_data: figmaLinkData,
        linear_enabled: payload.linearEnabled || false,
        linear_options: linearOptions
      }

      // Make the batch create API call
      const response = await fetch(
        `${PIXZLO_WEB_URL}/api/issues/batch-create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(batchBody)
        }
      )

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(
          `Batch create failed: ${response.status} ${(err as { error?: string }).error || ""}`
        )
      }

      const result = (await response.json()) as {
        data?: { issueId: string; issueUrl?: string }
      }
      const issueId = result.data?.issueId
      const issueUrl = result.data?.issueUrl

      if (!issueId) {
        throw new Error("No issue ID returned from batch create")
      }

      return {
        success: true,
        data: { issueId, issueUrl }
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Submit failed"
      }
    }
  }

  /**
   * Prepare images for upload
   */
  private async prepareImages(
    payload: IssueSubmissionPayload
  ): Promise<ImageData[]> {
    const images: ImageData[] = []

    // Add element screenshot (clean)
    if (payload.images?.clean) {
      images.push({
        data: payload.images.clean,
        type: "element",
        order_index: 0
      })
    }

    // Add annotated screenshot
    if (payload.images?.annotated) {
      images.push({
        data: payload.images.annotated,
        type: "main",
        order_index: 1
      })
    }

    // Add Figma image if available
    if (payload.figma?.imageUrl) {
      const base64 = await fetchImageAsBase64(payload.figma.imageUrl)
      if (base64) {
        images.push({
          data: base64,
          type: "figma",
          order_index: 2
        })
      }
    }

    return images
  }
}

// ============================================================================
// Exported Singleton Instance
// ============================================================================

export const issueSubmissionService = IssueSubmissionService.getInstance()
