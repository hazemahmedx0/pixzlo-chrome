/**
 * Figma Integration Service (Background)
 * Handles all Figma API operations including authentication, file fetching,
 * frame rendering, and design link management.
 *
 * Follows Single Responsibility Principle - only handles Figma integration.
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import type {
  ApiResponse,
  FigmaMetadataResponse,
  FrameRenderResponse
} from "../types/messages"
import { apiClient, fetchFigmaApi } from "../utils/api-client"
import { Cache, CachedRequestHandler } from "../utils/cache"

// Cache constants
const FRAME_RENDER_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const METADATA_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Caches
const metadataCache = new Cache<FigmaMetadataResponse>(METADATA_CACHE_TTL)
const frameRenderCache = new CachedRequestHandler<FrameRenderResponse>(
  FRAME_RENDER_CACHE_TTL
)

/**
 * Service class for Figma integration operations
 */
export class FigmaBackgroundService {
  private static instance: FigmaBackgroundService

  static getInstance(): FigmaBackgroundService {
    if (!FigmaBackgroundService.instance) {
      FigmaBackgroundService.instance = new FigmaBackgroundService()
    }
    return FigmaBackgroundService.instance
  }

  /**
   * Gets Figma access token from cached metadata or fetches fresh
   */
  async getAccessToken(): Promise<string> {
    const cached = metadataCache.get("current")

    if (cached?.token?.accessToken) {
      console.log("🔑 Using cached token from metadata")
      return cached.token.accessToken
    }

    console.log("🔑 Fetching Figma metadata to get token...")
    const response = await this.fetchMetadata()

    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch Figma metadata")
    }

    const accessToken = response.data.token?.accessToken
    if (!accessToken) {
      throw new Error(response.data.token?.error || "Missing Figma access token")
    }

    console.log("🔑 Token cached from metadata successfully")
    return accessToken
  }

  /**
   * Fetches Figma metadata (integration, token, website, design links, preference)
   */
  async fetchMetadata(
    websiteUrl?: string
  ): Promise<ApiResponse<FigmaMetadataResponse>> {
    const endpoint = websiteUrl
      ? `/api/integrations/figma/metadata?websiteUrl=${encodeURIComponent(websiteUrl)}`
      : "/api/integrations/figma/metadata"

    const response = await apiClient.get<{ data?: FigmaMetadataResponse }>(
      endpoint
    )

    if (response.success && response.data) {
      const metadata = (response.data as any).data || response.data
      metadataCache.set("current", metadata)
      return { success: true, data: metadata }
    }

    return response as ApiResponse<FigmaMetadataResponse>
  }

  /**
   * Fetches Figma preference for a website
   */
  async fetchPreference(websiteUrl: string): Promise<
    ApiResponse<{
      id: string
      lastUsedFrameId: string
      lastUsedFrameName?: string
      lastUsedFileId: string
      frameUrl?: string
      frameImageUrl?: string
      updatedAt: string
    }>
  > {
    console.log("🎯 Fetching Figma preference for website:", websiteUrl)

    const response = await apiClient.get<{
      preference?: {
        id: string
        lastUsedFrameId: string
        lastUsedFrameName?: string
        lastUsedFileId: string
        frameUrl?: string
        frameImageUrl?: string
        updatedAt: string
      }
    }>(
      `/api/integrations/figma/preferences?websiteUrl=${encodeURIComponent(websiteUrl)}`
    )

    if (response.success && response.data) {
      console.log("✅ Figma preference fetched")
      return { success: true, data: (response.data as any).preference }
    }

    return response as any
  }

  /**
   * Updates Figma preference
   */
  async updatePreference(data: {
    websiteUrl: string
    frameId: string
    frameName?: string
    fileId?: string
    frameUrl?: string
    frameImageUrl?: string
  }): Promise<ApiResponse<FigmaMetadataResponse>> {
    const response = await apiClient.post<FigmaMetadataResponse>(
      "/api/integrations/figma/preferences",
      data
    )

    if (response.success) {
      // Refresh metadata after updating preference
      return this.fetchMetadata(data.websiteUrl)
    }

    return response
  }

  /**
   * Creates a design link
   */
  async createDesignLink(
    websiteUrl: string,
    linkData: {
      figma_file_id: string
      figma_frame_id: string
      frame_name?: string
      frame_url: string
      thumbnail_url?: string
    }
  ): Promise<ApiResponse<FigmaMetadataResponse>> {
    const response = await apiClient.post<unknown>(
      "/api/websites/figma-links",
      { websiteUrl, ...linkData }
    )

    if (response.success) {
      return this.fetchMetadata(websiteUrl)
    }

    return response as ApiResponse<FigmaMetadataResponse>
  }

  /**
   * Deletes a design link
   */
  async deleteDesignLink(
    websiteUrl: string,
    linkId: string
  ): Promise<ApiResponse<FigmaMetadataResponse>> {
    const response = await apiClient.delete<unknown>(
      `/api/websites/figma-links/${linkId}`
    )

    if (response.success) {
      return this.fetchMetadata(websiteUrl)
    }

    return response as ApiResponse<FigmaMetadataResponse>
  }

  /**
   * Fetches Figma file data
   */
  async getFile(fileId: string): Promise<
    ApiResponse<{
      id: string
      name: string
      pages: unknown[]
      frames: Array<{
        id: string
        name: string
        type: string
        absoluteBoundingBox: unknown
      }>
      document: unknown
    }>
  > {
    const token = await this.getAccessToken()

    // Validate token first
    const validateResponse = await fetchFigmaApi<{ email?: string; handle?: string }>(
      "/me",
      token
    )

    if (!validateResponse.success) {
      throw new Error(`Token validation failed: ${validateResponse.error}`)
    }

    console.log(
      "Background script - Token validated for user:",
      validateResponse.data?.email || validateResponse.data?.handle
    )

    // Fetch file
    const cacheBust = Date.now()
    const response = await fetchFigmaApi<{
      name: string
      document: { children?: unknown[] }
    }>(`/files/${fileId}?version=${cacheBust}`, token)

    if (!response.success || !response.data) {
      return { success: false, error: response.error || "Failed to fetch Figma file" }
    }

    const figmaData = response.data
    const frames = extractFramesFromFigmaData(figmaData)

    return {
      success: true,
      data: {
        id: fileId,
        name: figmaData.name,
        pages: figmaData.document?.children || [],
        frames,
        document: figmaData.document
      }
    }
  }

  /**
   * Renders a Figma frame and returns frame data with image URL
   */
  async renderFrame(figmaUrl: string): Promise<ApiResponse<FrameRenderResponse>> {
    const parsed = parseFigmaUrl(figmaUrl)

    if (!parsed?.fileId) {
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

    try {
      const result = await frameRenderCache.getOrFetch(cacheKey, async () => {
        const token = await this.getAccessToken()

        // Fetch file data
        const fileResponse = await fetchFigmaApi<{
          name: string
          document: unknown
        }>(`/files/${fileId}`, token)

        if (!fileResponse.success || !fileResponse.data) {
          throw new Error(`File access failed: ${fileResponse.error}`)
        }

        const figmaData = fileResponse.data
        const frameData = findNodeById(figmaData, nodeId)

        if (!frameData) {
          throw new Error(`Frame with node-id ${nodeId} not found in file`)
        }

        console.log("Background script - Found frame:", frameData.name)

        const elements = extractElementsFromNode(frameData, nodeId)
        console.log(`Background script - Found ${elements.length} elements in frame`)

        const imageUrl = await this.renderNode(fileId, nodeId, token)

        return {
          fileId,
          nodeId,
          frameData,
          elements,
          imageUrl,
          fileName: figmaData.name
        }
      })

      return { success: true, data: result }
    } catch (error) {
      frameRenderCache.invalidate(cacheKey)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to render frame"
      }
    }
  }

  /**
   * Renders a specific Figma element/node as an image
   */
  async renderElement(
    fileId: string,
    nodeId: string
  ): Promise<ApiResponse<{ imageUrl: string; nodeId: string; fileId: string }>> {
    if (!nodeId) {
      return { success: false, error: "Render failed: Node ID was undefined." }
    }

    try {
      const token = await this.getAccessToken()
      const imageUrl = await this.renderNode(fileId, nodeId, token)

      return {
        success: true,
        data: { imageUrl, nodeId, fileId }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to render element"
      }
    }
  }

  /**
   * Gets image URL for a specific Figma node
   */
  async getImage(
    fileId: string,
    nodeId: string
  ): Promise<ApiResponse<{ imageUrl: string }>> {
    try {
      const token = await this.getAccessToken()
      const imageUrl = await this.renderNode(fileId, nodeId, token)

      return { success: true, data: { imageUrl } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch image"
      }
    }
  }

  /**
   * Internal method to render a node as an image
   */
  private async renderNode(
    fileId: string,
    nodeId: string,
    token: string
  ): Promise<string> {
    const response = await fetchFigmaApi<{ images: Record<string, string> }>(
      `/images/${fileId}?ids=${nodeId}&format=png&scale=2&use_absolute_bounds=true`,
      token
    )

    if (!response.success || !response.data) {
      throw new Error(`Failed to render Figma node: ${response.error}`)
    }

    const imageUrl = response.data.images[nodeId]
    if (!imageUrl) {
      throw new Error("No image URL returned from Figma API")
    }

    return imageUrl
  }

  /**
   * Initiates Figma OAuth flow
   */
  async initiateOAuth(): Promise<ApiResponse<{ authUrl: string }>> {
    return apiClient.post<{ authUrl: string }>("/api/integrations/figma/auth")
  }

  /**
   * Clears all caches
   */
  clearCache(): void {
    metadataCache.clear()
    frameRenderCache.clear()
  }
}

// Export singleton instance
export const figmaBackgroundService = FigmaBackgroundService.getInstance()

// Helper functions

/**
 * Parses Figma URL to extract file ID and node ID
 */
export function parseFigmaUrl(
  url: string
): { fileId: string | undefined; nodeId: string | undefined } | undefined {
  try {
    const urlObj = new URL(url)

    let fileId: string | undefined
    if (url.includes("/design/")) {
      fileId = url.match(/\/design\/([^\/\?]+)/)?.[1]
    } else if (url.includes("/file/")) {
      fileId = url.match(/\/file\/([^\/\?]+)/)?.[1]
    }

    const nodeId = urlObj.searchParams.get("node-id")

    return {
      fileId,
      nodeId: nodeId ? nodeId.replace("-", ":") : undefined
    }
  } catch (error) {
    console.error("Failed to parse Figma URL:", error)
    return undefined
  }
}

/**
 * Extracts frames from Figma file data
 */
export function extractFramesFromFigmaData(data: {
  document?: { children?: unknown[] }
}): Array<{
  id: string
  name: string
  type: string
  absoluteBoundingBox: unknown
}> {
  const frames: Array<{
    id: string
    name: string
    type: string
    absoluteBoundingBox: unknown
  }> = []

  function traverseNode(node: any) {
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

  if (data.document?.children) {
    data.document.children.forEach((page: any) => {
      if (page.children) {
        page.children.forEach(traverseNode)
      }
    })
  }

  return frames
}

/**
 * Extracts elements from a specific frame/node
 */
export function extractElementsFromNode(
  node: any,
  frameId: string
): Array<{
  id: string
  name: string
  type: string
  absoluteBoundingBox: unknown
  relativeTransform: unknown
  constraints: unknown
  depth: number
}> {
  const elements: Array<{
    id: string
    name: string
    type: string
    absoluteBoundingBox: unknown
    relativeTransform: unknown
    constraints: unknown
    depth: number
  }> = []

  function traverseNode(currentNode: any, depth = 0) {
    if (currentNode.id !== frameId && currentNode.visible !== false) {
      if (currentNode.absoluteBoundingBox) {
        elements.push({
          id: currentNode.id,
          name: currentNode.name,
          type: currentNode.type,
          absoluteBoundingBox: currentNode.absoluteBoundingBox,
          relativeTransform: currentNode.relativeTransform,
          constraints: currentNode.constraints,
          depth
        })
      }
    }

    if (currentNode.children) {
      currentNode.children.forEach((child: any) => traverseNode(child, depth + 1))
    }
  }

  traverseNode(node)
  return elements
}

/**
 * Finds a specific node by ID in Figma data
 */
export function findNodeById(data: any, nodeId: string): any | undefined {
  function searchNode(node: any): any | undefined {
    if (node.id === nodeId) {
      return node
    }
    if (node.children) {
      for (const child of node.children) {
        const found = searchNode(child)
        if (found) return found
      }
    }
    return undefined
  }

  if (data.document?.children) {
    for (const page of data.document.children) {
      const found = searchNode(page)
      if (found) return found
    }
  }
  return undefined
}
