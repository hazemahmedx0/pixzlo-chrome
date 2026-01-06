/**
 * Issue Submission Service
 * Handles end-to-end issue creation including image uploads and Linear integration.
 *
 * Follows Single Responsibility Principle - only handles issue submission.
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import type { ApiResponse, IssuePayload } from "../types/messages"
import { apiClient } from "../utils/api-client"

/**
 * Service class for issue submission operations
 */
export class IssueSubmissionService {
  private static instance: IssueSubmissionService

  static getInstance(): IssueSubmissionService {
    if (!IssueSubmissionService.instance) {
      IssueSubmissionService.instance = new IssueSubmissionService()
    }
    return IssueSubmissionService.instance
  }

  /**
   * Submits an issue using the batch create endpoint
   */
  async submitIssue(
    payload: IssuePayload
  ): Promise<ApiResponse<{ issueId: string; issueUrl: string }>> {
    console.log("📡 Using batch create endpoint for issue creation...")

    try {
      // Get workspace ID from profile
      const workspaceId = await this.getWorkspaceId()

      // Prepare batch request body
      const batchBody = await this.prepareBatchBody(payload, workspaceId)

      console.log("📤 Sending batch create request...")

      // Single batch create call
      const response = await apiClient.post<{
        data?: { issueId: string; issueUrl: string }
      }>("/api/issues/batch-create", batchBody)

      if (!response.success || !response.data) {
        throw new Error(response.error || "Batch create failed")
      }

      const data = (response.data as any).data || response.data
      const issueId = data.issueId
      const issueUrl = data.issueUrl

      if (!issueId) {
        throw new Error("No issue ID returned from batch create")
      }

      console.log("✅ Issue created successfully:", issueUrl)
      return { success: true, data: { issueId, issueUrl } }
    } catch (error) {
      console.error("❌ Issue submission error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Submit failed"
      }
    }
  }

  /**
   * Gets the user's workspace ID from their profile
   */
  private async getWorkspaceId(): Promise<string> {
    const response = await fetch(`${PIXZLO_WEB_URL}/api/user/profile`, {
      method: "GET",
      credentials: "include"
    })

    if (!response.ok) {
      throw new Error(`Failed to load profile: ${response.status}`)
    }

    const profileData = await response.json()
    const workspaces = profileData?.profile?.workspaces || []

    if (!Array.isArray(workspaces) || workspaces.length === 0) {
      throw new Error("No workspace found for user")
    }

    const workspaceId =
      workspaces[0]?.id || workspaces[0]?.workspace_id || workspaces[0]

    if (!workspaceId) {
      throw new Error("Workspace ID missing")
    }

    return workspaceId
  }

  /**
   * Prepares the batch create request body
   */
  private async prepareBatchBody(
    payload: IssuePayload,
    workspaceId: string
  ): Promise<Record<string, unknown>> {
    const websiteUrl = payload?.metadata?.url
    const title = (payload.title || "Untitled issue").slice(0, 200)
    const description = payload.description || ""
    const hasDesign = !!payload?.figma?.figmaUrl
    const issueType = hasDesign
      ? "screenshot_with_design"
      : payload.issue_type ||
        (payload?.isElementCapture ? "comparison" : "screenshot")
    const severity = payload.priority || "medium"

    // Prepare images array
    const images = await this.prepareImages(payload)

    return {
      workspace_id: workspaceId,
      title,
      description,
      severity,
      issue_type: issueType,
      website_url: websiteUrl,
      figma_link: payload?.figma?.figmaUrl,
      device_info: payload?.metadata?.device,
      browser_info: this.parseBrowserInfo(payload?.browserInfo),
      screen_resolution: this.sanitizeDimension(payload?.metadata?.screenResolution),
      viewport_size: this.sanitizeDimension(payload?.metadata?.viewportSize),
      images: images.length > 0 ? images : undefined,
      css_styles: payload?.cssStyles || undefined,
      figma_link_data: this.prepareFigmaLinkData(payload),
      linear_enabled: payload?.linearEnabled || false,
      linear_options: this.prepareLinearOptions(payload)
    }
  }

  /**
   * Prepares images array for batch create
   */
  private async prepareImages(
    payload: IssuePayload
  ): Promise<Array<{ data: string; type: string; order_index: number }>> {
    const images: Array<{ data: string; type: string; order_index: number }> = []

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

    // Add Figma image if available
    if (payload?.figma?.imageUrl) {
      try {
        const base64 = await this.fetchImageAsBase64(payload.figma.imageUrl)
        if (base64) {
          images.push({
            data: base64,
            type: "figma",
            order_index: 2
          })
        }
      } catch (e) {
        console.warn("Failed to fetch Figma image:", e)
      }
    }

    return images
  }

  /**
   * Fetches an image URL and converts to base64
   */
  private async fetchImageAsBase64(imageUrl: string): Promise<string | null> {
    try {
      const response = await fetch(imageUrl, { cache: "no-store" })
      if (!response.ok) return null

      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  /**
   * Sanitizes dimension strings (e.g., "1920×1080" -> "1920x1080")
   */
  private sanitizeDimension(value?: string): string | undefined {
    if (!value || typeof value !== "string") return undefined
    return value
      .replace(/×/g, "x")
      .replace(/\s+/g, "")
      .replace(/px/gi, "")
      .replace(/[^0-9x]/g, "")
  }

  /**
   * Parses browser info object into a string
   */
  private parseBrowserInfo(browserInfo?: {
    name?: string
    version?: string
  }): string | undefined {
    if (!browserInfo) return undefined
    const name = browserInfo.name || "Unknown"
    const version = browserInfo.version || "Unknown"
    return `${name} ${version}`
  }

  /**
   * Prepares Figma link data for batch create
   */
  private prepareFigmaLinkData(
    payload: IssuePayload
  ): Record<string, unknown> | undefined {
    if (!payload?.figma?.fileId || !payload?.figma?.frameId) {
      return undefined
    }

    return {
      figma_file_id: payload.figma.fileId,
      figma_frame_id: payload.figma.frameId,
      frame_name: payload.figma.frameName,
      frame_url: payload.figma.figmaUrl,
      thumbnail_url: payload.figma.thumbnailUrl
    }
  }

  /**
   * Prepares Linear options for batch create
   */
  private prepareLinearOptions(
    payload: IssuePayload
  ): Record<string, unknown> | undefined {
    if (!payload?.linearOptions) return undefined

    return {
      teamId: payload.linearOptions.teams?.id,
      projectId: payload.linearOptions.projects?.id,
      assigneeId: payload.linearOptions.users?.id,
      stateId: payload.linearOptions.workflowStates?.id
    }
  }
}

// Export singleton instance
export const issueSubmissionService = IssueSubmissionService.getInstance()
