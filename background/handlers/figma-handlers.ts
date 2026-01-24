/**
 * Figma Handlers
 *
 * Message handlers for all Figma integration operations.
 * Includes file fetching, frame rendering, OAuth, and preference management.
 */

import type { FigmaNode } from "@/types/figma"
import { PIXZLO_WEB_URL } from "~lib/constants"
import { clearTokenCache } from "~lib/figma-direct-api"

import { FigmaService, WorkspaceService } from "../services"
import type { FigmaDesignLinkData, FigmaPreferenceUpdate } from "../services"

/**
 * Handles the FIGMA_API_CALL message with GET_FILE method.
 * Fetches a Figma file and extracts frame information.
 */
export async function handleFigmaGetFile(fileId: string): Promise<{
  success: boolean
  data?: {
    id: string
    name: string | undefined
    pages: FigmaNode[]
    frames: Array<{
      id: string
      name: string
      type: string
      absoluteBoundingBox: { x: number; y: number; width: number; height: number } | undefined
    }>
    document: FigmaNode | undefined
  }
  error?: string
}> {
  try {
    const figmaData = await FigmaService.fetchFile(fileId)

    const documentNode = figmaData?.nodes
      ? Object.values(figmaData.nodes)[0]
      : undefined

    if (!documentNode) {
      throw new Error("Invalid Figma file response")
    }

    const frames = FigmaService.extractFramesFromFigmaData({
      document: documentNode
    })

    return {
      success: true,
      data: {
        id: fileId,
        name: figmaData?.name,
        pages: (documentNode as FigmaNode & { children?: FigmaNode[] })?.children || [],
        frames,
        document: documentNode
      }
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch Figma file"
    }
  }
}

/**
 * Handles the FIGMA_RENDER_FRAME message.
 * Renders a Figma frame and extracts element information.
 */
export async function handleFigmaRenderFrame(figmaUrl: string): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  return FigmaService.renderFrame(figmaUrl)
}

/**
 * Handles the FIGMA_RENDER_ELEMENT message.
 * Renders a specific Figma element as an image.
 */
export async function handleFigmaRenderElement(
  fileId: string,
  nodeId: string
): Promise<{
  success: boolean
  data?: {
    imageUrl: string
    nodeId: string
    fileId: string
  }
  error?: string
}> {
  if (!nodeId) {
    return {
      success: false,
      error: "Render failed: Node ID was undefined."
    }
  }

  try {
    const imageUrl = await FigmaService.renderNode(fileId, nodeId)
    return {
      success: true,
      data: {
        imageUrl,
        nodeId,
        fileId
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to render element"
    }
  }
}

/**
 * Handles the FIGMA_GET_IMAGE message.
 * Gets a rendered image URL for a Figma node.
 */
export async function handleFigmaGetImage(
  fileId: string,
  nodeId: string
): Promise<{
  success: boolean
  data?: { imageUrl: string }
  error?: string
}> {
  try {
    const imageUrl = await FigmaService.renderNode(fileId, nodeId)
    return {
      success: true,
      data: { imageUrl }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch image"
    }
  }
}

/**
 * Handles the FIGMA_OAUTH message.
 * Initiates the Figma OAuth flow in a popup window.
 */
export async function handleFigmaOAuth(
  messageWorkspaceId?: string,
  sendResponse?: (response: { success: boolean; error?: string }) => void
): Promise<void> {
  try {
    // Get workspace ID from message or storage
    const workspaceId = messageWorkspaceId || await WorkspaceService.getUserActiveWorkspaceId()

    if (!workspaceId) {
      sendResponse?.({
        success: false,
        error: "No workspace selected. Open the Pixzlo extension popup and select a workspace."
      })
      return
    }

    // Get auth URL from backend
    const response = await fetch(`${PIXZLO_WEB_URL}/api/integrations/figma/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ workspaceId })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    const authUrl = data.authUrl

    // Launch OAuth popup
    const popupWidth = 500
    const popupHeight = 700

    chrome.windows.create(
      {
        url: authUrl,
        type: "popup",
        width: popupWidth,
        height: popupHeight,
        focused: true
      },
      (authWindow) => {
        if (!authWindow) {
          sendResponse?.({
            success: false,
            error: "Failed to create auth window"
          })
          return
        }

        // Set up listeners for OAuth completion
        const onTabUpdated = (
          _tabId: number,
          _changeInfo: chrome.tabs.TabChangeInfo,
          tab: chrome.tabs.Tab
        ): void => {
          if (tab.windowId === authWindow.id && tab.url) {
            const url = tab.url.toLowerCase()
            const isSettingsPage =
              url.includes("/settings/connected") ||
              url.includes("/settings/integrations")
            const hasResultParam =
              url.includes("success=") || url.includes("error=")

            // Check for figma-callback page with code (OAuth in progress)
            const isFigmaCallbackWithCode =
              url.includes("/figma-callback") && url.includes("code=")

            if (isFigmaCallbackWithCode) {
              // OAuth in progress, don't close
              return
            }

            if (isSettingsPage && hasResultParam) {
              // Clean up listeners
              chrome.tabs.onUpdated.removeListener(onTabUpdated)
              chrome.windows.onRemoved.removeListener(onWindowRemoved)

              // Close the auth window
              chrome.windows.remove(authWindow.id)

              // Parse URL to get success/error status
              const urlObj = new URL(tab.url)
              const successParam = urlObj.searchParams.get("success")
              const errorParam = urlObj.searchParams.get("error")

              if (successParam) {
                FigmaService.clearCaches()
                clearTokenCache()
                sendResponse?.({ success: true })
              } else if (errorParam) {
                sendResponse?.({
                  success: false,
                  error: decodeURIComponent(errorParam)
                })
              } else {
                sendResponse?.({
                  success: false,
                  error: "OAuth failed or was cancelled"
                })
              }
            } else if (isSettingsPage && !hasResultParam) {
              // Settings page loaded without result params - assume success after delay
              setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(onTabUpdated)
                chrome.windows.onRemoved.removeListener(onWindowRemoved)
                chrome.windows.remove(authWindow.id)
                FigmaService.clearCaches()
                clearTokenCache()
                sendResponse?.({ success: true })
              }, 500)
            }
          }
        }

        // Handle window being closed manually
        const onWindowRemoved = (windowId: number): void => {
          if (windowId === authWindow.id) {
            chrome.tabs.onUpdated.removeListener(onTabUpdated)
            chrome.windows.onRemoved.removeListener(onWindowRemoved)
            sendResponse?.({
              success: false,
              error: "OAuth cancelled by user"
            })
          }
        }

        chrome.tabs.onUpdated.addListener(onTabUpdated)
        chrome.windows.onRemoved.addListener(onWindowRemoved)
      }
    )
  } catch (error) {
    sendResponse?.({
      success: false,
      error: error instanceof Error ? error.message : "Failed to setup OAuth"
    })
  }
}

/**
 * Handles the figma-fetch-preference message.
 * Fetches the user's Figma preference for a website.
 */
export async function handleFigmaFetchPreference(data: {
  websiteUrl: string
}): Promise<{
  success: boolean
  preference?: unknown
  error?: string
}> {
  return FigmaService.fetchPreference(data)
}

/**
 * Handles the figma-update-preference message.
 * Updates the user's Figma preference for a website.
 */
export async function handleFigmaUpdatePreference(
  data: FigmaPreferenceUpdate
): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  return FigmaService.updatePreference(data)
}

/**
 * Handles the figma-fetch-metadata message.
 * Fetches Figma integration metadata including design links.
 */
export async function handleFigmaFetchMetadata(data?: {
  websiteUrl?: string
  force?: boolean
  workspaceId?: string
}): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  return FigmaService.fetchMetadata(data)
}

/**
 * Handles the figma-create-design-link message.
 * Creates a new Figma design link for a website.
 */
export async function handleFigmaCreateDesignLink(
  data: FigmaDesignLinkData
): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  return FigmaService.createDesignLink(data)
}

/**
 * Handles the figma-delete-design-link message.
 * Deletes a Figma design link.
 */
export async function handleFigmaDeleteDesignLink(data: {
  websiteUrl?: string
  linkId: string
}): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  return FigmaService.deleteDesignLink(data)
}
