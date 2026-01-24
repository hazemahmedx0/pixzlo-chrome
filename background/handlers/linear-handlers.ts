/**
 * Linear Handlers
 *
 * Message handlers for all Linear integration operations.
 * Delegates to LinearService for business logic.
 */

import { LinearService } from "../services"
import type { LinearIssueData, LinearPreferenceUpdate } from "../services"

/**
 * Handles the linear-check-status message.
 * Checks if Linear is connected for the current workspace.
 */
export async function handleLinearCheckStatus(): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  return LinearService.checkStatus()
}

/**
 * Handles the linear-create-issue message.
 * Creates a new issue in Linear with the provided data.
 */
export async function handleLinearCreateIssue(
  issueData: LinearIssueData
): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  return LinearService.createIssue(issueData)
}

/**
 * Handles the linear-fetch-options and linear-fetch-metadata messages.
 * Fetches Linear teams, projects, users, and workflow states.
 */
export async function handleLinearFetchMetadata(): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  return LinearService.fetchMetadata()
}

/**
 * Handles the linear-fetch-preference message.
 * Fetches the user's saved Linear preferences.
 */
export async function handleLinearFetchPreference(): Promise<{
  success: boolean
  preference?: unknown
  error?: string
}> {
  return LinearService.fetchPreference()
}

/**
 * Handles the linear-update-preference message.
 * Updates the user's Linear preferences.
 */
export async function handleLinearUpdatePreference(
  data: LinearPreferenceUpdate
): Promise<{
  success: boolean
  preference?: unknown
  error?: string
}> {
  return LinearService.updatePreference(data)
}
