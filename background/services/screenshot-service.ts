/**
 * Screenshot Service
 * Handles screenshot capture operations.
 *
 * Follows Single Responsibility Principle - only handles screenshot capture.
 */

import type { ApiResponse } from "../types/messages"

/**
 * Service class for screenshot operations
 */
export class ScreenshotService {
  private static instance: ScreenshotService

  static getInstance(): ScreenshotService {
    if (!ScreenshotService.instance) {
      ScreenshotService.instance = new ScreenshotService()
    }
    return ScreenshotService.instance
  }

  /**
   * Captures the visible tab as a screenshot
   */
  async captureVisibleTab(
    windowId?: number,
    area?: { x: number; y: number; width: number; height: number }
  ): Promise<
    ApiResponse<{
      screenshotDataUrl: string
      area?: { x: number; y: number; width: number; height: number }
    }>
  > {
    return new Promise((resolve) => {
      try {
        chrome.tabs.captureVisibleTab(
          windowId ?? null,
          { format: "png" },
          (dataUrl) => {
            if (chrome.runtime.lastError) {
              console.error("Screenshot capture failed:", chrome.runtime.lastError)
              resolve({
                success: false,
                error: chrome.runtime.lastError.message || "Screenshot capture failed"
              })
            } else {
              console.log("✅ Screenshot captured successfully")
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
        console.error("Screenshot capture error:", error)
        resolve({
          success: false,
          error: error instanceof Error ? error.message : "Failed to capture screenshot"
        })
      }
    })
  }

  /**
   * Captures screen for a specific tab's window
   */
  async captureScreen(
    sender: chrome.runtime.MessageSender
  ): Promise<ApiResponse<{ dataUrl: string }>> {
    return new Promise((resolve) => {
      chrome.tabs.captureVisibleTab(
        sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT,
        { format: "png" },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: chrome.runtime.lastError.message || "Screenshot capture failed"
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
}

// Export singleton instance
export const screenshotService = ScreenshotService.getInstance()

// Utility functions

/**
 * Converts a data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob | undefined {
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
  } catch (e) {
    console.warn("Failed to convert dataUrl to Blob", e)
    return undefined
  }
}
