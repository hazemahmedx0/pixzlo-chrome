import { PIXZLO_WEB_URL } from "@/lib/constants"
import type {
  FigmaApiResponse,
  FigmaAuthStatus,
  FigmaDesignLink,
  FigmaFile,
  FigmaNode
} from "@/types/figma"

interface FigmaMetadata {
  integration: FigmaAuthStatus["integration"] | null
  token: {
    accessToken?: string
    expiresAt?: string | null
    status: "valid" | "missing" | "expired" | "invalid"
    error?: string
  } | null
  website: { domain: string; url: string; id: string | null } | null
  designLinks: FigmaDesignLink[]
  preference: {
    id: string
    lastUsedFrameId: string
    lastUsedFrameName: string | null
    lastUsedFileId: string
    frameUrl: string | null
    frameImageUrl: string | null
    updatedAt: string
  } | null
}

export class FigmaService {
  private static instance: FigmaService

  private cachedMetadata: {
    websiteUrl: string | null
    data: FigmaMetadata
    fetchedAt: number
  } | null = null

  static getInstance(): FigmaService {
    if (!FigmaService.instance) {
      FigmaService.instance = new FigmaService()
    }
    return FigmaService.instance
  }

  private async callBackground<T>(
    message: unknown
  ): Promise<FigmaApiResponse<T>> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error:
              chrome.runtime.lastError.message ||
              "Extension communication error"
          })
          return
        }
        resolve(response as FigmaApiResponse<T>)
      })
    })
  }

  private async makeApiCall<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<FigmaApiResponse<T>> {
    return this.callBackground<T>({
      type: "API_CALL",
      endpoint,
      options: {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers
        },
        body: options.body,
        credentials: "include"
      }
    })
  }

  async getMetadata(
    websiteUrl: string | null,
    options?: { force?: boolean }
  ): Promise<FigmaApiResponse<FigmaMetadata>> {
    const cacheValidForMs = 5 * 60 * 1000

    if (
      !options?.force &&
      this.cachedMetadata &&
      this.cachedMetadata.websiteUrl === websiteUrl &&
      Date.now() - this.cachedMetadata.fetchedAt < cacheValidForMs
    ) {
      return { success: true, data: this.cachedMetadata.data }
    }

    const response = await this.callBackground<FigmaMetadata>({
      type: "figma-fetch-metadata",
      data: { websiteUrl, force: Boolean(options?.force) }
    })

    if (response.success && response.data) {
      this.cachedMetadata = {
        websiteUrl,
        data: response.data,
        fetchedAt: Date.now()
      }
    }

    return response
  }

  clearMetadataCache(): void {
    this.cachedMetadata = null
  }

  async checkAuthStatus(): Promise<FigmaApiResponse<FigmaAuthStatus>> {
    if (this.cachedMetadata) {
      return {
        success: true,
        data: {
          connected: Boolean(this.cachedMetadata.data.integration?.is_active),
          integration: this.cachedMetadata.data.integration ?? undefined
        }
      }
    }

    return this.makeApiCall<FigmaAuthStatus>("/api/integrations/figma/status")
  }

  async initiateAuth(): Promise<FigmaApiResponse<{ authUrl: string }>> {
    this.clearMetadataCache()
    return this.makeApiCall<{ authUrl: string }>(
      "/api/integrations/figma/auth",
      {
        method: "POST"
      }
    )
  }

  async getDesignLinksForCurrentPage(): Promise<
    FigmaApiResponse<FigmaDesignLink[]>
  > {
    const currentUrl = window.location.href

    const metadataResponse = await this.getMetadata(currentUrl)
    if (!metadataResponse.success || !metadataResponse.data) {
      return {
        success: false,
        error: metadataResponse.error || "Failed to load Figma metadata"
      }
    }

    return {
      success: true,
      data: metadataResponse.data.designLinks
    }
  }

  async refreshMetadataForCurrentPage(): Promise<
    FigmaApiResponse<FigmaMetadata>
  > {
    this.clearMetadataCache()
    return this.getMetadata(window.location.href, { force: true })
  }

  async updatePreference(update: {
    websiteUrl: string
    frameId: string
    frameName?: string
    fileId?: string
    frameUrl?: string
    frameImageUrl?: string
  }): Promise<FigmaApiResponse<FigmaMetadata>> {
    this.clearMetadataCache()
    return this.callBackground<FigmaMetadata>({
      type: "figma-update-preference",
      data: update
    })
  }

  async createDesignLink(linkData: {
    figma_file_id: string
    figma_frame_id: string
    frame_name?: string
    frame_url: string
    thumbnail_url?: string
  }): Promise<FigmaApiResponse<FigmaDesignLink>> {
    const currentUrl = window.location.href

    const response = await this.callBackground<FigmaDesignLink>({
      type: "figma-create-design-link",
      data: {
        websiteUrl: currentUrl,
        linkData
      }
    })

    if (response.success) {
      this.clearMetadataCache()
    }

    return response
  }

  async createDirectDesignLink(linkData: {
    figma_file_id: string
    figma_frame_id: string
    frame_name?: string
    frame_url: string
    thumbnail_url?: string
  }): Promise<FigmaApiResponse<FigmaDesignLink>> {
    return this.createDesignLink(linkData)
  }

  async deleteDesignLink(linkId: string): Promise<FigmaApiResponse<void>> {
    const currentUrl = window.location.href

    const response = await this.callBackground<void>({
      type: "figma-delete-design-link",
      data: {
        websiteUrl: currentUrl,
        linkId
      }
    })

    if (response.success) {
      this.clearMetadataCache()
    }

    return response
  }

  async getFigmaFile(fileId: string): Promise<FigmaApiResponse<FigmaFile>> {
    const metadataResponse = await this.getMetadata(window.location.href)
    if (!metadataResponse.success || !metadataResponse.data) {
      return {
        success: false,
        error: metadataResponse.error || "Failed to load Figma metadata"
      }
    }

    const accessToken = metadataResponse.data.token?.accessToken
    if (!accessToken) {
      return {
        success: false,
        error: metadataResponse.data.token?.error || "Missing Figma token"
      }
    }

    const cacheBust = Date.now()
    const figmaUrl = `https://api.figma.com/v1/files/${fileId}?version=${cacheBust}`

    try {
      const response = await fetch(figmaUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0"
        }
      })

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch Figma file: ${response.status}`
        }
      }

      const figmaData = await response.json()
      return {
        success: true,
        data: figmaData as FigmaFile
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown Figma error"
      }
    }
  }

  async getFigmaNodeImage(
    fileId: string,
    nodeId: string,
    options: {
      format?: "jpg" | "png" | "svg"
      scale?: number
    } = {}
  ): Promise<FigmaApiResponse<{ imageUrl: string }>> {
    const metadataResponse = await this.getMetadata(window.location.href)
    if (!metadataResponse.success || !metadataResponse.data) {
      return {
        success: false,
        error: metadataResponse.error || "Failed to load Figma metadata"
      }
    }

    const accessToken = metadataResponse.data.token?.accessToken
    if (!accessToken) {
      return {
        success: false,
        error: metadataResponse.data.token?.error || "Missing Figma token"
      }
    }

    const params = new URLSearchParams()
    params.set("ids", nodeId)
    if (options.format) {
      params.set("format", options.format)
    }
    if (options.scale) {
      params.set("scale", options.scale.toString())
    }

    const imageUrl = `https://api.figma.com/v1/images/${fileId}?${params.toString()}`

    try {
      const response = await fetch(imageUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0"
        }
      })

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch Figma image: ${response.status}`
        }
      }

      const json = await response.json()
      const imageResult = json.images?.[nodeId]

      if (!imageResult) {
        return {
          success: false,
          error: "Image URL not found in response"
        }
      }

      return {
        success: true,
        data: { imageUrl: imageResult as string }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown Figma error"
      }
    }
  }

  parseFigmaUrl(url: string): { fileId: string; nodeId?: string } | null {
    try {
      const fileMatch = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/)
      if (!fileMatch) {
        return null
      }

      const fileId = fileMatch[1]!
      const nodeMatch = url.match(/node-id=([^&]+)/)
      const nodeId = nodeMatch ? decodeURIComponent(nodeMatch[1]!) : undefined

      return { fileId, nodeId }
    } catch {
      return null
    }
  }

  isValidFigmaUrl(url: string): boolean {
    return this.parseFigmaUrl(url) !== null
  }
}
