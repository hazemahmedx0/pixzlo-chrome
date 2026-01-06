/**
 * Screenshot Service
 *
 * Handles screenshot capture operations for the Chrome extension.
 * Implements Single Responsibility Principle by focusing solely on screenshot capture.
 */

import type {
  CaptureArea,
  CaptureResponse,
  IScreenshotService,
  ServiceResponse
} from "./interfaces"

/**
 * Screenshot Service Implementation
 */
export class ScreenshotService implements IScreenshotService {
  readonly serviceName = "ScreenshotService"

  /**
   * Captures the visible tab as a screenshot
   */
  async captureVisibleTab(windowId?: number): Promise<ServiceResponse<{ dataUrl: string }>> {
    return new Promise((resolve) => {
      try {
        chrome.tabs.captureVisibleTab(
          windowId ?? null,
          { format: "png" },
          (dataUrl) => {
            if (chrome.runtime.lastError) {
              console.error(
                `[${this.serviceName}] Screenshot capture failed:`,
                chrome.runtime.lastError
              )
              resolve({
                success: false,
                error: chrome.runtime.lastError.message || "Screenshot capture failed"
              })
              return
            }

            console.log(`[${this.serviceName}] Screenshot captured successfully`)
            resolve({
              success: true,
              data: { dataUrl }
            })
          }
        )
      } catch (error) {
        console.error(`[${this.serviceName}] Screenshot capture error:`, error)
        resolve({
          success: false,
          error: error instanceof Error ? error.message : "Failed to capture screenshot"
        })
      }
    })
  }

  /**
   * Captures an element screenshot by capturing the visible tab and providing the area
   * The actual cropping is done on the content script side
   */
  async captureElementScreenshot(area: CaptureArea): Promise<ServiceResponse<CaptureResponse>> {
    const tabResult = await this.captureVisibleTab()

    if (!tabResult.success || !tabResult.data) {
      return {
        success: false,
        error: tabResult.error || "Failed to capture screenshot"
      }
    }

    return {
      success: true,
      data: {
        screenshotDataUrl: tabResult.data.dataUrl,
        area
      }
    }
  }
}

/**
 * Utility function to convert a data URL to a Blob
 * Useful for Konva exports and image manipulation
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
  } catch (error) {
    console.warn("Failed to convert dataUrl to Blob:", error)
    return undefined
  }
}

/**
 * Utility function to fetch an image and convert it to a data URL
 */
export async function fetchImageAsDataUrl(url: string): Promise<ServiceResponse<string>> {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }

    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onloadend = (): void => {
        if (typeof reader.result === "string") {
          resolve({
            success: true,
            data: reader.result
          })
        } else {
          reject(new Error("Failed to convert blob to data URL"))
        }
      }

      reader.onerror = (): void => {
        reject(new Error("Failed to read image blob"))
      }

      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error("Image fetch error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch image"
    }
  }
}
