/**
 * Screenshot Service
 *
 * This service handles all screenshot-related operations following the Single
 * Responsibility Principle (SRP). It manages screen capture, image fetching,
 * and data URL conversion.
 *
 * Features:
 * - Screen capture via Chrome API
 * - Element screenshot capture with area cropping
 * - Image URL to data URL conversion
 * - Blob to data URL conversion
 */

import type {
  ScreenshotArea,
  ScreenshotResponse,
  ServiceResult
} from "@/types/background"

// ============================================================================
// Screenshot Service Class
// ============================================================================

/**
 * ScreenshotService handles all screenshot operations.
 * Implements the Singleton pattern to ensure consistent state across the extension.
 */
class ScreenshotService {
  private static instance: ScreenshotService

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of ScreenshotService
   */
  public static getInstance(): ScreenshotService {
    if (!ScreenshotService.instance) {
      ScreenshotService.instance = new ScreenshotService()
    }
    return ScreenshotService.instance
  }

  /**
   * Capture the visible tab
   */
  public async captureScreen(
    windowId: number
  ): Promise<ServiceResult<{ dataUrl: string }>> {
    return new Promise((resolve) => {
      chrome.tabs.captureVisibleTab(
        windowId,
        { format: "png" },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: chrome.runtime.lastError.message
            })
          } else if (!dataUrl) {
            resolve({
              success: false,
              error: "Failed to capture screen"
            })
          } else {
            resolve({
              success: true,
              data: { dataUrl }
            })
          }
        }
      )
    })
  }

  /**
   * Capture an element screenshot (full screen capture with area info for cropping)
   */
  public async captureElementScreenshot(
    area: ScreenshotArea
  ): Promise<ScreenshotResponse> {
    return new Promise((resolve) => {
      try {
        chrome.tabs.captureVisibleTab(
          undefined as unknown as number, // null for current window
          { format: "png" },
          (dataUrl) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message
              })
            } else if (!dataUrl) {
              resolve({
                success: false,
                error: "Failed to capture screenshot"
              })
            } else {
              // Send the screenshot back to content script for cropping
              resolve({
                success: true,
                screenshotDataUrl: dataUrl,
                area
              })
            }
          }
        )
      } catch (error) {
        resolve({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to capture screenshot"
        })
      }
    })
  }

  /**
   * Fetch an image URL and convert it to a data URL
   */
  public async fetchImageAsDataUrl(
    url: string
  ): Promise<ServiceResult<{ dataUrl: string }>> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`
        )
      }

      const blob = await response.blob()
      const dataUrl = await this.blobToDataUrl(blob)

      return {
        success: true,
        data: { dataUrl }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Convert a Blob to a data URL
   */
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result)
        } else {
          reject(new Error("Failed to convert blob to data URL"))
        }
      }
      reader.onerror = () => reject(new Error("Failed to read image blob"))
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Convert a data URL to a Blob
   */
  public dataUrlToBlob(dataUrl: string): Blob | undefined {
    try {
      const [header, base64] = dataUrl.split(",")
      const mimeMatch = header.match(/data:([^;]+);base64/)
      const mime = mimeMatch ? mimeMatch[1] : "image/png"
      const binaryString = atob(base64)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return new Blob([bytes], { type: mime })
    } catch {
      return undefined
    }
  }
}

// ============================================================================
// Exported Singleton Instance
// ============================================================================

export const screenshotService = ScreenshotService.getInstance()
