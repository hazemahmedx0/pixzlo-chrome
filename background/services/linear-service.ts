/**
 * Linear Integration Service
 * Handles all Linear API operations including status checks, metadata fetching,
 * issue creation, and preference management.
 *
 * Follows Single Responsibility Principle - only handles Linear integration.
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import type {
  ApiResponse,
  LinearCreateIssueResponse,
  LinearOptionsResponse,
  LinearStatusResponse
} from "../types/messages"
import { apiClient } from "../utils/api-client"
import { Cache } from "../utils/cache"

// Cache for Linear metadata
const metadataCache = new Cache<LinearOptionsResponse>(5 * 60 * 1000)

/**
 * Service class for Linear integration operations
 */
export class LinearService {
  private static instance: LinearService

  static getInstance(): LinearService {
    if (!LinearService.instance) {
      LinearService.instance = new LinearService()
    }
    return LinearService.instance
  }

  /**
   * Checks Linear integration status
   */
  async checkStatus(): Promise<ApiResponse<LinearStatusResponse>> {
    console.log("📡 Checking Linear status...")

    const response = await apiClient.get<LinearStatusResponse>(
      "/api/integrations/linear/status"
    )

    if (response.success) {
      // Handle 404 as not connected (no integration found)
      if (!response.data) {
        return { success: true, data: { connected: false } }
      }
      console.log("✅ Linear status checked")
    }

    return response
  }

  /**
   * Fetches Linear metadata (teams, projects, users, workflow states, preference)
   */
  async fetchMetadata(): Promise<ApiResponse<LinearOptionsResponse>> {
    console.log("📡 Fetching Linear metadata...")

    // Check cache first
    const cached = metadataCache.get("metadata")
    if (cached) {
      console.log("📋 Using cached Linear metadata")
      return { success: true, data: cached }
    }

    const response = await apiClient.get<{ data?: LinearOptionsResponse }>(
      "/api/integrations/linear/metadata"
    )

    if (response.success && response.data) {
      const metadata = (response.data as any).data || response.data
      metadataCache.set("metadata", metadata)
      console.log("✅ Linear metadata fetched")
      return { success: true, data: metadata }
    }

    return response as ApiResponse<LinearOptionsResponse>
  }

  /**
   * Creates a Linear issue
   */
  async createIssue(issueData: {
    title: string
    description: string
    priority?: number
    linearOptions?: {
      teamId?: string
      projectId?: string
      assigneeId?: string
      stateId?: string
    }
  }): Promise<ApiResponse<LinearCreateIssueResponse>> {
    console.log("📡 Creating Linear issue...")
    console.log("📝 Issue data:", issueData)

    const response = await apiClient.post<LinearCreateIssueResponse>(
      "/api/integrations/linear/create-issue",
      issueData
    )

    if (response.success) {
      console.log("✅ Linear issue created")
    }

    return response
  }

  /**
   * Fetches Linear preference (last used team/project)
   */
  async fetchPreference(): Promise<
    ApiResponse<{
      id: string
      lastUsedTeamId?: string
      lastUsedTeamName?: string
      lastUsedProjectId?: string
      lastUsedProjectName?: string
      updatedAt: string
    }>
  > {
    console.log("🎯 Fetching Linear preference")

    const response = await apiClient.get<{
      preference?: {
        id: string
        lastUsedTeamId?: string
        lastUsedTeamName?: string
        lastUsedProjectId?: string
        lastUsedProjectName?: string
        updatedAt: string
      }
    }>("/api/integrations/linear/preferences")

    if (response.success && response.data) {
      console.log("✅ Linear preference fetched")
      return {
        success: true,
        data: (response.data as any).preference
      }
    }

    return response as any
  }

  /**
   * Updates Linear preference
   */
  async updatePreference(data: {
    teamId?: string
    teamName?: string
    projectId?: string
    projectName?: string
  }): Promise<
    ApiResponse<{
      id: string
      lastUsedTeamId?: string
      lastUsedTeamName?: string
      lastUsedProjectId?: string
      lastUsedProjectName?: string
      updatedAt: string
    }>
  > {
    console.log("🎯 Updating Linear preference:", data)

    const response = await apiClient.post<{
      preference?: {
        id: string
        lastUsedTeamId?: string
        lastUsedTeamName?: string
        lastUsedProjectId?: string
        lastUsedProjectName?: string
        updatedAt: string
      }
    }>("/api/integrations/linear/preferences", data)

    if (response.success && response.data) {
      console.log("✅ Linear preference updated")
      return {
        success: true,
        data: (response.data as any).preference
      }
    }

    return response as any
  }

  /**
   * Clears the metadata cache
   */
  clearCache(): void {
    metadataCache.clear()
  }
}

// Export singleton instance
export const linearService = LinearService.getInstance()

// Utility functions

/**
 * Converts severity string to Linear priority number
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
 * Builds rich Linear description with markdown formatting
 */
export function buildLinearDescription(
  payload: {
    description?: string
    figma?: { figmaUrl?: string }
    metadata?: {
      browser?: string
      device?: string
      screenResolution?: string
      viewportSize?: string
    }
    cssStyles?: Array<{
      property_name: string
      implemented_value?: string
      design_value?: string
    }>
  },
  websiteUrl: string,
  issueId: string,
  imageUrls?: { element?: string; figma?: string; main?: string }
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
      sections.push(`- **Figma:** [View Design](${payload.figma!.figmaUrl})`)
    }

    if (hasWebsiteLink) {
      sections.push(`- **Website:** [View Page](${websiteUrl})`)
    }

    const issueLink = `${PIXZLO_WEB_URL}/issues/${issueId}`
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
