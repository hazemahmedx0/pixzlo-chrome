/**
 * Capture Service
 *
 * Handles screen capture operations using the Chrome extension APIs.
 * Provides methods for capturing visible tab screenshots and fetching
 * remote images as data URLs.
 */

import type { ApiResponse } from "../types"

/**
 * Screenshot capture area definition
 */
export interface CaptureArea {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Screenshot capture result
 */
export interface CaptureResult {
  screenshotDataUrl: string
  area?: CaptureArea
}

/**
 * Service class for screen capture operations.
 * Uses Chrome extension APIs which are only available in background scripts.
 */
export class CaptureService {
  /**
   * Captures a screenshot of the visible tab.
   * Uses the Chrome tabs.captureVisibleTab API.
   *
   * @param windowId - The window ID to capture. Pass null for current window.
   * @returns Promise resolving to the screenshot data URL
   */
  static async captureVisibleTab(
    windowId: number | null = null
  ): Promise<ApiResponse<{ dataUrl: string }>> {
    return new Promise((resolve) => {
      try {
        chrome.tabs.captureVisibleTab(
          windowId,
          { format: "png" },
          (dataUrl) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message || "Capture failed"
              })
            } else if (!dataUrl) {
              resolve({
                success: false,
                error: "No screenshot data returned"
              })
            } else {
              resolve({
                success: true,
                data: { dataUrl }
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
   * Captures an element screenshot with optional area coordinates.
   * The actual cropping is done in the content script; this method
   * captures the full visible tab and returns the area for cropping.
   *
   * @param area - Optional area coordinates for cropping
   * @returns Promise resolving to screenshot data URL and area
   */
  static async captureElementScreenshot(
    area?: CaptureArea
  ): Promise<ApiResponse<CaptureResult>> {
    return new Promise((resolve) => {
      try {
        chrome.tabs.captureVisibleTab(
          null,
          { format: "png" },
          (dataUrl) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message || "Capture failed"
              })
            } else if (!dataUrl) {
              resolve({
                success: false,
                error: "No screenshot data returned"
              })
            } else {
              resolve({
                success: true,
                data: {
                  screenshotDataUrl: dataUrl,
                  area
                }
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
   * Fetches a remote image and converts it to a data URL.
   * Useful for cross-origin image fetching that can't be done
   * from content scripts due to CORS restrictions.
   *
   * @param imageUrl - The URL of the image to fetch
   * @returns Promise resolving to the image as a data URL
   */
  static async fetchImageAsDataUrl(
    imageUrl: string
  ): Promise<ApiResponse<{ dataUrl: string }>> {
    try {
      const response = await fetch(imageUrl)

      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`
        )
      }

      const blob = await response.blob()

      return new Promise((resolve) => {
        const reader = new FileReader()

        reader.onloadend = (): void => {
          if (typeof reader.result === "string") {
            resolve({
              success: true,
              data: { dataUrl: reader.result }
            })
          } else {
            resolve({
              success: false,
              error: "Failed to convert blob to data URL"
            })
          }
        }

        reader.onerror = (): void => {
          resolve({
            success: false,
            error: "Failed to read image blob"
          })
        }

        reader.readAsDataURL(blob)
      })
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch image"
      }
    }
  }

  /**
   * Converts a data URL to a Blob.
   * Useful for preparing images for upload or further processing.
   *
   * @param dataUrl - The data URL to convert
   * @returns The resulting Blob or undefined if conversion fails
   */
  static dataUrlToBlob(dataUrl: string): Blob | undefined {
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
