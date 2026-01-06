/**
 * Figma API Service
 *
 * Handles all Figma API operations including metadata fetching, file operations,
 * frame rendering, design link management, and preference handling.
 *
 * Implements Single Responsibility Principle by focusing solely on Figma operations.
 */

import type { FigmaFile, FigmaNode } from "@/types/figma"

import {
  clearTokenCache,
  extractElementsFromNode as directExtractElements,
  fetchFigmaFile as directFetchFigmaFile,
  findNodeById as directFindNodeById,
  renderFigmaNode as directRenderFigmaNode
} from "~lib/figma-direct-api"

import type {
  FigmaDesignLinkCreateRequest,
  FigmaElementRenderResponse,
  FigmaFileResponse,
  FigmaFrame,
  FigmaFrameRenderResponse,
  FigmaMetadataOptions,
  FigmaMetadataResponse,
  FigmaPreferenceResponse,
  FigmaPreferenceUpdateRequest,
  IFigmaService,
  IWorkspaceService,
  ServiceResponse
} from "./interfaces"

/**
 * Cache entry for frame render results
 */
interface FrameRenderCacheEntry {
  data: FigmaFrameRenderResponse
  expiresAt: number
}

/**
 * Parsed Figma URL components
 */
interface ParsedFigmaUrl {
  fileId: string | undefined
  nodeId: string | undefined
}

const FRAME_RENDER_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const METADATA_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Figma API Service Implementation
 */
export class FigmaApiService implements IFigmaService {
  readonly serviceName = "FigmaApiService"

  private readonly apiBaseUrl: string
  private readonly workspaceService: IWorkspaceService

  // Cache for frame render results
  private readonly frameRenderCache = new Map<string, FrameRenderCacheEntry>()
  private readonly inFlightRequests = new Map<string, Promise<FigmaFrameRenderResponse>>()

  // Metadata cache
  private metadataCache: {
    data: FigmaMetadataResponse | undefined
    expiresAt: Date | undefined
  } = {
    data: undefined,
    expiresAt: undefined
  }

  constructor(apiBaseUrl: string, workspaceService: IWorkspaceService) {
    this.apiBaseUrl = apiBaseUrl
    this.workspaceService = workspaceService
  }

  /**
   * Fetches Figma metadata for a given website URL
   */
  async fetchMetadata(
    websiteUrl?: string,
    options?: FigmaMetadataOptions
  ): Promise<ServiceResponse<FigmaMetadataResponse>> {
    try {
      if (options?.force) {
        this.clearMetadataCache()
      }

      let workspaceId = options?.workspaceId
      if (!workspaceId) {
        workspaceId = await this.workspaceService.getUserActiveWorkspaceId()
      }

      if (!workspaceId) {
        return {
          success: false,
          error: "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      const urlParams = new URLSearchParams()
      if (websiteUrl) {
        urlParams.set("websiteUrl", websiteUrl)
      }
      urlParams.set("workspaceId", workspaceId)

      const queryString = urlParams.toString()
      const url = `${this.apiBaseUrl}/api/integrations/figma/metadata${queryString ? `?${queryString}` : ""}`

      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      })

      if (!response.ok) {
        return this.handleErrorResponse(response, "Failed to fetch Figma metadata")
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

      // Cache the metadata
      this.metadataCache.data = result.data
      this.metadataCache.expiresAt = new Date(Date.now() + METADATA_CACHE_TTL)

      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      console.error(`[${this.serviceName}] Metadata fetch error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Figma metadata"
      }
    }
  }

  /**
   * Updates Figma preference for a website
   */
  async updatePreference(
    data: FigmaPreferenceUpdateRequest
  ): Promise<ServiceResponse<FigmaMetadataResponse>> {
    try {
      const workspaceId = await this.workspaceService.getUserActiveWorkspaceId()

      if (!workspaceId) {
        return {
          success: false,
          error: "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      console.log(`[${this.serviceName}] Updating Figma preference for workspace:`, workspaceId)

      const response = await fetch(
        `${this.apiBaseUrl}/api/integrations/figma/preferences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ...data, workspaceId })
        }
      )

      if (!response.ok) {
        return this.handleErrorResponse(response, "Failed to update Figma preference")
      }

      // Refresh metadata after updating preference
      return this.fetchMetadata(data.websiteUrl)
    } catch (error) {
      console.error(`[${this.serviceName}] Preference update error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update Figma preference"
      }
    }
  }

  /**
   * Creates a design link for a website
   */
  async createDesignLink(
    data: FigmaDesignLinkCreateRequest
  ): Promise<ServiceResponse<FigmaMetadataResponse>> {
    try {
      const websiteUrl = data.websiteUrl ?? (typeof window !== "undefined" ? window.location.href : "")
      const url = `${this.apiBaseUrl}/api/websites/figma-links`

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
        return this.handleErrorResponse(response, "Failed to create Figma design link")
      }

      // Clear cache and refresh metadata
      return this.fetchMetadata(websiteUrl, { force: true })
    } catch (error) {
      console.error(`[${this.serviceName}] Create design link error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create design link"
      }
    }
  }

  /**
   * Deletes a design link
   */
  async deleteDesignLink(linkId: string): Promise<ServiceResponse<FigmaMetadataResponse>> {
    try {
      const websiteUrl = typeof window !== "undefined" ? window.location.href : ""
      const url = `${this.apiBaseUrl}/api/websites/figma-links/${linkId}`

      const response = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      })

      if (!response.ok) {
        return this.handleErrorResponse(response, "Failed to delete Figma design link")
      }

      // Clear cache and refresh metadata
      return this.fetchMetadata(websiteUrl, { force: true })
    } catch (error) {
      console.error(`[${this.serviceName}] Delete design link error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete design link"
      }
    }
  }

  /**
   * Fetches Figma preference for a website
   */
  async fetchPreference(websiteUrl: string): Promise<ServiceResponse<FigmaPreferenceResponse>> {
    try {
      const workspaceId = await this.workspaceService.getUserActiveWorkspaceId()

      if (!workspaceId) {
        return {
          success: false,
          error: "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      console.log(`[${this.serviceName}] Fetching Figma preference for website:`, websiteUrl)

      const url = new URL(`${this.apiBaseUrl}/api/integrations/figma/preferences`)
      url.searchParams.set("websiteUrl", websiteUrl)
      url.searchParams.set("workspaceId", workspaceId)

      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "include"
      })

      if (!response.ok) {
        return this.handleErrorResponse(response, "Failed to fetch Figma preference")
      }

      const result = (await response.json()) as { preference?: FigmaPreferenceResponse }

      return {
        success: true,
        data: result.preference
      }
    } catch (error) {
      console.error(`[${this.serviceName}] Preference fetch error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Figma preference"
      }
    }
  }

  /**
   * Starts Figma OAuth flow
   */
  async startOAuth(workspaceId?: string): Promise<ServiceResponse<{ authUrl: string }>> {
    try {
      const resolvedWorkspaceId = workspaceId ?? await this.workspaceService.getUserActiveWorkspaceId()

      if (!resolvedWorkspaceId) {
        return {
          success: false,
          error: "No workspace selected. Open the Pixzlo extension popup and select a workspace."
        }
      }

      console.log(`[${this.serviceName}] Starting Figma OAuth for workspace:`, resolvedWorkspaceId)

      const response = await fetch(`${this.apiBaseUrl}/api/integrations/figma/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ workspaceId: resolvedWorkspaceId })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = (await response.json()) as { authUrl: string }

      return {
        success: true,
        data: { authUrl: data.authUrl }
      }
    } catch (error) {
      console.error(`[${this.serviceName}] OAuth start error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start OAuth"
      }
    }
  }

  /**
   * Fetches a Figma file directly from the Figma API
   */
  async fetchFile(fileId: string): Promise<ServiceResponse<FigmaFileResponse>> {
    try {
      console.log(`[${this.serviceName}] Fetching Figma file:`, fileId)

      const figmaData = await directFetchFigmaFile(fileId)
      const documentNode = figmaData?.nodes ? Object.values(figmaData.nodes)[0] : undefined

      if (!documentNode) {
        throw new Error("Invalid Figma file response")
      }

      const frames = this.extractFramesFromFigmaData({ document: documentNode })

      return {
        success: true,
        data: {
          id: fileId,
          name: figmaData.name,
          pages: (documentNode as { children?: unknown[] }).children || [],
          frames,
          document: documentNode
        }
      }
    } catch (error) {
      console.error(`[${this.serviceName}] File fetch error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Figma file"
      }
    }
  }

  /**
   * Renders a Figma frame with all elements
   */
  async renderFrame(figmaUrl: string): Promise<ServiceResponse<FigmaFrameRenderResponse>> {
    try {
      const parsed = this.parseFigmaUrl(figmaUrl)

      if (!parsed?.fileId) {
        return {
          success: false,
          error: "Invalid Figma URL. Could not extract file ID or node ID."
        }
      }

      if (!parsed.nodeId) {
        return {
          success: false,
          error: "Invalid Figma URL. Missing node ID."
        }
      }

      const { fileId, nodeId } = parsed
      const cacheKey = `${fileId}:${nodeId}`

      // Check cache
      const cached = this.frameRenderCache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        console.log(`[${this.serviceName}] Using cached frame render for:`, cacheKey)
        return { success: true, data: cached.data }
      }

      // Check in-flight request
      let request = this.inFlightRequests.get(cacheKey)

      if (!request) {
        request = this.performFrameRender(fileId, nodeId, cacheKey)
        this.inFlightRequests.set(cacheKey, request)
      }

      const data = await request
      return { success: true, data }
    } catch (error) {
      console.error(`[${this.serviceName}] Frame render error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to render Figma frame"
      }
    }
  }

  /**
   * Renders a single Figma element
   */
  async renderElement(
    fileId: string,
    nodeId: string
  ): Promise<ServiceResponse<FigmaElementRenderResponse>> {
    try {
      if (!nodeId) {
        return {
          success: false,
          error: "Render failed: Node ID was undefined."
        }
      }

      console.log(`[${this.serviceName}] Rendering Figma element:`, fileId, nodeId)

      const imageUrl = await directRenderFigmaNode(fileId, nodeId, "png", 2)

      return {
        success: true,
        data: {
          imageUrl,
          nodeId,
          fileId
        }
      }
    } catch (error) {
      console.error(`[${this.serviceName}] Element render error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to render element"
      }
    }
  }

  /**
   * Clears the metadata cache
   */
  clearMetadataCache(): void {
    this.metadataCache.data = undefined
    this.metadataCache.expiresAt = undefined
    clearTokenCache()
  }

  /**
   * Clears all caches (metadata and frame render)
   */
  clearAllCaches(): void {
    this.clearMetadataCache()
    this.frameRenderCache.clear()
    this.inFlightRequests.clear()
  }

  /**
   * Performs the actual frame render operation
   */
  private async performFrameRender(
    fileId: string,
    nodeId: string,
    cacheKey: string
  ): Promise<FigmaFrameRenderResponse> {
    try {
      console.log(`[${this.serviceName}] Rendering frame:`, fileId, nodeId)

      const figmaData = await directFetchFigmaFile(fileId)
      const documentNode = figmaData?.nodes ? Object.values(figmaData.nodes)[0] : undefined

      if (!documentNode) {
        throw new Error("Invalid Figma file response")
      }

      const figmaDocument = { document: documentNode } as { document: FigmaNode }
      const frameData = this.findNodeById(figmaDocument, nodeId)

      if (!frameData) {
        throw new Error(`Frame with node-id ${nodeId} not found in file`)
      }

      console.log(`[${this.serviceName}] Found frame:`, frameData.name)

      const elements = directExtractElements(frameData, nodeId)
      console.log(`[${this.serviceName}] Found ${elements.length} elements in frame`)

      const imageUrl = await directRenderFigmaNode(fileId, nodeId, "png", 2)

      const responseData: FigmaFrameRenderResponse = {
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
    } finally {
      this.inFlightRequests.delete(cacheKey)
    }
  }

  /**
   * Parses a Figma URL to extract file ID and node ID
   */
  private parseFigmaUrl(url: string): ParsedFigmaUrl | undefined {
    try {
      const urlObj = new URL(url)

      let fileId: string | undefined
      if (url.includes("/design/")) {
        fileId = url.match(/\/design\/([^/\?]+)/)?.[1]
      } else if (url.includes("/file/")) {
        fileId = url.match(/\/file\/([^/\?]+)/)?.[1]
      }

      const nodeId = urlObj.searchParams.get("node-id")

      return {
        fileId,
        nodeId: nodeId ? nodeId.replace("-", ":") : undefined
      }
    } catch (error) {
      console.error(`[${this.serviceName}] Failed to parse Figma URL:`, error)
      return undefined
    }
  }

  /**
   * Extracts frames from Figma document data
   */
  private extractFramesFromFigmaData(data: { document?: unknown }): FigmaFrame[] {
    const frames: FigmaFrame[] = []

    const traverseNode = (node: {
      type?: string
      id?: string
      name?: string
      absoluteBoundingBox?: unknown
      children?: unknown[]
    }): void => {
      if (node.type === "FRAME" || node.type === "COMPONENT") {
        frames.push({
          id: node.id ?? "",
          name: node.name ?? "",
          type: node.type,
          absoluteBoundingBox: node.absoluteBoundingBox
        })
      }

      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          traverseNode(child as typeof node)
        }
      }
    }

    const doc = data.document as { children?: unknown[] } | undefined
    if (doc?.children) {
      for (const page of doc.children) {
        const pageNode = page as { children?: unknown[] }
        if (pageNode.children) {
          for (const child of pageNode.children) {
            traverseNode(child as Parameters<typeof traverseNode>[0])
          }
        }
      }
    }

    return frames
  }

  /**
   * Finds a node by ID in the Figma document
   */
  private findNodeById(
    data: { nodes?: Record<string, FigmaNode>; document?: FigmaNode },
    nodeId: string
  ): FigmaNode | undefined {
    if (data.nodes) {
      return directFindNodeById(data as FigmaFile, nodeId)
    }

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
   * Handles error responses from the API
   */
  private async handleErrorResponse<T>(
    response: Response,
    defaultMessage: string
  ): Promise<ServiceResponse<T>> {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }))

    if (response.status === 401) {
      return {
        success: false,
        error: "Please log in to Pixzlo to use this feature."
      }
    }

    return {
      success: false,
      error: (errorData as { error?: string }).error || defaultMessage
    }
  }
}
