/**
 * Issue Service
 *
 * Handles end-to-end issue submission to the Pixzlo backend.
 * Manages image preparation, payload construction, and batch creation.
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import type { ApiResponse, IssueSubmissionPayload, IssueSubmissionResponse } from "../types"
import { WorkspaceService } from "./workspace-service"

/**
 * Image data structure for issue submission
 */
interface IssueImage {
  data: string
  type: "element" | "main" | "figma"
  order_index: number
}

/**
 * Browser info structure
 */
interface BrowserInfo {
  name: string
  version: string
  userAgent?: string
}

/**
 * Service class for issue submission operations.
 * Handles the complete flow of creating issues with screenshots and metadata.
 */
export class IssueService {
  /**
   * Sanitizes dimension strings for consistent storage.
   * Removes special characters and normalizes format.
   *
   * @param value - Raw dimension string (e.g., "1920 × 1080px")
   * @returns Cleaned dimension string (e.g., "1920x1080")
   */
  private static sanitizeDimension(value: string | undefined): string | undefined {
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
   * Parses browser info from raw data into structured format.
   */
  private static parseBrowserInfo(
    browserInfo: { name?: string; version?: string; userAgent?: string } | undefined
  ): BrowserInfo | undefined {
    if (!browserInfo) {
      return undefined
    }
    return {
      name: browserInfo.name || "Unknown",
      version: browserInfo.version || "Unknown",
      userAgent: browserInfo.userAgent || undefined
    }
  }

  /**
   * Fetches a Figma image URL and converts it to base64 data URL.
   * Used to embed Figma screenshots in issue submissions.
   */
  private static async fetchFigmaImageAsBase64(imageUrl: string): Promise<string | undefined> {
    try {
      const response = await fetch(imageUrl, { cache: "no-store" })
      if (!response.ok) {
        return undefined
      }

      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = (): void => {
          resolve(reader.result as string)
        }
        reader.onerror = (): void => {
          resolve(undefined)
        }
        reader.readAsDataURL(blob)
      })
    } catch {
      return undefined
    }
  }

  /**
   * Submits an issue to the Pixzlo backend with all associated data.
   * Handles image preparation, payload construction, and the batch create API call.
   *
   * @param payload - Issue submission payload with all metadata and images
   * @returns Promise resolving to submission response with issue ID and URL
   */
  static async submitIssue(
    payload: IssueSubmissionPayload
  ): Promise<ApiResponse<IssueSubmissionResponse["data"]>> {
    try {
      // Get workspace ID - MUST respect the user's selected workspace
      const workspaceId = await WorkspaceService.getUserActiveWorkspaceId()
      if (!workspaceId) {
        return {
          success: false,
          error:
            "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      // Prepare basic issue data
      const websiteUrl = payload?.metadata?.url
      const title = (payload.title || "Untitled issue").slice(0, 200)
      const description = payload.description || ""
      const hasDesign = !!payload?.figma?.figmaUrl

      // Determine issue type based on available data
      const issueType = hasDesign
        ? "screenshot_with_design"
        : payload.issue_type ||
          (payload?.isElementCapture ? "comparison" : "screenshot")

      const severity = payload.priority || "medium"

      // Prepare images array with correct ordering
      const images: IssueImage[] = []

      if (payload?.images?.clean) {
        images.push({
          data: payload.images.clean,
          type: "element",
          order_index: 0
        })
      }

      if (payload?.images?.annotated) {
        images.push({
          data: payload.images.annotated,
          type: "main",
          order_index: 1
        })
      }

      // Fetch and add Figma image if available
      if (payload?.figma?.imageUrl) {
        const figmaBase64 = await this.fetchFigmaImageAsBase64(payload.figma.imageUrl)
        if (figmaBase64) {
          images.push({
            data: figmaBase64,
            type: "figma",
            order_index: 2
          })
        }
      }

      // Prepare device info
      const deviceInfo = payload?.metadata?.device
        ? {
            device: payload.metadata.device,
            os: "unknown",
            version: undefined
          }
        : undefined

      // Construct batch create request body
      const batchBody = {
        workspace_id: workspaceId,
        title,
        description,
        severity,
        issue_type: issueType,
        website_url: websiteUrl,
        figma_link: payload?.figma?.figmaUrl,
        device_info: deviceInfo,
        browser_info: this.parseBrowserInfo(payload?.browserInfo),
        screen_resolution: this.sanitizeDimension(payload?.metadata?.screenResolution),
        viewport_size: this.sanitizeDimension(payload?.metadata?.viewportSize),
        images: images.length > 0 ? images : undefined,
        css_styles: payload?.cssStyles || undefined,
        figma_link_data:
          payload?.figma?.fileId && payload?.figma?.frameId
            ? {
                figma_file_id: payload.figma.fileId,
                figma_frame_id: payload.figma.frameId,
                frame_name: payload.figma.frameName,
                frame_url: payload.figma.figmaUrl,
                thumbnail_url: payload.figma.thumbnailUrl,
                page_url: websiteUrl
              }
            : undefined,
        linear_enabled: payload?.linearEnabled || false,
        linear_options: payload?.linearOptions
          ? {
              teamId: payload.linearOptions.teams?.id,
              projectId: payload.linearOptions.projects?.id,
              assigneeId: payload.linearOptions.users?.id,
              stateId: payload.linearOptions.workflowStates?.id
            }
          : undefined
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
        const errorMessage = (err as { error?: string }).error || ""
        throw new Error(
          `Batch create failed: ${response.status} ${errorMessage}`
        )
      }

      const batchResult = (await response.json()) as {
        data?: { issueId?: string; issueUrl?: string }
      }
      const issueId = batchResult?.data?.issueId
      const issueUrl = batchResult?.data?.issueUrl

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
}
