/**
 * Linear Integration Service
 *
 * This service handles all Linear integration operations following the Single
 * Responsibility Principle (SRP). It manages Linear API calls, status checks,
 * issue creation, and preferences.
 *
 * Features:
 * - Linear connection status checking
 * - Issue creation with rich formatting
 * - Metadata fetching (teams, projects, users, workflow states)
 * - Preference management
 */

import { PIXZLO_WEB_URL } from "~lib/constants"
import { workspaceService } from "~lib/services/workspace-service"

import type {
  LinearCreateIssueRequest,
  LinearCreateIssueResponse,
  LinearOptionsResponse,
  LinearPreference,
  LinearPreferenceUpdateRequest,
  LinearStatusResponse,
  ServiceResult
} from "@/types/background"

// ============================================================================
// Linear Service Class
// ============================================================================

/**
 * LinearService handles all Linear integration operations.
 * Implements the Singleton pattern to ensure consistent state across the extension.
 */
class LinearService {
  private static instance: LinearService

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of LinearService
   */
  public static getInstance(): LinearService {
    if (!LinearService.instance) {
      LinearService.instance = new LinearService()
    }
    return LinearService.instance
  }

  /**
   * Check Linear integration connection status
   */
  public async checkStatus(): Promise<ServiceResult<LinearStatusResponse>> {
    try {
      // Get workspace ID first (Linear is now workspace-scoped)
      const workspaceResult = await workspaceService.requireWorkspaceId()
      if (!workspaceResult.success || !workspaceResult.data) {
        return {
          success: false,
          error: workspaceResult.error
        }
      }

      const workspaceId = workspaceResult.data

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

      if (response.status === 404) {
        // No integration found - normal case
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
   * Create a new Linear issue
   */
  public async createIssue(
    issueData: LinearCreateIssueRequest
  ): Promise<ServiceResult<LinearCreateIssueResponse>> {
    try {
      // Get workspace ID from storage - Linear is workspace-scoped
      const workspaceResult = await workspaceService.requireWorkspaceId()
      if (!workspaceResult.success || !workspaceResult.data) {
        return {
          success: false,
          error: workspaceResult.error
        }
      }

      const workspaceId = workspaceResult.data

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
          errorMessage = (errorData as { error?: string }).error ?? errorMessage
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
  public async fetchMetadata(): Promise<ServiceResult<LinearOptionsResponse>> {
    try {
      // Get workspace ID from storage - Linear is workspace-scoped
      const workspaceResult = await workspaceService.requireWorkspaceId()
      if (!workspaceResult.success || !workspaceResult.data) {
        return {
          success: false,
          error: workspaceResult.error
        }
      }

      const workspaceId = workspaceResult.data

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
          // Linear integration not connected - this is a normal state, not an error
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
          error:
            (errorData as { error?: string }).error ||
            "Failed to fetch Linear metadata"
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
  public async fetchPreference(): Promise<
    ServiceResult<{ preference?: LinearPreference }>
  > {
    try {
      // Get workspace ID from storage - Linear preferences are workspace-scoped
      const workspaceResult = await workspaceService.requireWorkspaceId()
      if (!workspaceResult.success || !workspaceResult.data) {
        return {
          success: false,
          error: workspaceResult.error
        }
      }

      const workspaceId = workspaceResult.data

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
          error:
            (errorData as { error?: string }).error ||
            "Failed to fetch Linear preference"
        }
      }

      const result = (await response.json()) as {
        preference?: LinearPreference
      }
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
  public async updatePreference(
    data: LinearPreferenceUpdateRequest
  ): Promise<ServiceResult<{ preference?: LinearPreference }>> {
    try {
      // Get workspace ID from storage - Linear preferences are workspace-scoped
      const workspaceResult = await workspaceService.requireWorkspaceId()
      if (!workspaceResult.success || !workspaceResult.data) {
        return {
          success: false,
          error: workspaceResult.error
        }
      }

      const workspaceId = workspaceResult.data

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
          error:
            (errorData as { error?: string }).error ||
            "Failed to update Linear preference"
        }
      }

      const result = (await response.json()) as {
        preference?: LinearPreference
      }
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
}

// ============================================================================
// Exported Singleton Instance
// ============================================================================

export const linearService = LinearService.getInstance()
