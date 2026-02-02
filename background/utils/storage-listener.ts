/**
 * Storage Listener
 *
 * Sets up listeners for Chrome storage changes.
 * Handles cache invalidation when workspace changes.
 */

import { clearTokenCache } from "~lib/figma-direct-api"

import { FigmaService, WORKSPACE_STORAGE_KEY } from "../services"

/**
 * Sets up the workspace change listener.
 * When the user selects a different workspace, we need to:
 * 1. Clear the Figma token cache (tokens are workspace-scoped)
 * 2. Clear the Figma metadata cache
 *
 * This ensures that subsequent requests use the correct workspace context.
 */
export function setupStorageListeners(): void {
  if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes[WORKSPACE_STORAGE_KEY]) {
        // Workspace changed => clear workspace-scoped caches
        // This prevents using a token from the previous workspace
        clearTokenCache()
        FigmaService.clearCaches()
      }
    })
  }
}
