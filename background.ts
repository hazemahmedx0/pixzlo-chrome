/**
 * Pixzlo Extension Background Script
 *
 * This is the main entry point for the Plasmo browser extension's background script.
 * It follows SOLID principles by delegating functionality to specialized services:
 *
 * - Single Responsibility: Each service handles one concern
 * - Open/Closed: Message handlers can be added without modifying core code
 * - Liskov Substitution: Services implement consistent interfaces
 * - Interface Segregation: Services expose only what's needed
 * - Dependency Inversion: High-level code depends on abstractions (services)
 *
 * Architecture:
 * - Services: workspace, linear, figma, issue submission, screenshot
 * - Message Handler Registry: Centralized message routing
 * - Type Safety: Full TypeScript types for all messages and responses
 */

import "~lib/console-silencer"

import { PIXZLO_WEB_URL } from "~lib/constants"
import {
  EXTENSION_GOODBYE_URL,
  EXTENSION_WELCOME_URL
} from "~lib/constants"
import { clearTokenCache } from "~lib/figma-direct-api"
import { messageHandlerRegistry } from "~lib/message-handler"
import {
  figmaBackgroundService,
  parseFigmaUrl
} from "~lib/services/figma-background-service"
import { issueSubmissionService } from "~lib/services/issue-submission-service"
import { linearService } from "~lib/services/linear-service"
import { screenshotService } from "~lib/services/screenshot-service"
import {
  WORKSPACE_STORAGE_KEY,
  workspaceService
} from "~lib/services/workspace-service"

import type {
  BackgroundMessage,
  FigmaDesignLinkCreateRequest,
  FigmaPreferenceUpdateRequest,
  IssueSubmissionPayload,
  LinearCreateIssueRequest,
  LinearPreferenceUpdateRequest,
  MessageResponse,
  ScreenshotArea
} from "@/types/background"

// ============================================================================
// Extension Install/Uninstall Handlers
// ============================================================================

/**
 * Handle extension installation events
 * - On fresh install: Open the welcome page
 * - On update: Could show changelog (optional)
 */
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

// ============================================================================
// Extension Pinned State Handler
// ============================================================================

/**
 * Check if the extension is pinned to the toolbar.
 * Uses chrome.action.getUserSettings() API (Chrome 91+).
 */
async function checkExtensionPinnedState(): Promise<boolean> {
  try {
    const settings = await chrome.action.getUserSettings()
    return settings.isOnToolbar
  } catch {
    return false
  }
}

// ============================================================================
// Message Handler Registration
// ============================================================================

/**
 * Register all message handlers using the registry pattern.
 * This follows the Open/Closed Principle - new handlers can be added
 * without modifying existing code.
 */
function registerMessageHandlers(): void {
  // -------------------------------------------------------------------------
  // Extension State Handlers
  // -------------------------------------------------------------------------

  messageHandlerRegistry.register(
    "GET_PINNED_STATE",
    async (): Promise<MessageResponse<{ isPinned: boolean }>> => {
      const isPinned = await checkExtensionPinnedState()
      return { success: true, data: { isPinned } }
    },
    "Check if extension is pinned to toolbar"
  )

  messageHandlerRegistry.register(
    "OPEN_INTEGRATIONS_SETTINGS",
    async (): Promise<MessageResponse<{ url: string }>> => {
      const workspaceSlug = await workspaceService.getSelectedWorkspaceSlug()
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

      return { success: true, data: { url } }
    },
    "Open integrations settings page"
  )

  // -------------------------------------------------------------------------
  // Linear Integration Handlers
  // -------------------------------------------------------------------------

  messageHandlerRegistry.register(
    "linear-check-status",
    async (): Promise<MessageResponse> => {
      return linearService.checkStatus()
    },
    "Check Linear integration status"
  )

  messageHandlerRegistry.register(
    "linear-create-issue",
    async (message): Promise<MessageResponse> => {
      const data = message.data as LinearCreateIssueRequest
      return linearService.createIssue(data)
    },
    "Create Linear issue"
  )

  messageHandlerRegistry.register(
    "linear-fetch-options",
    async (): Promise<MessageResponse> => {
      return linearService.fetchMetadata()
    },
    "Fetch Linear options (legacy alias)"
  )

  messageHandlerRegistry.register(
    "linear-fetch-metadata",
    async (): Promise<MessageResponse> => {
      return linearService.fetchMetadata()
    },
    "Fetch Linear metadata"
  )

  messageHandlerRegistry.register(
    "linear-fetch-preference",
    async (): Promise<MessageResponse> => {
      return linearService.fetchPreference()
    },
    "Fetch Linear preference"
  )

  messageHandlerRegistry.register(
    "linear-update-preference",
    async (message): Promise<MessageResponse> => {
      const data = message.data as LinearPreferenceUpdateRequest
      return linearService.updatePreference(data)
    },
    "Update Linear preference"
  )

  // -------------------------------------------------------------------------
  // Figma Integration Handlers
  // -------------------------------------------------------------------------

  messageHandlerRegistry.register(
    "figma-fetch-metadata",
    async (message): Promise<MessageResponse> => {
      const data = (message.data || {}) as {
        websiteUrl?: string
        force?: boolean
        workspaceId?: string
      }
      return figmaBackgroundService.fetchMetadata(data)
    },
    "Fetch Figma metadata"
  )

  messageHandlerRegistry.register(
    "figma-fetch-preference",
    async (message): Promise<MessageResponse> => {
      const data = message.data as { websiteUrl: string }
      return figmaBackgroundService.fetchPreference(data)
    },
    "Fetch Figma preference"
  )

  messageHandlerRegistry.register(
    "figma-update-preference",
    async (message): Promise<MessageResponse> => {
      const data = message.data as FigmaPreferenceUpdateRequest
      return figmaBackgroundService.updatePreference(data)
    },
    "Update Figma preference"
  )

  messageHandlerRegistry.register(
    "figma-create-design-link",
    async (message): Promise<MessageResponse> => {
      const data = message.data as FigmaDesignLinkCreateRequest
      return figmaBackgroundService.createDesignLink(data)
    },
    "Create Figma design link"
  )

  messageHandlerRegistry.register(
    "figma-delete-design-link",
    async (message): Promise<MessageResponse> => {
      const data = message.data as { websiteUrl?: string; linkId: string }
      return figmaBackgroundService.deleteDesignLink(data)
    },
    "Delete Figma design link"
  )

  messageHandlerRegistry.register(
    "FIGMA_API_CALL",
    async (message): Promise<MessageResponse> => {
      if (message.method === "GET_FILE" && message.fileId) {
        return figmaBackgroundService.fetchFile(message.fileId)
      }
      return { success: false, error: "Unknown FIGMA_API_CALL method" }
    },
    "Figma API call handler"
  )

  messageHandlerRegistry.register(
    "FIGMA_RENDER_FRAME",
    async (message): Promise<MessageResponse> => {
      if (!message.figmaUrl) {
        return { success: false, error: "Missing figmaUrl" }
      }
      return figmaBackgroundService.renderFrame(message.figmaUrl)
    },
    "Render Figma frame"
  )

  messageHandlerRegistry.register(
    "FIGMA_RENDER_ELEMENT",
    async (message): Promise<MessageResponse> => {
      if (!message.fileId || !message.nodeId) {
        return { success: false, error: "Missing fileId or nodeId" }
      }
      return figmaBackgroundService.renderElement(message.fileId, message.nodeId)
    },
    "Render Figma element"
  )

  messageHandlerRegistry.register(
    "FIGMA_GET_IMAGE",
    async (message): Promise<MessageResponse> => {
      if (!message.fileId || !message.nodeId) {
        return { success: false, error: "Missing fileId or nodeId" }
      }
      return figmaBackgroundService.getImage(message.fileId, message.nodeId)
    },
    "Get Figma image"
  )

  messageHandlerRegistry.register(
    "FIGMA_OAUTH",
    async (message): Promise<MessageResponse> => {
      const workspaceId = (message.data as { workspaceId?: string })?.workspaceId
      return figmaBackgroundService.handleOAuth(workspaceId)
    },
    "Handle Figma OAuth"
  )

  // -------------------------------------------------------------------------
  // Screenshot Handlers
  // -------------------------------------------------------------------------

  messageHandlerRegistry.register(
    "capture-screen",
    async (
      _message,
      sender
    ): Promise<MessageResponse<{ dataUrl: string }>> => {
      if (!sender.tab?.windowId) {
        return {
          success: false,
          error: "Capture denied: no active tab context"
        }
      }
      return screenshotService.captureScreen(sender.tab.windowId)
    },
    "Capture visible tab"
  )

  messageHandlerRegistry.register(
    "CAPTURE_ELEMENT_SCREENSHOT",
    async (message): Promise<MessageResponse> => {
      const area = message.area as ScreenshotArea
      const result = await screenshotService.captureElementScreenshot(area)
      return result
    },
    "Capture element screenshot"
  )

  messageHandlerRegistry.register(
    "FETCH_IMAGE_DATA_URL",
    async (message): Promise<MessageResponse<{ dataUrl: string }>> => {
      if (!message.url) {
        return { success: false, error: "Missing URL" }
      }
      return screenshotService.fetchImageAsDataUrl(message.url)
    },
    "Fetch image as data URL"
  )

  // -------------------------------------------------------------------------
  // Issue Submission Handler
  // -------------------------------------------------------------------------

  messageHandlerRegistry.register(
    "SUBMIT_ISSUE",
    async (message): Promise<MessageResponse> => {
      const payload = (message.payload || {}) as IssueSubmissionPayload
      return issueSubmissionService.submitIssue(payload)
    },
    "Submit issue"
  )

  // -------------------------------------------------------------------------
  // Pages Tree Handler
  // -------------------------------------------------------------------------

  messageHandlerRegistry.register(
    "FETCH_PAGES_TREE",
    async (): Promise<MessageResponse> => {
      try {
        // Get workspace ID from storage - pages are workspace-scoped
        const workspaceId = await workspaceService.getActiveWorkspaceId()

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
            error instanceof Error
              ? error.message
              : "Failed to fetch pages tree"
        }
      }
    },
    "Fetch pages tree"
  )

  // -------------------------------------------------------------------------
  // Generic API Call Handler
  // -------------------------------------------------------------------------

  messageHandlerRegistry.register(
    "API_CALL",
    async (message): Promise<MessageResponse> => {
      const { endpoint, options } = message as BackgroundMessage & {
        endpoint: string
        options: {
          method?: string
          headers?: Record<string, string>
          body?: string
        }
      }

      if (!endpoint) {
        return { success: false, error: "Missing endpoint" }
      }

      const url = `${PIXZLO_WEB_URL}${endpoint}`

      try {
        const response = await fetch(url, {
          method: options?.method || "GET",
          headers: {
            "Content-Type": "application/json",
            ...options?.headers
          },
          body: options?.body,
          credentials: "include"
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: `HTTP ${response.status} ${response.statusText}`
          }))
          return {
            success: false,
            error:
              (errorData as { error?: string }).error ||
              `HTTP ${response.status}`
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
    },
    "Generic API call"
  )

  // -------------------------------------------------------------------------
  // Debug/Test Handler
  // -------------------------------------------------------------------------

  messageHandlerRegistry.register(
    "dummy-api-call",
    async (): Promise<MessageResponse> => {
      try {
        const response = await fetch(
          "https://jsonplaceholder.typicode.com/posts/1"
        )
        const data = await response.json()
        return { success: true, data }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }
    },
    "Dummy API call for testing"
  )
}

// ============================================================================
// Initialize Message Handlers
// ============================================================================

// Register all handlers
registerMessageHandlers()

// Create and attach the message listener
chrome.runtime.onMessage.addListener(messageHandlerRegistry.createListener())

// ============================================================================
// Workspace Change Listener
// ============================================================================

/**
 * Listen for workspace changes in storage.
 * When the workspace changes, clear all workspace-scoped caches.
 */
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[WORKSPACE_STORAGE_KEY]) {
      // Workspace changed => clear workspace-scoped caches/tokens
      clearTokenCache()
      figmaBackgroundService.clearCaches()
      workspaceService.clearProfileCache()
    }
  })
}

// ============================================================================
// Exports (for testing/debugging)
// ============================================================================

export {
  checkExtensionPinnedState,
  parseFigmaUrl
}
