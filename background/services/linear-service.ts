/**
 * Linear Service
 *
 * Handles all Linear integration operations including status checks,
 * issue creation, metadata fetching, and preference management.
 * All operations are workspace-scoped to support multi-workspace environments.
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import type {
  ApiResponse,
  LinearCreateIssueResponse,
  LinearOptionsResponse,
  LinearPreference,
  LinearStatusResponse
} from "../types"
import { WorkspaceService } from "./workspace-service"

/**
 * Issue data structure for creating Linear issues
 */
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
 * Linear preference update data
 */
export interface LinearPreferenceUpdate {
  teamId?: string
  teamName?: string
  projectId?: string
  projectName?: string
}

/**
 * Service class for Linear integration operations.
 * Uses static methods for service worker compatibility.
 */
export class LinearService {
  /**
   * Checks the status of the Linear integration for the current workspace.
   * Returns connection status and integration details if connected.
   */
  static async checkStatus(): Promise<ApiResponse<LinearStatusResponse>> {
    try {
      const workspaceId = await WorkspaceService.getUserActiveWorkspaceId()
      if (!workspaceId) {
        return {
          success: false,
          error:
            "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      const response = await fetch(
        `${PIXZLO_WEB_URL}/api/integrations/linear/status?workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include"
        }
      )

      // Handle different response statuses
      if (response.status === 404) {
        // No integration found - normal case, not an error
        return {
          success: true,
          data: { connected: false }
        }
      }

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use Linear integration"
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = (await response.json()) as LinearStatusResponse

      return {
        success: true,
        data
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check Linear status"
      }
    }
  }

  /**
   * Creates a new issue in Linear with the provided data.
   * Automatically associates the issue with the current workspace.
   */
  static async createIssue(
    issueData: LinearIssueData
  ): Promise<ApiResponse<LinearCreateIssueResponse>> {
    try {
      const workspaceId = await WorkspaceService.getUserActiveWorkspaceId()
      if (!workspaceId) {
        return {
          success: false,
          error:
            "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      const response = await fetch(
        `${PIXZLO_WEB_URL}/api/integrations/linear/create-issue`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ ...issueData, workspaceId })
        }
      )

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error ?? errorMessage
        } catch {
          // Failed to parse error response, use default message
        }
        throw new Error(errorMessage)
      }

      const data = (await response.json()) as LinearCreateIssueResponse

      return {
        success: true,
        data
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Linear issue"
      }
    }
  }

  /**
   * Fetches Linear metadata including teams, projects, users, and workflow states.
   * Also returns the user's preference for default selections.
   */
  static async fetchMetadata(): Promise<ApiResponse<LinearOptionsResponse>> {
    try {
      const workspaceId = await WorkspaceService.getUserActiveWorkspaceId()
      if (!workspaceId) {
        return {
          success: false,
          error:
            "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      const response = await fetch(
        `${PIXZLO_WEB_URL}/api/integrations/linear/metadata?workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include"
        }
      )

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }))

        if (response.status === 401) {
          return {
            success: false,
            error: "Please log in to Pixzlo to use this feature."
          }
        }

        if (response.status === 404) {
          // Linear integration not connected - return empty data, not an error
          return {
            success: true,
            data: {
              teams: [],
              projects: [],
              users: [],
              workflowStates: [],
              preference: undefined
            }
          }
        }

        return {
          success: false,
          error: errorData.error || "Failed to fetch Linear metadata"
        }
      }

      const result = (await response.json()) as {
        success: boolean
        data?: LinearOptionsResponse
        error?: string
      }

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || "Failed to fetch Linear metadata"
        }
      }

      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Linear metadata"
      }
    }
  }

  /**
   * Fetches the user's Linear preferences for the current workspace.
   * Preferences include last used team, project, etc.
   */
  static async fetchPreference(): Promise<
    ApiResponse<{ preference?: LinearPreference }>
  > {
    try {
      const workspaceId = await WorkspaceService.getUserActiveWorkspaceId()
      if (!workspaceId) {
        return {
          success: false,
          error:
            "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      const response = await fetch(
        `${PIXZLO_WEB_URL}/api/integrations/linear/preferences?workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          method: "GET",
          credentials: "include"
        }
      )

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }))

        if (response.status === 401) {
          return {
            success: false,
            error: "Please log in to Pixzlo to use this feature."
          }
        }

        return {
          success: false,
          error: errorData.error || "Failed to fetch Linear preference"
        }
      }

      const result = await response.json()

      return {
        success: true,
        preference: result.preference
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Linear preference"
      }
    }
  }

  /**
   * Updates the user's Linear preferences for the current workspace.
   * Used to persist user's team/project selections for future use.
   */
  static async updatePreference(
    data: LinearPreferenceUpdate
  ): Promise<ApiResponse<{ preference?: LinearPreference }>> {
    try {
      const workspaceId = await WorkspaceService.getUserActiveWorkspaceId()
      if (!workspaceId) {
        return {
          success: false,
          error:
            "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      const response = await fetch(
        `${PIXZLO_WEB_URL}/api/integrations/linear/preferences`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ ...data, workspaceId })
        }
      )

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }))

        if (response.status === 401) {
          return {
            success: false,
            error: "Please log in to Pixzlo to use this feature."
          }
        }

        return {
          success: false,
          error: errorData.error || "Failed to update Linear preference"
        }
      }

      const result = await response.json()

      return {
        success: true,
        preference: result.preference
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update Linear preference"
      }
    }
  }

  /**
   * Converts a severity string to Linear's numeric priority value.
   * Linear uses: 1 = Urgent, 2 = High, 3 = Medium, 4 = Low
   */
  static getPriorityNumber(severity: string): number {
    const priorityMap: Record<string, number> = {
      urgent: 1,
      high: 2,
      medium: 3,
      low: 4
    }
    return priorityMap[severity] || 3
  }

  /**
   * Builds a rich markdown description for Linear issues.
   * Includes screenshots, style comparisons, links, and technical details.
   */
  static buildDescription(
    payload: {
      description?: string
      cssStyles?: Array<{
        property_name: string
        implemented_value?: string
        design_value?: string
      }>
      figma?: { figmaUrl?: string }
      metadata?: {
        browser?: string
        device?: string
        screenResolution?: string
        viewportSize?: string
      }
    },
    websiteUrl: string,
    issueId: string,
    imageUrls?: { element?: string; figma?: string; main?: string },
    workspaceSlug?: string
  ): string {
    const sections: string[] = []

    // Description section
    if (payload.description) {
      sections.push("## Description")
      sections.push(payload.description)
      sections.push("")
    }

    // Screenshots section with table layout
    if (imageUrls && (imageUrls.element || imageUrls.figma || imageUrls.main)) {
      sections.push("## Screenshots")
      sections.push("")

      // Build table header
      const headers: string[] = []
      const images: string[] = []

      if (imageUrls.element) {
        headers.push("Selected Element")
        images.push(`![Element](${imageUrls.element})`)
      }

      if (imageUrls.figma) {
        headers.push("Figma Design")
        images.push(`![Figma](${imageUrls.figma})`)
      }

      if (imageUrls.main) {
        headers.push("With Highlights")
        images.push(`![Highlighted](${imageUrls.main})`)
      }

      // Create markdown table with images side by side
      sections.push(`| ${headers.join(" | ")} |`)
      sections.push(`| ${headers.map(() => "---").join(" | ")} |`)
      sections.push(`| ${images.join(" | ")} |`)
      sections.push("")
    }

    // Style Comparison section
    if (
      payload?.cssStyles &&
      Array.isArray(payload.cssStyles) &&
      payload.cssStyles.length > 0
    ) {
      sections.push("## Style Comparison")
      sections.push("")
      sections.push("| Property | Implemented | Design | Match |")
      sections.push("|----------|-------------|--------|-------|")

      payload.cssStyles.forEach((prop) => {
        const implemented = prop.implemented_value || "N/A"
        const design = prop.design_value || "undefined"
        const match =
          prop.design_value && prop.implemented_value === prop.design_value
            ? "check"
            : "x"

        sections.push(
          `| ${prop.property_name} | ${implemented} | ${design} | ${match} |`
        )
      })

      sections.push("")
    }

    // Links section
    const hasFigmaLink = payload?.figma?.figmaUrl
    const hasWebsiteLink = websiteUrl

    if (hasFigmaLink || hasWebsiteLink) {
      sections.push("## Links")
      sections.push("")

      if (hasFigmaLink) {
        sections.push(`- **Figma:** [View Design](${payload.figma?.figmaUrl})`)
      }

      if (hasWebsiteLink) {
        sections.push(`- **Website:** [View Page](${websiteUrl})`)
      }

      const issueLink = workspaceSlug
        ? `${PIXZLO_WEB_URL}/${workspaceSlug}/issues/${issueId}`
        : `${PIXZLO_WEB_URL}/issues/${issueId}`
      sections.push(`- **Pixzlo Issue:** [View Details](${issueLink})`)

      sections.push("")
    }

    // Technical Details section
    const metadata = payload?.metadata
    if (metadata) {
      const hasMetadata =
        metadata.browser ||
        metadata.device ||
        metadata.screenResolution ||
        metadata.viewportSize

      if (hasMetadata) {
        sections.push("## Technical Details")
        sections.push("")

        if (metadata.browser) {
          sections.push(`- **Browser:** ${metadata.browser}`)
        }

        if (metadata.device) {
          sections.push(`- **Device:** ${metadata.device}`)
        }

        if (metadata.screenResolution) {
          sections.push(`- **Screen Resolution:** ${metadata.screenResolution}`)
        }

        if (metadata.viewportSize) {
          sections.push(`- **Viewport:** ${metadata.viewportSize}`)
        }

        sections.push("")
      }
    }

    return sections.join("\n")
  }
}
