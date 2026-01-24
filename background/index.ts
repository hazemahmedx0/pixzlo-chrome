/**
 * Background Script Entry Point
 *
 * This module sets up all message handlers and listeners for the Chrome extension
 * service worker. It serves as the central routing point for all extension messages.
 *
 * Architecture:
 * - Types: Define message and response structures
 * - Services: Encapsulate business logic and API interactions
 * - Handlers: Process individual message types
 * - Utils: Helper functions and listeners
 */

import "~lib/console-silencer"

import {
  // Extension handlers
  handleGetPinnedState,
  handleOpenIntegrationsSettings,
  setupExtensionLifecycleHandlers,
  // Linear handlers
  handleLinearCheckStatus,
  handleLinearCreateIssue,
  handleLinearFetchMetadata,
  handleLinearFetchPreference,
  handleLinearUpdatePreference,
  // Figma handlers
  handleFigmaGetFile,
  handleFigmaRenderFrame,
  handleFigmaRenderElement,
  handleFigmaGetImage,
  handleFigmaOAuth,
  handleFigmaFetchPreference,
  handleFigmaUpdatePreference,
  handleFigmaFetchMetadata,
  handleFigmaCreateDesignLink,
  handleFigmaDeleteDesignLink,
  // Capture handlers
  handleCaptureScreen,
  handleCaptureElementScreenshot,
  handleFetchImageDataUrl,
  // API handlers
  handleApiCall,
  handleDummyApiCall,
  handleSubmitIssue,
  handleFetchPagesTree
} from "./handlers"
import { setupStorageListeners } from "./utils"

/**
 * Initialize extension lifecycle handlers.
 * Sets up install/uninstall event handlers.
 */
setupExtensionLifecycleHandlers()

/**
 * Initialize storage listeners.
 * Handles cache invalidation when workspace changes.
 */
setupStorageListeners()

/**
 * Main message handler.
 * Routes incoming messages to appropriate handler functions.
 *
 * Message handling follows a consistent pattern:
 * 1. Check message type
 * 2. Call the appropriate async handler
 * 3. Send response via sendResponse callback
 * 4. Return true to keep the message channel open for async responses
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Type assertion for message structure
  const msg = message as { type: string; [key: string]: unknown }

  // Extension state handlers
  if (msg.type === "GET_PINNED_STATE") {
    handleGetPinnedState()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  if (msg.type === "OPEN_INTEGRATIONS_SETTINGS") {
    handleOpenIntegrationsSettings()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to open settings"
        })
      })
    return true
  }

  // Linear integration handlers
  if (msg.type === "linear-check-status") {
    handleLinearCheckStatus()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  if (msg.type === "linear-create-issue") {
    handleLinearCreateIssue(msg.data as Parameters<typeof handleLinearCreateIssue>[0])
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  // Legacy alias for linear-fetch-metadata
  if (msg.type === "linear-fetch-options") {
    handleLinearFetchMetadata()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  if (msg.type === "linear-fetch-metadata") {
    handleLinearFetchMetadata()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  if (msg.type === "linear-fetch-preference") {
    handleLinearFetchPreference()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  if (msg.type === "linear-update-preference") {
    handleLinearUpdatePreference(msg.data as Parameters<typeof handleLinearUpdatePreference>[0])
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  // Figma integration handlers
  if (msg.type === "FIGMA_API_CALL") {
    if ((msg as { method?: string }).method === "GET_FILE") {
      handleFigmaGetFile(msg.fileId as string)
        .then(sendResponse)
        .catch((error) => {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch Figma file"
          })
        })
      return true
    }
  }

  if (msg.type === "FIGMA_RENDER_FRAME") {
    handleFigmaRenderFrame(msg.figmaUrl as string)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to render Figma frame"
        })
      })
    return true
  }

  if (msg.type === "FIGMA_RENDER_ELEMENT") {
    handleFigmaRenderElement(msg.fileId as string, msg.nodeId as string)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to render element"
        })
      })
    return true
  }

  if (msg.type === "FIGMA_GET_IMAGE") {
    handleFigmaGetImage(msg.fileId as string, msg.nodeId as string)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch image"
        })
      })
    return true
  }

  if (msg.type === "FIGMA_OAUTH") {
    // OAuth handler uses callback-style response due to window management
    const messageData = msg.data as { workspaceId?: string } | undefined
    handleFigmaOAuth(messageData?.workspaceId, sendResponse)
    return true
  }

  if (msg.type === "figma-fetch-preference") {
    handleFigmaFetchPreference(msg.data as { websiteUrl: string })
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  if (msg.type === "figma-update-preference") {
    handleFigmaUpdatePreference(msg.data as Parameters<typeof handleFigmaUpdatePreference>[0])
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  if (msg.type === "figma-fetch-metadata") {
    handleFigmaFetchMetadata(msg.data as Parameters<typeof handleFigmaFetchMetadata>[0])
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  if (msg.type === "figma-create-design-link") {
    handleFigmaCreateDesignLink(msg.data as Parameters<typeof handleFigmaCreateDesignLink>[0])
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  if (msg.type === "figma-delete-design-link") {
    handleFigmaDeleteDesignLink(msg.data as Parameters<typeof handleFigmaDeleteDesignLink>[0])
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  // Capture handlers
  if (msg.type === "capture-screen") {
    handleCaptureScreen(sender.tab?.windowId)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Capture failed"
        })
      })
    return true
  }

  if (msg.type === "CAPTURE_ELEMENT_SCREENSHOT") {
    handleCaptureElementScreenshot(msg.area as Parameters<typeof handleCaptureElementScreenshot>[0])
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Capture failed"
        })
      })
    return true
  }

  if (msg.type === "FETCH_IMAGE_DATA_URL") {
    handleFetchImageDataUrl(msg.url as string)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  // API handlers
  if (msg.type === "API_CALL") {
    const options = msg.options as Parameters<typeof handleApiCall>[1]
    handleApiCall(msg.endpoint as string, options)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Network error"
        })
      })
    return true
  }

  if (msg.type === "dummy-api-call") {
    handleDummyApiCall()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Network error"
        })
      })
    return true
  }

  if (msg.type === "SUBMIT_ISSUE") {
    handleSubmitIssue(msg.payload as Parameters<typeof handleSubmitIssue>[0])
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Submit failed"
        })
      })
    return true
  }

  if (msg.type === "FETCH_PAGES_TREE") {
    handleFetchPagesTree()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch pages tree"
        })
      })
    return true
  }

  // Message type not recognized - don't keep channel open
  return false
})
