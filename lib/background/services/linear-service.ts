/**
 * Linear Service
 *
 * Handles all Linear integration operations including:
 * - Status checking
 * - Issue creation
 * - Metadata fetching
 * - Preference management
 *
 * Follows Single Responsibility Principle by handling only Linear-related concerns.
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import type {
  LinearCreateIssueResponse,
  LinearIssueData,
  LinearOptionsResponse,
  LinearPreference,
  LinearStatusResponse,
  MessageResponse
} from "../types"
import { getUserActiveWorkspaceId } from "./workspace-service"

/**
 * Check Linear integration status
 */
export async function checkLinearStatus(): Promise<
  MessageResponse<LinearStatusResponse>
> {
  try {
    const workspaceId = await getUserActiveWorkspaceId()
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
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      }
    )

    if (response.status === 404) {
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
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to check Linear status"
    }
  }
}

/**
 * Create a Linear issue
 */
export async function createLinearIssue(
  issueData: LinearIssueData
): Promise<MessageResponse<LinearCreateIssueResponse>> {
  try {
    const workspaceId = await getUserActiveWorkspaceId()
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
        headers: { "Content-Type": "application/json" },
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
        // Failed to parse error response
      }
      throw new Error(errorMessage)
    }

    const data = (await response.json()) as LinearCreateIssueResponse
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create Linear issue"
    }
  }
}

/**
 * Fetch Linear metadata (teams, projects, users, workflow states, preference)
 */
export async function fetchLinearMetadata(): Promise<
  MessageResponse<LinearOptionsResponse>
> {
  try {
    const workspaceId = await getUserActiveWorkspaceId()
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
        // Linear integration not connected - this is a normal state
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

    return { success: true, data: result.data }
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
 * Fetch Linear preference
 */
export async function fetchLinearPreference(): Promise<
  MessageResponse<{ preference?: LinearPreference }>
> {
  try {
    const workspaceId = await getUserActiveWorkspaceId()
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
    return { success: true, data: { preference: result.preference } }
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
 * Update Linear preference
 */
export async function updateLinearPreference(data: {
  teamId?: string
  teamName?: string
  projectId?: string
  projectName?: string
}): Promise<MessageResponse<{ preference?: LinearPreference }>> {
  try {
    const workspaceId = await getUserActiveWorkspaceId()
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
        headers: { "Content-Type": "application/json" },
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
    return { success: true, data: { preference: result.preference } }
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
 * Convert severity to Linear priority number
 */
export function getPriorityNumber(severity: string): number {
  const priorityMap: Record<string, number> = {
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4
  }
  return priorityMap[severity] || 3
}

/**
 * Build rich Linear description with markdown
 */
export function buildLinearDescription(
  payload: {
    description?: string
    cssStyles?: Array<{
      property_name: string
      implemented_value: string
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

    sections.push(`| ${headers.join(" | ")} |`)
    sections.push(`| ${headers.map(() => "---").join(" | ")} |`)
    sections.push(`| ${images.join(" | ")} |`)
    sections.push("")
  }

  // Style Comparison section
  if (payload?.cssStyles?.length) {
    sections.push("## Style Comparison")
    sections.push("")
    sections.push("| Property | Implemented | Design | Match |")
    sections.push("|----------|-------------|--------|-------|")

    payload.cssStyles.forEach((prop) => {
      const implemented = prop.implemented_value || "N/A"
      const design = prop.design_value || "undefined"
      const match =
        prop.design_value && prop.implemented_value === prop.design_value
          ? "✅"
          : "❌"

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
