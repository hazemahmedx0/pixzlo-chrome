/**
 * Figma Background Service
 *
 * This service handles all Figma integration operations for the background script
 * following the Single Responsibility Principle (SRP). It manages metadata,
 * preferences, design links, OAuth, and frame rendering with caching.
 *
 * Features:
 * - Figma metadata fetching with caching
 * - OAuth authentication flow
 * - Design link management (create, delete)
 * - Frame rendering with caching and deduplication
 * - Preference management
 */

import { PIXZLO_WEB_URL } from "~lib/constants"
import {
  clearTokenCache,
  extractElementsFromNode as directExtractElements,
  fetchFigmaFile as directFetchFigmaFile,
  findNodeById as directFindNodeById,
  renderFigmaNode as directRenderFigmaNode
} from "~lib/figma-direct-api"
import { workspaceService } from "~lib/services/workspace-service"

import type { FigmaFile, FigmaNode } from "@/types/figma"
import type {
  CacheEntry,
  FigmaDesignLinkCreateRequest,
  FigmaMetadataCache,
  FigmaMetadataResponse,
  FigmaPreference,
  FigmaPreferenceUpdateRequest,
  FrameRenderResponse,
  ParsedFigmaUrl,
  ServiceResult
} from "@/types/background"

// ============================================================================
// Constants
// ============================================================================

const FRAME_RENDER_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const METADATA_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// ============================================================================
// Cache State
// ============================================================================

const frameRenderResultCache = new Map<string, CacheEntry<FrameRenderResponse>>()
const inFlightFrameRenderRequests = new Map<
  string,
  Promise<FrameRenderResponse>
>()

// ============================================================================
// Helper Types
// ============================================================================

interface FigmaDocumentData {
  nodes?: Record<string, FigmaNode>
  document?: FigmaNode
}

interface FigmaFrameData {
  id: string
  name: string
  type: string
  absoluteBoundingBox: unknown
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a Figma URL to extract file ID and node ID
 */
export function parseFigmaUrl(url: string): ParsedFigmaUrl | undefined {
  try {
    const urlObj = new URL(url)

    // Extract file ID from different URL patterns
    let fileId: string | undefined
    if (url.includes("/design/")) {
      fileId = url.match(/\/design\/([^/\\?]+)/)?.[1]
    } else if (url.includes("/file/")) {
      fileId = url.match(/\/file\/([^/\\?]+)/)?.[1]
    }

    // Extract node ID from URL params
    const nodeId = urlObj.searchParams.get("node-id")

    return {
      fileId: fileId,
      nodeId: nodeId ? nodeId.replace("-", ":") : undefined // Convert 119-1968 to 119:1968
    }
  } catch {
    return undefined
  }
}

/**
 * Extract frames from Figma file data
 */
function extractFramesFromFigmaData(data: FigmaDocumentData): FigmaFrameData[] {
  const frames: FigmaFrameData[] = []

  function traverseNode(node: FigmaNode): void {
    if (node.type === "FRAME" || node.type === "COMPONENT") {
      frames.push({
        id: node.id,
        name: node.name,
        type: node.type,
        absoluteBoundingBox: node.absoluteBoundingBox
      })
    }

    if (node.children) {
      node.children.forEach(traverseNode)
    }
  }

  const document = data.document
  if (document?.children) {
    document.children.forEach((page) => {
      if (page.children) {
        page.children.forEach(traverseNode)
      }
    })
  }

  return frames
}

/**
 * Find a node by ID in Figma data (handles both formats)
 */
function findNodeById(
  data: FigmaDocumentData,
  nodeId: string
): FigmaNode | undefined {
  // Handle FigmaFile format (with nodes object)
  if (data.nodes) {
    return directFindNodeById(data as FigmaFile, nodeId)
  }
  // Handle legacy format with document property
  if (data.document) {
    const tempFile: FigmaFile = {
      key: "",
      name: "",
      thumbnail_url: "",
      last_modified: "",
      nodes: { root: data.document }
    }
    return directFindNodeById(tempFile, nodeId)
  }
  return undefined
}

// ============================================================================
// Figma Background Service Class
// ============================================================================

/**
 * FigmaBackgroundService handles all Figma integration operations.
 * Implements the Singleton pattern to ensure consistent state across the extension.
 */
class FigmaBackgroundService {
  private static instance: FigmaBackgroundService
  private metadataCache: FigmaMetadataCache = {
    data: undefined,
    expiresAt: undefined
  }

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of FigmaBackgroundService
   */
  public static getInstance(): FigmaBackgroundService {
    if (!FigmaBackgroundService.instance) {
      FigmaBackgroundService.instance = new FigmaBackgroundService()
    }
    return FigmaBackgroundService.instance
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.metadataCache.data = undefined
    this.metadataCache.expiresAt = undefined
    clearTokenCache()
  }

  /**
   * Fetch Figma metadata (integration, token, design links, preference)
   */
  public async fetchMetadata(options: {
    websiteUrl?: string
    force?: boolean
    workspaceId?: string
  }): Promise<ServiceResult<FigmaMetadataResponse>> {
    try {
      if (options.force) {
        this.metadataCache.data = undefined
        this.metadataCache.expiresAt = undefined
      }

      // Get workspace ID from options, or try to get stored/active workspace ID
      let workspaceId = options.workspaceId
      if (!workspaceId) {
        const workspaceResult = await workspaceService.requireWorkspaceId()
        if (!workspaceResult.success || !workspaceResult.data) {
          return {
            success: false,
            error: workspaceResult.error
          }
        }
        workspaceId = workspaceResult.data
      }

      // Build URL with query parameters
      const urlParams = new URLSearchParams()
      if (options.websiteUrl) {
        urlParams.set("websiteUrl", options.websiteUrl)
      }
      if (workspaceId) {
        urlParams.set("workspaceId", workspaceId)
      }

      const queryString = urlParams.toString()
      const url = `${PIXZLO_WEB_URL}/api/integrations/figma/metadata${
        queryString ? `?${queryString}` : ""
      }`

      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      })

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
            "Failed to fetch Figma metadata"
        }
      }

      const result = (await response.json()) as {
        success: boolean
        data?: FigmaMetadataResponse
        error?: string
      }

      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || "Failed to fetch Figma metadata"
        }
      }

      // Cache metadata (including decrypted token) for subsequent token requests
      this.metadataCache.data = result.data
      this.metadataCache.expiresAt = new Date(Date.now() + METADATA_CACHE_TTL)

      return { success: true, data: result.data }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Figma metadata"
      }
    }
  }

  /**
   * Fetch Figma preference for a website
   */
  public async fetchPreference(data: {
    websiteUrl: string
  }): Promise<ServiceResult<{ preference?: FigmaPreference }>> {
    try {
      // Get workspace ID from storage - Figma preferences are workspace-scoped
      const workspaceResult = await workspaceService.requireWorkspaceId()
      if (!workspaceResult.success || !workspaceResult.data) {
        return {
          success: false,
          error: workspaceResult.error
        }
      }

      const workspaceId = workspaceResult.data

      const url = new URL(`${PIXZLO_WEB_URL}/api/integrations/figma/preferences`)
      url.searchParams.set("websiteUrl", data.websiteUrl)
      url.searchParams.set("workspaceId", workspaceId)

      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "include"
      })

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
            "Failed to fetch Figma preference"
        }
      }

      const result = (await response.json()) as {
        preference?: FigmaPreference
      }
      return { success: true, data: { preference: result.preference } }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Figma preference"
      }
    }
  }

  /**
   * Update Figma preference
   */
  public async updatePreference(
    data: FigmaPreferenceUpdateRequest
  ): Promise<ServiceResult<FigmaMetadataResponse>> {
    try {
      // Get workspace ID from storage - Figma preferences are workspace-scoped
      const workspaceResult = await workspaceService.requireWorkspaceId()
      if (!workspaceResult.success || !workspaceResult.data) {
        return {
          success: false,
          error: workspaceResult.error
        }
      }

      const workspaceId = workspaceResult.data

      const response = await fetch(
        `${PIXZLO_WEB_URL}/api/integrations/figma/preferences`,
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
            "Failed to update Figma preference"
        }
      }

      // After updating the preference retrieve metadata again
      return this.fetchMetadata({ websiteUrl: data.websiteUrl })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update Figma preference"
      }
    }
  }

  /**
   * Create a Figma design link
   */
  public async createDesignLink(
    data: FigmaDesignLinkCreateRequest
  ): Promise<ServiceResult<FigmaMetadataResponse>> {
    try {
      const websiteUrl = data.websiteUrl ?? ""
      const url = `${PIXZLO_WEB_URL}/api/websites/figma-links`

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          websiteUrl,
          pageTitle: data.pageTitle,
          faviconUrl: data.faviconUrl,
          ...data.linkData
        })
      })

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
            "Failed to create Figma design link"
        }
      }

      // IMPORTANT: pass force: true to clear background cache after creating link
      return this.fetchMetadata({ websiteUrl, force: true })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create design link"
      }
    }
  }

  /**
   * Delete a Figma design link
   */
  public async deleteDesignLink(data: {
    websiteUrl?: string
    linkId: string
  }): Promise<ServiceResult<FigmaMetadataResponse>> {
    try {
      const websiteUrl = data.websiteUrl ?? ""
      const url = `${PIXZLO_WEB_URL}/api/websites/figma-links/${data.linkId}`

      const response = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      })

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
            "Failed to delete Figma design link"
        }
      }

      // IMPORTANT: pass force: true to clear background cache after deleting link
      return this.fetchMetadata({ websiteUrl, force: true })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete design link"
      }
    }
  }

  /**
   * Fetch a Figma file
   */
  public async fetchFile(
    fileId: string
  ): Promise<
    ServiceResult<{
      id: string
      name: string | undefined
      pages: FigmaNode[]
      frames: FigmaFrameData[]
      document: FigmaNode | undefined
    }>
  > {
    try {
      const figmaData = await directFetchFigmaFile(fileId)

      const documentNode = figmaData?.nodes
        ? Object.values(figmaData.nodes)[0]
        : undefined

      if (!documentNode) {
        throw new Error("Invalid Figma file response")
      }

      const frames = extractFramesFromFigmaData({
        document: documentNode
      })

      return {
        success: true,
        data: {
          id: fileId,
          name: figmaData?.name,
          pages: (documentNode as FigmaNode & { children?: FigmaNode[] })
            ?.children ?? [],
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
   * Render a Figma frame with caching and deduplication
   */
  public async renderFrame(
    figmaUrl: string
  ): Promise<ServiceResult<FrameRenderResponse>> {
    // Parse Figma URL to extract file ID and node ID
    const parsed = parseFigmaUrl(figmaUrl)
    if (!parsed || !parsed.fileId) {
      return {
        success: false,
        error: "Invalid Figma URL. Could not extract file ID or node ID."
      }
    }

    const { fileId, nodeId } = parsed

    if (!nodeId) {
      return {
        success: false,
        error: "Invalid Figma URL. Missing node ID."
      }
    }

    const cacheKey = `${fileId}:${nodeId}`
    const cachedFrame = frameRenderResultCache.get(cacheKey)
    const now = Date.now()

    // Return cached result if valid
    if (cachedFrame && cachedFrame.expiresAt > now) {
      return { success: true, data: cachedFrame.data }
    }

    // Remove expired cache entry
    if (cachedFrame) {
      frameRenderResultCache.delete(cacheKey)
    }

    // Check for in-flight request
    let frameRequest = inFlightFrameRenderRequests.get(cacheKey)

    if (!frameRequest) {
      frameRequest = this.executeFrameRender(fileId, nodeId, cacheKey)
      inFlightFrameRenderRequests.set(cacheKey, frameRequest)
    }

    try {
      const responseData = await frameRequest
      return { success: true, data: responseData }
    } catch (error) {
      frameRenderResultCache.delete(cacheKey)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to render Figma frame"
      }
    } finally {
      inFlightFrameRenderRequests.delete(cacheKey)
    }
  }

  /**
   * Execute frame render (internal method)
   */
  private async executeFrameRender(
    fileId: string,
    nodeId: string,
    cacheKey: string
  ): Promise<FrameRenderResponse> {
    const figmaData = await directFetchFigmaFile(fileId)

    const documentNode = figmaData?.nodes
      ? Object.values(figmaData.nodes)[0]
      : undefined
    const figmaDocument: FigmaDocumentData = { document: documentNode }

    if (!documentNode) {
      throw new Error("Invalid Figma file response")
    }

    // Find the specific frame/node
    const frameData = findNodeById(figmaDocument, nodeId)
    if (!frameData) {
      throw new Error(`Frame with node-id ${nodeId} not found in file`)
    }

    // Extract all elements from the frame
    const elements = directExtractElements(frameData, nodeId)

    // Render the frame as an image
    const imageUrl = await directRenderFigmaNode(fileId, nodeId, "png", 2)

    const responseData: FrameRenderResponse = {
      fileId,
      nodeId,
      frameData,
      elements,
      imageUrl,
      fileName: figmaData.name
    }

    frameRenderResultCache.set(cacheKey, {
      data: responseData,
      expiresAt: Date.now() + FRAME_RENDER_CACHE_TTL
    })

    return responseData
  }

  /**
   * Render a specific Figma element
   */
  public async renderElement(
    fileId: string,
    nodeId: string
  ): Promise<
    ServiceResult<{ imageUrl: string; nodeId: string; fileId: string }>
  > {
    if (!nodeId) {
      return {
        success: false,
        error: "Render failed: Node ID was undefined."
      }
    }

    try {
      const imageUrl = await directRenderFigmaNode(fileId, nodeId, "png", 2)
      return {
        success: true,
        data: { imageUrl, nodeId, fileId }
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to render element"
      }
    }
  }

  /**
   * Get Figma image for a node
   */
  public async getImage(
    fileId: string,
    nodeId: string
  ): Promise<ServiceResult<{ imageUrl: string }>> {
    try {
      const imageUrl = await directRenderFigmaNode(fileId, nodeId, "png", 2)
      return { success: true, data: { imageUrl } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch image"
      }
    }
  }

  /**
   * Handle Figma OAuth flow
   */
  public async handleOAuth(
    workspaceIdOverride?: string
  ): Promise<ServiceResult<void>> {
    try {
      // Get workspace ID from override or storage
      let workspaceId = workspaceIdOverride
      if (!workspaceId) {
        const workspaceResult = await workspaceService.requireWorkspaceId()
        if (!workspaceResult.success || !workspaceResult.data) {
          return {
            success: false,
            error: workspaceResult.error
          }
        }
        workspaceId = workspaceResult.data
      }

      // Get auth URL
      const response = await fetch(
        `${PIXZLO_WEB_URL}/api/integrations/figma/auth`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ workspaceId })
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = (await response.json()) as { authUrl: string }
      const authUrl = data.authUrl

      // Return auth URL for the caller to open
      return new Promise((resolve) => {
        // Launch OAuth with custom popup dimensions
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
              resolve({
                success: false,
                error: "Failed to create auth window"
              })
              return
            }

            // Listen for URL changes in the auth window
            const onTabUpdated = (
              tabId: number,
              changeInfo: chrome.tabs.TabChangeInfo,
              tab: chrome.tabs.Tab
            ): void => {
              if (tab.windowId === authWindow.id && tab.url) {
                const url = tab.url.toLowerCase()
                const isSettingsPage =
                  url.includes("/settings/connected") ||
                  url.includes("/settings/integrations")
                const hasResultParam =
                  url.includes("success=") || url.includes("error=")
                const isFigmaCallbackWithCode =
                  url.includes("/figma-callback") && url.includes("code=")

                if (isFigmaCallbackWithCode) {
                  return
                }

                if (isSettingsPage && hasResultParam) {
                  chrome.tabs.onUpdated.removeListener(onTabUpdated)
                  chrome.windows.onRemoved.removeListener(onWindowRemoved)
                  chrome.windows.remove(authWindow.id!)

                  const urlObj = new URL(tab.url!)
                  const successParam = urlObj.searchParams.get("success")
                  const errorParam = urlObj.searchParams.get("error")

                  if (successParam) {
                    this.clearCaches()
                    resolve({ success: true })
                  } else if (errorParam) {
                    resolve({
                      success: false,
                      error: decodeURIComponent(errorParam)
                    })
                  } else {
                    resolve({
                      success: false,
                      error: "OAuth failed or was cancelled"
                    })
                  }
                } else if (isSettingsPage && !hasResultParam) {
                  // Settings page loaded without result params - give it time to process
                  setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(onTabUpdated)
                    chrome.windows.onRemoved.removeListener(onWindowRemoved)
                    chrome.windows.remove(authWindow.id!)
                    this.clearCaches()
                    resolve({ success: true })
                  }, 500)
                }
              }
            }

            const onWindowRemoved = (windowId: number): void => {
              if (windowId === authWindow.id) {
                chrome.tabs.onUpdated.removeListener(onTabUpdated)
                chrome.windows.onRemoved.removeListener(onWindowRemoved)
                resolve({
                  success: false,
                  error: "OAuth cancelled by user"
                })
              }
            }

            chrome.tabs.onUpdated.addListener(onTabUpdated)
            chrome.windows.onRemoved.addListener(onWindowRemoved)
          }
        )
      })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to setup OAuth"
      }
    }
  }
}

// ============================================================================
// Exported Singleton Instance
// ============================================================================

export const figmaBackgroundService = FigmaBackgroundService.getInstance()
