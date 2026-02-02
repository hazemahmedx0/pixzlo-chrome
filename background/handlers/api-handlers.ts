/**
 * API Handlers
 *
 * Message handlers for generic API calls and miscellaneous operations.
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import { IssueService, WorkspaceService } from "../services"
import type { IssueSubmissionPayload } from "../types"

/**
 * Handles the API_CALL message.
 * Makes a generic API call to the Pixzlo backend.
 */
export async function handleApiCall(
  endpoint: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: string
  }
): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  try {
    const url = `${PIXZLO_WEB_URL}${endpoint}`

    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      body: options.body,
      credentials: "include"
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status} ${response.statusText}`
      }))
      return {
        success: false,
        error: (errorData as { error?: string }).error || `HTTP ${response.status}`
      }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error"
    }
  }
}

/**
 * Handles the dummy-api-call message.
 * Makes a test API call to verify connectivity.
 */
export async function handleDummyApiCall(): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts/1")
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error"
    }
  }
}

/**
 * Handles the SUBMIT_ISSUE message.
 * Submits an issue to the Pixzlo backend with all associated data.
 */
export async function handleSubmitIssue(
  payload: IssueSubmissionPayload
): Promise<{
  success: boolean
  data?: { issueId: string; issueUrl?: string }
  error?: string
}> {
  return IssueService.submitIssue(payload)
}

/**
 * Handles the FETCH_PAGES_TREE message.
 * Fetches the pages tree for hierarchical page selection.
 */
export async function handleFetchPagesTree(): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  try {
    const workspaceId = await WorkspaceService.getUserActiveWorkspaceId()

    // Build URL with workspace context
    let url = `${PIXZLO_WEB_URL}/api/websites/tree`
    if (workspaceId) {
      url += `?workspace_id=${encodeURIComponent(workspaceId)}`
    }

    const response = await fetch(url, {
      method: "GET",
      credentials: "include"
    })

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to access pages."
        }
      }

      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error:
          (errorData as { error?: string }).error ||
          `Failed to fetch pages (${response.status})`
      }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch pages tree"
    }
  }
}
