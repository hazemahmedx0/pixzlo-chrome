/**
 * Linear Integration Service
 *
 * Handles all Linear API operations including status checks, issue creation,
 * metadata fetching, and preference management.
 *
 * Implements Single Responsibility Principle by focusing solely on Linear operations.
 */

import type {
  ILinearService,
  IWorkspaceService,
  LinearCreateIssueRequest,
  LinearCreateIssueResponse,
  LinearOptionsResponse,
  LinearPreferenceResponse,
  LinearPreferenceUpdateRequest,
  LinearStatusResponse,
  ServiceResponse
} from "./interfaces"

/**
 * Linear Service Implementation
 */
export class LinearService implements ILinearService {
  readonly serviceName = "LinearService"

  private readonly apiBaseUrl: string
  private readonly workspaceService: IWorkspaceService

  constructor(apiBaseUrl: string, workspaceService: IWorkspaceService) {
    this.apiBaseUrl = apiBaseUrl
    this.workspaceService = workspaceService
  }

  /**
   * Checks the Linear integration status for the current workspace
   */
  async checkStatus(): Promise<ServiceResponse<LinearStatusResponse>> {
    try {
      const workspaceId = await this.workspaceService.getUserActiveWorkspaceId()

      if (!workspaceId) {
        return {
          success: false,
          error: "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      console.log(`[${this.serviceName}] Checking Linear status for workspace:`, workspaceId)

      const response = await fetch(
        `${this.apiBaseUrl}/api/integrations/linear/status?workspaceId=${encodeURIComponent(workspaceId)}`,
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

      return {
        success: true,
        data
      }
    } catch (error) {
      console.error(`[${this.serviceName}] Status check error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to check Linear status"
      }
    }
  }

  /**
   * Creates a new issue in Linear
   */
  async createIssue(
    issueData: LinearCreateIssueRequest
  ): Promise<ServiceResponse<LinearCreateIssueResponse>> {
    try {
      const workspaceId = await this.workspaceService.getUserActiveWorkspaceId()

      if (!workspaceId) {
        return {
          success: false,
          error: "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      console.log(`[${this.serviceName}] Creating Linear issue for workspace:`, workspaceId)

      const response = await fetch(
        `${this.apiBaseUrl}/api/integrations/linear/create-issue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...issueData, workspaceId })
        }
      )

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response)
        throw new Error(errorData)
      }

      const data = (await response.json()) as LinearCreateIssueResponse

      return {
        success: true,
        data
      }
    } catch (error) {
      console.error(`[${this.serviceName}] Issue creation error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create Linear issue"
      }
    }
  }

  /**
   * Fetches Linear metadata (teams, projects, users, workflow states, preference)
   */
  async fetchMetadata(): Promise<ServiceResponse<LinearOptionsResponse>> {
    try {
      const workspaceId = await this.workspaceService.getUserActiveWorkspaceId()

      if (!workspaceId) {
        return {
          success: false,
          error: "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      console.log(`[${this.serviceName}] Fetching Linear metadata for workspace:`, workspaceId)

      const response = await fetch(
        `${this.apiBaseUrl}/api/integrations/linear/metadata?workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include"
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error: "Please log in to Pixzlo to use this feature."
          }
        }

        if (response.status === 404) {
          // Linear integration not connected - return empty data
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

        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        return {
          success: false,
          error: (errorData as { error?: string }).error || "Failed to fetch Linear metadata"
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

      console.log(`[${this.serviceName}] Linear metadata fetched successfully`)

      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error(`[${this.serviceName}] Metadata fetch error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Linear metadata"
      }
    }
  }

  /**
   * Fetches Linear preference for the current workspace
   */
  async fetchPreference(): Promise<ServiceResponse<LinearPreferenceResponse>> {
    try {
      const workspaceId = await this.workspaceService.getUserActiveWorkspaceId()

      if (!workspaceId) {
        return {
          success: false,
          error: "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      console.log(`[${this.serviceName}] Fetching Linear preference for workspace:`, workspaceId)

      const response = await fetch(
        `${this.apiBaseUrl}/api/integrations/linear/preferences?workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          method: "GET",
          credentials: "include"
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error: "Please log in to Pixzlo to use this feature."
          }
        }

        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        return {
          success: false,
          error: (errorData as { error?: string }).error || "Failed to fetch Linear preference"
        }
      }

      const result = (await response.json()) as { preference?: LinearPreferenceResponse }

      console.log(`[${this.serviceName}] Linear preference fetched successfully`)

      return {
        success: true,
        data: result.preference
      }
    } catch (error) {
      console.error(`[${this.serviceName}] Preference fetch error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Linear preference"
      }
    }
  }

  /**
   * Updates Linear preference for the current workspace
   */
  async updatePreference(
    data: LinearPreferenceUpdateRequest
  ): Promise<ServiceResponse<LinearPreferenceResponse>> {
    try {
      const workspaceId = await this.workspaceService.getUserActiveWorkspaceId()

      if (!workspaceId) {
        return {
          success: false,
          error: "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      console.log(`[${this.serviceName}] Updating Linear preference for workspace:`, workspaceId)

      const response = await fetch(
        `${this.apiBaseUrl}/api/integrations/linear/preferences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...data, workspaceId })
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error: "Please log in to Pixzlo to use this feature."
          }
        }

        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        return {
          success: false,
          error: (errorData as { error?: string }).error || "Failed to update Linear preference"
        }
      }

      const result = (await response.json()) as { preference?: LinearPreferenceResponse }

      console.log(`[${this.serviceName}] Linear preference updated successfully`)

      return {
        success: true,
        data: result.preference
      }
    } catch (error) {
      console.error(`[${this.serviceName}] Preference update error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update Linear preference"
      }
    }
  }

  /**
   * Parses error response from the API
   */
  private async parseErrorResponse(response: Response): Promise<string> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`

    try {
      const errorData = await response.json()
      errorMessage = (errorData as { error?: string }).error ?? errorMessage
    } catch {
      try {
        const textError = await response.text()
        if (textError) {
          errorMessage = textError
        }
      } catch {
        // Keep the original error message
      }
    }

    return errorMessage
  }
}

/**
 * Helper function to convert severity to Linear priority number
 */
export function severityToPriority(severity: string): number {
  const priorityMap: Record<string, number> = {
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4
  }
  return priorityMap[severity] ?? 3
}

/**
 * Builds a rich Linear description with markdown formatting
 */
export function buildLinearDescription(
  payload: {
    description?: string
    figma?: { figmaUrl?: string }
    cssStyles?: Array<{
      property_name: string
      implemented_value?: string
      design_value?: string
    }>
    metadata?: {
      browser?: string
      device?: string
      screenResolution?: string
      viewportSize?: string
    }
    browserInfo?: {
      name?: string
      version?: string
      userAgent?: string
    }
  },
  websiteUrl: string,
  issueId: string,
  imageUrls?: { element?: string; figma?: string; main?: string },
  workspaceSlug?: string,
  pixzloWebUrl?: string
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
  if (payload.cssStyles && payload.cssStyles.length > 0) {
    sections.push("## Style Comparison")
    sections.push("")
    sections.push("| Property | Implemented | Design | Match |")
    sections.push("|----------|-------------|--------|-------|")

    for (const prop of payload.cssStyles) {
      const implemented = prop.implemented_value || "N/A"
      const design = prop.design_value || "undefined"
      const match =
        prop.design_value && prop.implemented_value === prop.design_value ? "✅" : "❌"

      sections.push(`| ${prop.property_name} | ${implemented} | ${design} | ${match} |`)
    }

    sections.push("")
  }

  // Links section
  const hasFigmaLink = payload.figma?.figmaUrl
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

    const baseUrl = pixzloWebUrl ?? "https://app.pixzlo.com"
    const issueLink = workspaceSlug
      ? `${baseUrl}/${workspaceSlug}/issues/${issueId}`
      : `${baseUrl}/issues/${issueId}`
    sections.push(`- **Pixzlo Issue:** [View Details](${issueLink})`)

    sections.push("")
  }

  // Technical Details section
  const metadata = payload.metadata
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
