/**
 * Figma Service
 *
 * Handles all Figma integration operations including file fetching,
 * frame rendering, metadata management, and design link operations.
 * Leverages the existing figma-direct-api for direct Figma API calls.
 */

import type { FigmaFile, FigmaNode } from "@/types/figma"
import { PIXZLO_WEB_URL } from "~lib/constants"
import {
  clearTokenCache,
  extractElementsFromNode as directExtractElements,
  fetchFigmaFile as directFetchFigmaFile,
  findNodeById as directFindNodeById,
  renderFigmaNode as directRenderFigmaNode
} from "~lib/figma-direct-api"

import type {
  ApiResponse,
  FigmaMetadataResponse,
  FigmaPreference,
  FrameRenderResponse
} from "../types"
import { WorkspaceService } from "./workspace-service"

/**
 * Cache configuration for frame render results
 */
const FRAME_RENDER_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Parsed Figma URL data
 */
interface ParsedFigmaUrl {
  fileId: string | undefined
  nodeId: string | undefined
}

/**
 * Figma preference update data
 */
export interface FigmaPreferenceUpdate {
  websiteUrl: string
  frameId: string
  frameName?: string
  fileId?: string
  frameUrl?: string
  frameImageUrl?: string
}

/**
 * Design link creation data
 */
export interface FigmaDesignLinkData {
  websiteUrl?: string
  pageTitle?: string
  faviconUrl?: string
  linkData: {
    figma_file_id: string
    figma_frame_id: string
    frame_name?: string
    frame_url: string
    thumbnail_url?: string
  }
}

/**
 * Service class for Figma integration operations.
 * Uses static methods for service worker compatibility.
 */
export class FigmaService {
  // Metadata cache for reducing redundant API calls
  private static metadataCache: {
    data: FigmaMetadataResponse | undefined
    expiresAt: Date | undefined
  } = {
    data: undefined,
    expiresAt: undefined
  }

  // Frame render result cache with TTL
  private static frameRenderCache = new Map<
    string,
    { data: FrameRenderResponse; expiresAt: number }
  >()

  // In-flight frame render requests for deduplication
  private static inFlightFrameRenderRequests = new Map<
    string,
    Promise<FrameRenderResponse>
  >()

  /**
   * Clears all Figma caches. Called when workspace changes
   * or when OAuth completes to ensure fresh data.
   */
  static clearCaches(): void {
    this.metadataCache.data = undefined
    this.metadataCache.expiresAt = undefined
    clearTokenCache()
  }

  /**
   * Parses a Figma URL to extract file ID and node ID.
   * Handles both /design/ and /file/ URL formats.
   */
  static parseFigmaUrl(url: string): ParsedFigmaUrl | undefined {
    try {
      const urlObj = new URL(url)

      // Extract file ID from different URL patterns
      let fileId: string | undefined
      if (url.includes("/design/")) {
        fileId = url.match(/\/design\/([^\/\?]+)/)?.[1]
      } else if (url.includes("/file/")) {
        fileId = url.match(/\/file\/([^\/\?]+)/)?.[1]
      }

      // Extract node ID from URL params and convert format (119-1968 -> 119:1968)
      const nodeId = urlObj.searchParams.get("node-id")

      return {
        fileId: fileId,
        nodeId: nodeId ? nodeId.replace("-", ":") : undefined
      }
    } catch {
      return undefined
    }
  }

  /**
   * Fetches a Figma file directly via the Figma API.
   * Uses the token cached by figma-direct-api module.
   */
  static async fetchFile(fileId: string): Promise<FigmaFile> {
    return directFetchFigmaFile(fileId)
  }

  /**
   * Renders a Figma node as an image and returns the URL.
   */
  static async renderNode(fileId: string, nodeId: string): Promise<string> {
    return directRenderFigmaNode(fileId, nodeId, "png", 2)
  }

  /**
   * Extracts interactive elements from a Figma node for overlay rendering.
   */
  static extractElements(
    node: FigmaNode,
    frameId: string
  ): ReturnType<typeof directExtractElements> {
    return directExtractElements(node, frameId)
  }

  /**
   * Finds a node by ID within a Figma file or document structure.
   */
  static findNodeById(
    data: { nodes?: Record<string, FigmaNode>; document?: FigmaNode },
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

  /**
   * Extracts frames from Figma file data for frame selection UI.
   */
  static extractFramesFromFigmaData(
    data: { document?: { children?: FigmaNode[] } }
  ): Array<{
    id: string
    name: string
    type: string
    absoluteBoundingBox: { x: number; y: number; width: number; height: number } | undefined
  }> {
    const frames: Array<{
      id: string
      name: string
      type: string
      absoluteBoundingBox: { x: number; y: number; width: number; height: number } | undefined
    }> = []

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

    if (data.document && data.document.children) {
      data.document.children.forEach((page) => {
        if (page.children) {
          page.children.forEach(traverseNode)
        }
      })
    }

    return frames
  }

  /**
   * Renders a Figma frame with caching and request deduplication.
   * Returns frame data, extracted elements, and rendered image URL.
   */
  static async renderFrame(figmaUrl: string): Promise<ApiResponse<FrameRenderResponse>> {
    const parsed = this.parseFigmaUrl(figmaUrl)
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
    const now = Date.now()

    // Check cache for valid result
    const cachedFrame = this.frameRenderCache.get(cacheKey)
    if (cachedFrame && cachedFrame.expiresAt > now) {
      return { success: true, data: cachedFrame.data }
    }

    // Remove expired cache entry
    if (cachedFrame) {
      this.frameRenderCache.delete(cacheKey)
    }

    // Check for in-flight request
    let frameRequest = this.inFlightFrameRenderRequests.get(cacheKey)

    if (!frameRequest) {
      // Create new render request
      frameRequest = (async (): Promise<FrameRenderResponse> => {
        const figmaData = await this.fetchFile(fileId)

        const documentNode = figmaData?.nodes
          ? Object.values(figmaData.nodes)[0]
          : undefined
        const figmaDocument = { document: documentNode }

        if (!documentNode) {
          throw new Error("Invalid Figma file response")
        }

        // Find the specific frame/node
        const frameData = this.findNodeById(figmaDocument, nodeId)
        if (!frameData) {
          throw new Error(`Frame with node-id ${nodeId} not found in file`)
        }

        // Extract all elements from the frame
        const elements = this.extractElements(frameData, nodeId)

        // Render the frame as an image
        const imageUrl = await this.renderNode(fileId, nodeId)

        const responseData: FrameRenderResponse = {
          fileId,
          nodeId,
          frameData,
          elements,
          imageUrl,
          fileName: figmaData.name
        }

        // Cache the result
        this.frameRenderCache.set(cacheKey, {
          data: responseData,
          expiresAt: Date.now() + FRAME_RENDER_CACHE_TTL
        })

        return responseData
      })()

      this.inFlightFrameRenderRequests.set(cacheKey, frameRequest)
    }

    try {
      const responseData = await frameRequest
      return { success: true, data: responseData }
    } catch (error) {
      this.frameRenderCache.delete(cacheKey)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to render Figma frame"
      }
    } finally {
      this.inFlightFrameRenderRequests.delete(cacheKey)
    }
  }

  /**
   * Fetches Figma metadata including integration status, token, and design links.
   */
  static async fetchMetadata(options?: {
    websiteUrl?: string
    force?: boolean
    workspaceId?: string
  }): Promise<ApiResponse<FigmaMetadataResponse>> {
    try {
      if (options?.force) {
        this.metadataCache.data = undefined
        this.metadataCache.expiresAt = undefined
      }

      // Get workspace ID from options, or try to get stored/active workspace ID
      let workspaceId = options?.workspaceId
      if (!workspaceId) {
        workspaceId = await WorkspaceService.getUserActiveWorkspaceId()
      }

      if (!workspaceId) {
        return {
          success: false,
          error:
            "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      // Build URL with query parameters
      const urlParams = new URLSearchParams()
      if (options?.websiteUrl) {
        urlParams.set("websiteUrl", options.websiteUrl)
      }
      urlParams.set("workspaceId", workspaceId)

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
          error: errorData.error || "Failed to fetch Figma metadata"
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

      // Cache metadata (including decrypted token) for subsequent requests
      this.metadataCache.data = result.data
      this.metadataCache.expiresAt = new Date(Date.now() + 5 * 60 * 1000)

      return {
        success: true,
        data: result.data
      }
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
   * Fetches the user's Figma preference for a specific website.
   */
  static async fetchPreference(data: {
    websiteUrl: string
  }): Promise<ApiResponse<{ preference?: FigmaPreference }>> {
    try {
      const workspaceId = await WorkspaceService.getUserActiveWorkspaceId()
      if (!workspaceId) {
        return {
          success: false,
          error:
            "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

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
          error: errorData.error || "Failed to fetch Figma preference"
        }
      }

      const result = await response.json()

      return {
        success: true,
        preference: result.preference
      }
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
   * Updates the user's Figma preference for a specific website.
   */
  static async updatePreference(
    data: FigmaPreferenceUpdate
  ): Promise<ApiResponse<FigmaMetadataResponse>> {
    try {
      const workspaceId = await WorkspaceService.getUserActiveWorkspaceId()
      if (!workspaceId) {
        return {
          success: false,
          error:
            "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

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
          error: errorData.error || "Failed to update Figma preference"
        }
      }

      // After updating the preference, retrieve metadata again
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
   * Creates a new Figma design link for a website.
   */
  static async createDesignLink(
    data: FigmaDesignLinkData
  ): Promise<ApiResponse<FigmaMetadataResponse>> {
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
          error: errorData.error || "Failed to create Figma design link"
        }
      }

      // Force refresh metadata to include the newly created link
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
   * Deletes a Figma design link.
   */
  static async deleteDesignLink(data: {
    websiteUrl?: string
    linkId: string
  }): Promise<ApiResponse<FigmaMetadataResponse>> {
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
          error: errorData.error || "Failed to delete Figma design link"
        }
      }

      // Force refresh metadata after deleting the link
      return this.fetchMetadata({ websiteUrl, force: true })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete design link"
      }
    }
  }
}
