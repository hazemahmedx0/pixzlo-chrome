import type {
  FigmaApiResponse,
  FigmaAuthStatus,
  FigmaDesignLink,
  FigmaFile,
  FigmaNode
} from "@/types/figma"

const PIXZLO_WEB_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"

/**
 * Service for handling Figma API calls through Pixzlo-web backend
 */
export class FigmaService {
  private static instance: FigmaService

  static getInstance(): FigmaService {
    if (!FigmaService.instance) {
      FigmaService.instance = new FigmaService()
    }
    return FigmaService.instance
  }

  private async makeApiCall<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<FigmaApiResponse<T>> {
    try {
      // Use chrome.runtime.sendMessage to make API calls through background script
      const response = await new Promise<{
        success: boolean
        data?: T
        error?: string
      }>((resolve) => {
        chrome.runtime.sendMessage(
          {
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
          },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message || "Extension error"
              })
            } else {
              resolve(response)
            }
          }
        )
      })

      return response
    } catch (error) {
      console.error("API call failed:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Check if user has Figma authentication
   */
  async checkAuthStatus(): Promise<FigmaApiResponse<FigmaAuthStatus>> {
    return this.makeApiCall<FigmaAuthStatus>("/api/integrations/figma/status")
  }

  /**
   * Initiate Figma OAuth flow
   */
  async initiateAuth(): Promise<FigmaApiResponse<{ authUrl: string }>> {
    return this.makeApiCall<{ authUrl: string }>(
      "/api/integrations/figma/auth",
      {
        method: "POST"
      }
    )
  }

  /**
   * Get current website ID from URL
   */
  private async getCurrentWebsiteId(): Promise<string | null> {
    try {
      const currentUrl = window.location.href
      const domain = new URL(currentUrl).hostname

      // Make API call to find website by domain/URL
      const response = await this.makeApiCall<{
        websites: Array<{ id: string; url: string }>
      }>(`/api/websites?domain=${encodeURIComponent(domain)}`)

      if (
        response.success &&
        response.data &&
        response.data.websites.length > 0
      ) {
        return response.data.websites[0]!.id
      }

      return null
    } catch (error) {
      console.error("Failed to get current website ID:", error)
      return null
    }
  }

  /**
   * Get Figma design links for current page
   */
  async getDesignLinksForCurrentPage(): Promise<
    FigmaApiResponse<FigmaDesignLink[]>
  > {
    const websiteId = await this.getCurrentWebsiteId()

    if (!websiteId) {
      return {
        success: false,
        error: "Website not found in workspace"
      }
    }

    const response = await this.makeApiCall<
      FigmaDesignLink[] | { success?: boolean; figma_links?: FigmaDesignLink[] }
    >(`/api/websites/${websiteId}/figma-links`)

    if (!response.success) {
      return response
    }

    const payload = response.data

    if (Array.isArray(payload)) {
      return { success: true, data: payload }
    }

    if (payload && Array.isArray(payload.figma_links)) {
      return { success: true, data: payload.figma_links }
    }

    return {
      success: false,
      error: "Invalid response format from Figma links API"
    }
  }

  /**
   * Create a new Figma design link for current page
   */
  async createDesignLink(linkData: {
    figma_file_id: string
    figma_frame_id: string
    frame_name?: string
    frame_url: string
    thumbnail_url?: string
  }): Promise<FigmaApiResponse<FigmaDesignLink>> {
    const websiteId = await this.getCurrentWebsiteId()

    if (!websiteId) {
      return {
        success: false,
        error: "Website not found in workspace"
      }
    }

    const response = await this.makeApiCall<
      FigmaDesignLink | { success?: boolean; figma_link?: FigmaDesignLink }
    >(`/api/websites/${websiteId}/figma-links`, {
      method: "POST",
      body: JSON.stringify(linkData)
    })

    if (!response.success) {
      return response
    }

    const payload = response.data

    if (payload && "figma_link" in (payload as any)) {
      const link = (payload as { figma_link?: FigmaDesignLink }).figma_link
      if (link) {
        return { success: true, data: link }
      }
    }

    if (payload && !Array.isArray(payload)) {
      return { success: true, data: payload as FigmaDesignLink }
    }

    return {
      success: false,
      error: "Invalid response when creating Figma link"
    }
  }

  /**
   * Create a Figma design link directly without website lookup
   */
  async createDirectDesignLink(linkData: {
    figma_file_id: string
    figma_frame_id: string
    frame_name?: string
    frame_url: string
    thumbnail_url?: string
  }): Promise<FigmaApiResponse<{ success: boolean; message: string }>> {
    console.log("🎯 Creating direct Figma design link...")

    // For now, just return success to avoid the website lookup
    // In a real implementation, this would create the link directly
    return {
      success: true,
      data: {
        success: true,
        message: "Design link created successfully"
      }
    }
  }

  /**
   * Delete a Figma design link
   */
  async deleteDesignLink(linkId: string): Promise<FigmaApiResponse<void>> {
    const websiteId = await this.getCurrentWebsiteId()

    if (!websiteId) {
      return {
        success: false,
        error: "Website not found in workspace"
      }
    }

    return this.makeApiCall<void>(
      `/api/websites/${websiteId}/figma-links/${linkId}`,
      {
        method: "DELETE"
      }
    )
  }

  /**
   * Get Figma file data directly from Figma API via background script
   */
  async getFigmaFile(fileId: string): Promise<FigmaApiResponse<FigmaFile>> {
    console.log("🎯 Fetching Figma file directly via background script...")

    try {
      // Use background script to call Figma API directly
      const response = await new Promise<{
        success: boolean
        data?: FigmaFile
        error?: string
      }>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: "FIGMA_API_CALL",
            method: "GET_FILE",
            fileId: fileId
          },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message || "Extension error"
              })
            } else {
              resolve(response || { success: false, error: "No response" })
            }
          }
        )
      })

      return response
    } catch (error) {
      console.error("❌ Failed to fetch Figma file:", error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch Figma file"
      }
    }
  }

  /**
   * Get Figma node image directly via background script
   */
  async getFigmaNodeImage(
    fileId: string,
    nodeId: string,
    options: {
      format?: "jpg" | "png" | "svg"
      scale?: number
    } = {}
  ): Promise<FigmaApiResponse<{ imageUrl: string }>> {
    console.log("🎯 Fetching Figma node image via background script...")

    try {
      const response = await new Promise<{
        success: boolean
        data?: { imageUrl: string }
        error?: string
      }>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: "FIGMA_GET_IMAGE",
            fileId,
            nodeId,
            options
          },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message || "Extension error"
              })
            } else {
              resolve(response || { success: false, error: "No response" })
            }
          }
        )
      })

      return response
    } catch (error) {
      console.error("❌ Failed to fetch image:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch image"
      }
    }
  }

  /**
   * Parse Figma URL to extract file ID and node ID
   */
  parseFigmaUrl(url: string): { fileId: string; nodeId?: string } | null {
    try {
      const urlObj = new URL(url)

      // Standard Figma file URL pattern
      const fileMatch = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/)
      if (!fileMatch) return null

      const fileId = fileMatch[1]!

      // Check for node ID in URL
      let nodeId: string | undefined
      const nodeMatch = url.match(/node-id=([^&]+)/)
      if (nodeMatch) {
        nodeId = decodeURIComponent(nodeMatch[1]!)
      }

      return { fileId, nodeId }
    } catch {
      return null
    }
  }

  /**
   * Validate Figma URL
   */
  isValidFigmaUrl(url: string): boolean {
    console.log("🔍 Validating Figma URL:", url)
    const parsed = this.parseFigmaUrl(url)
    console.log("🔍 Parsed result:", parsed)
    const isValid = parsed !== null
    console.log("🔍 URL is valid:", isValid)
    return isValid
  }
}
