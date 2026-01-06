/**
 * Message Handler
 * Routes messages from content scripts to appropriate service handlers.
 * Follows Open-Closed Principle - new message types can be added without modifying this file.
 */

import type { ApiResponse, BackgroundMessage } from "../types/messages"
import { figmaBackgroundService } from "../services/figma-service"
import { issueSubmissionService } from "../services/issue-service"
import { linearService } from "../services/linear-service"
import { oauthService } from "../services/oauth-service"
import { screenshotService } from "../services/screenshot-service"
import { apiClient } from "../utils/api-client"

/**
 * Async message handler function type
 */
type AsyncMessageHandler = (
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ApiResponse<unknown>) => void
) => Promise<void>

/**
 * Wraps an async handler to properly work with Chrome message API
 * Chrome requires returning true synchronously to keep the message port open
 */
function wrapAsyncHandler(handler: AsyncMessageHandler): (
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ApiResponse<unknown>) => void
) => true {
  return (message, sender, sendResponse) => {
    handler(message, sender, sendResponse).catch((error) => {
      console.error("Handler error:", error)
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    })
    return true
  }
}

/**
 * Registry of message handlers by message type
 */
const messageHandlers: Record<string, (
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ApiResponse<unknown>) => void
) => boolean | void> = {
  // Linear handlers
  "linear-check-status": wrapAsyncHandler(async (message, sender, sendResponse) => {
    const result = await linearService.checkStatus()
    sendResponse(result)
  }),

  "linear-create-issue": wrapAsyncHandler(async (message, sender, sendResponse) => {
    const data = (message as any).data
    const result = await linearService.createIssue(data)
    sendResponse(result)
  }),

  "linear-fetch-options": wrapAsyncHandler(async (message, sender, sendResponse) => {
    const result = await linearService.fetchMetadata()
    sendResponse(result)
  }),

  "linear-fetch-metadata": wrapAsyncHandler(async (message, sender, sendResponse) => {
    const result = await linearService.fetchMetadata()
    sendResponse(result)
  }),

  "linear-fetch-preference": wrapAsyncHandler(async (message, sender, sendResponse) => {
    const result = await linearService.fetchPreference()
    sendResponse(result)
  }),

  "linear-update-preference": wrapAsyncHandler(async (message, sender, sendResponse) => {
    const data = (message as any).data
    const result = await linearService.updatePreference(data)
    sendResponse(result)
  }),

  // Figma handlers
  FIGMA_API_CALL: wrapAsyncHandler(async (message, sender, sendResponse) => {
    const msg = message as any
    if (msg.method === "GET_FILE") {
      const result = await figmaBackgroundService.getFile(msg.fileId)
      sendResponse(result)
    }
  }),

  FIGMA_RENDER_FRAME: wrapAsyncHandler(async (message, sender, sendResponse) => {
    const msg = message as any
    const result = await figmaBackgroundService.renderFrame(msg.figmaUrl)
    sendResponse(result)
  }),

  FIGMA_RENDER_ELEMENT: wrapAsyncHandler(async (message, sender, sendResponse) => {
    const msg = message as any
    const result = await figmaBackgroundService.renderElement(msg.fileId, msg.nodeId)
    sendResponse(result)
  }),

  FIGMA_GET_IMAGE: wrapAsyncHandler(async (message, sender, sendResponse) => {
    const msg = message as any
    const result = await figmaBackgroundService.getImage(msg.fileId, msg.nodeId)
    sendResponse(result)
  }),

  FIGMA_OAUTH: (message, sender, sendResponse) => {
    oauthService.initiateFigmaOAuth(sendResponse)
    return true
  },

  "figma-fetch-metadata": wrapAsyncHandler(async (message, sender, sendResponse) => {
    const data = (message as any).data || {}
    const result = await figmaBackgroundService.fetchMetadata(data.websiteUrl)
    sendResponse(result)
  }),

  "figma-fetch-preference": wrapAsyncHandler(async (message, sender, sendResponse) => {
    const data = (message as any).data
    const result = await figmaBackgroundService.fetchPreference(data.websiteUrl)
    sendResponse(result)
  }),

  "figma-update-preference": wrapAsyncHandler(async (message, sender, sendResponse) => {
    const data = (message as any).data
    const result = await figmaBackgroundService.updatePreference(data)
    sendResponse(result)
  }),

  "figma-create-design-link": wrapAsyncHandler(async (message, sender, sendResponse) => {
    const data = (message as any).data
    const websiteUrl = data.websiteUrl ?? ""
    const result = await figmaBackgroundService.createDesignLink(
      websiteUrl,
      data.linkData
    )
    sendResponse(result)
  }),

  "figma-delete-design-link": wrapAsyncHandler(async (message, sender, sendResponse) => {
    const data = (message as any).data
    const websiteUrl = data.websiteUrl ?? ""
    const result = await figmaBackgroundService.deleteDesignLink(
      websiteUrl,
      data.linkId
    )
    sendResponse(result)
  }),

  // Screenshot handlers
  CAPTURE_ELEMENT_SCREENSHOT: wrapAsyncHandler(async (message, sender, sendResponse) => {
    const msg = message as any
    const result = await screenshotService.captureVisibleTab(undefined, msg.area)
    sendResponse(result)
  }),

  "capture-screen": wrapAsyncHandler(async (message, sender, sendResponse) => {
    const result = await screenshotService.captureScreen(sender)
    sendResponse({ dataUrl: result.data?.dataUrl } as any)
  }),

  // Issue submission handler
  SUBMIT_ISSUE: wrapAsyncHandler(async (message, sender, sendResponse) => {
    const msg = message as any
    const result = await issueSubmissionService.submitIssue(msg.payload)
    sendResponse(result)
  }),

  // Generic API call handler
  API_CALL: wrapAsyncHandler(async (message, sender, sendResponse) => {
    const msg = message as any
    const { endpoint, options } = msg

    try {
      const response = await fetch(`${apiClient['baseUrl']}${endpoint}`, {
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
        sendResponse({ success: false, error: errorData.error || `HTTP ${response.status}` })
        return
      }

      const data = await response.json()
      sendResponse({ success: true, data })
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Network error"
      })
    }
  }),

  // Utility handlers
  "dummy-api-call": wrapAsyncHandler(async (message, sender, sendResponse) => {
    try {
      const response = await fetch("https://jsonplaceholder.typicode.com/posts/1")
      const data = await response.json()
      sendResponse({ success: true, data })
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Network error"
      })
    }
  })
}

/**
 * Main message listener that routes messages to appropriate handlers
 */
export function handleMessage(
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): boolean | void {
  console.log("🔧 Background received message:", message)

  const messageType = (message as any).type
  const handler = messageHandlers[messageType]

  if (handler) {
    try {
      return handler(message, sender, sendResponse as any)
    } catch (error) {
      console.error(`❌ Error handling message type ${messageType}:`, error)
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
      return true
    }
  }

  // No handler found for this message type
  console.warn(`⚠️ No handler found for message type: ${messageType}`)
  return false
}

/**
 * Message handler type for external registration
 */
type MessageHandler = (
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ApiResponse<unknown>) => void
) => boolean | void

/**
 * Registers message handlers with extension handlers
 */
export function registerMessageHandler(
  messageType: string,
  handler: MessageHandler
): void {
  messageHandlers[messageType] = handler
}
