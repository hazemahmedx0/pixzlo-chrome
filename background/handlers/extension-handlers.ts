/**
 * Extension Handlers
 *
 * Handles extension lifecycle events and general extension state queries.
 * Includes install/uninstall handlers and pinned state checks.
 */

import {
  EXTENSION_GOODBYE_URL,
  EXTENSION_WELCOME_URL,
  PIXZLO_WEB_URL
} from "~lib/constants"

import { WorkspaceService } from "../services"

/**
 * Checks if the extension is pinned to the browser toolbar.
 * Uses chrome.action.getUserSettings() API (Chrome 91+).
 *
 * @returns Promise resolving to whether the extension is pinned
 */
export async function checkExtensionPinnedState(): Promise<boolean> {
  try {
    const settings = await chrome.action.getUserSettings()
    return settings.isOnToolbar
  } catch {
    return false
  }
}

/**
 * Handles the GET_PINNED_STATE message.
 * Returns the current pinned state of the extension.
 */
export async function handleGetPinnedState(): Promise<{
  success: boolean
  isPinned?: boolean
  error?: string
}> {
  try {
    const isPinned = await checkExtensionPinnedState()
    return { success: true, isPinned }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}

/**
 * Handles the OPEN_INTEGRATIONS_SETTINGS message.
 * Opens the integrations settings page in a new tab.
 */
export async function handleOpenIntegrationsSettings(): Promise<{
  success: boolean
  url?: string
  error?: string
}> {
  try {
    const workspaceSlug = await WorkspaceService.getSelectedWorkspaceSlug()
    const url = workspaceSlug
      ? `${PIXZLO_WEB_URL}/${workspaceSlug}/settings/integrations`
      : `${PIXZLO_WEB_URL}/settings/integrations`

    await new Promise<void>((resolve, reject) => {
      chrome.tabs.create({ url }, () => {
        const lastError = chrome.runtime.lastError
        if (lastError) {
          reject(new Error(lastError.message))
          return
        }
        resolve()
      })
    })

    return { success: true, url }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to open settings"
    }
  }
}

/**
 * Sets up extension install/uninstall handlers.
 * - On install: Opens the welcome page
 * - On uninstall: Redirects to the goodbye page
 */
export function setupExtensionLifecycleHandlers(): void {
  chrome.runtime.onInstalled.addListener((details): void => {
    // Set the uninstall URL (works for all install reasons)
    try {
      chrome.runtime.setUninstallURL(EXTENSION_GOODBYE_URL, () => {
        // Silently ignore errors
      })
    } catch {
      // Failed to set uninstall URL
    }

    if (details.reason === "install") {
      // Fresh installation - open welcome page
      try {
        chrome.tabs.create({ url: EXTENSION_WELCOME_URL }, () => {
          // Silently ignore errors
        })
      } catch {
        // Failed to open welcome page
      }
    }
  })
}
