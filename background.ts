/**
 * Chrome Extension Background Script
 *
 * This is the main entry point for the background service worker.
 * It has been refactored to follow SOLID principles:
 *
 * - Single Responsibility: Message handling delegated to services
 * - Open/Closed: New message types can be added without modifying this file
 * - Dependency Inversion: Uses service abstractions via container
 *
 * Architecture:
 * - ServiceContainer: Manages service dependencies
 * - MessageHandlerService: Routes messages to appropriate services
 * - Individual Services: Handle specific domains (Linear, Figma, etc.)
 */

import "~lib/console-silencer"

import {
  EXTENSION_GOODBYE_URL,
  EXTENSION_WELCOME_URL
} from "~lib/constants"
import {
  getMessageHandlerService,
  getServiceContainer,
  WORKSPACE_STORAGE_KEY
} from "~lib/services"
import { FigmaApiService } from "~lib/services/figma-api-service"

// =============================================================================
// Extension Install/Uninstall Handlers
// =============================================================================

/**
 * Handle extension installation events
 * - On fresh install: Open the welcome page
 * - On update: Could show changelog (optional)
 */
chrome.runtime.onInstalled.addListener((details): void => {
  // Set the uninstall URL (works for all install reasons)
  try {
    chrome.runtime.setUninstallURL(EXTENSION_GOODBYE_URL, () => {
      const lastError = chrome.runtime.lastError
      if (lastError) {
        console.error("[Pixzlo] Failed to set uninstall URL:", lastError)
      }
    })
  } catch (error) {
    console.error("[Pixzlo] Failed to set uninstall URL:", error)
  }

  if (details.reason === "install") {
    // Fresh installation - open welcome page
    console.log("[Pixzlo] Extension installed, opening welcome page")
    try {
      chrome.tabs.create({ url: EXTENSION_WELCOME_URL }, () => {
        const lastError = chrome.runtime.lastError
        if (lastError) {
          console.error("[Pixzlo] Failed to open welcome page:", lastError)
        }
      })
    } catch (error) {
      console.error("[Pixzlo] Failed to open welcome page:", error)
    }
  } else if (details.reason === "update") {
    // Extension updated - could show changelog if needed
    console.log(
      "[Pixzlo] Extension updated from version:",
      details.previousVersion
    )
  }
})

// =============================================================================
// Message Handler Setup
// =============================================================================

/**
 * Main message listener that delegates to the MessageHandlerService
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("🔧 Background received message:", message)

  const messageHandlerService = getMessageHandlerService()
  return messageHandlerService.handleMessage(message, sender, sendResponse)
})

// =============================================================================
// Workspace Change Listener
// =============================================================================

/**
 * Listen for workspace changes in storage to clear cached data
 */
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[WORKSPACE_STORAGE_KEY]) {
      const oldValue = changes[WORKSPACE_STORAGE_KEY].oldValue as
        | string
        | undefined
      const newValue = changes[WORKSPACE_STORAGE_KEY].newValue as
        | string
        | undefined

      console.log(
        `[Background] 🔄 Workspace changed in storage: ${oldValue} → ${newValue}`
      )

      // Clear workspace-scoped caches
      const container = getServiceContainer()
      const figmaService = container.figmaService

      if (figmaService instanceof FigmaApiService) {
        figmaService.clearAllCaches()
      }
    }
  })
}
