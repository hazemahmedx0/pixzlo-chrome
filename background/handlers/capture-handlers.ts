/**
 * Capture Handlers
 *
 * Message handlers for screen capture and image fetching operations.
 */

import { CaptureService } from "../services"
import type { CaptureArea } from "../services"

/**
 * Handles the capture-screen message.
 * Captures a screenshot of the visible tab.
 */
export async function handleCaptureScreen(
  windowId: number | undefined
): Promise<{
  success: boolean
  dataUrl?: string
  error?: string
}> {
  if (!windowId) {
    return {
      success: false,
      error: "Capture denied: no active tab context"
    }
  }

  const result = await CaptureService.captureVisibleTab(windowId)
  
  if (result.success && result.data) {
    return {
      success: true,
      dataUrl: result.data.dataUrl
    }
  }
  
  return {
    success: false,
    error: result.error || "Capture failed"
  }
}

/**
 * Handles the CAPTURE_ELEMENT_SCREENSHOT message.
 * Captures a screenshot for element cropping in the content script.
 */
export async function handleCaptureElementScreenshot(
  area?: CaptureArea
): Promise<{
  success: boolean
  screenshotDataUrl?: string
  area?: CaptureArea
  error?: string
}> {
  const result = await CaptureService.captureElementScreenshot(area)
  
  if (result.success && result.data) {
    return {
      success: true,
      screenshotDataUrl: result.data.screenshotDataUrl,
      area: result.data.area
    }
  }
  
  return {
    success: false,
    error: result.error || "Capture failed"
  }
}

/**
 * Handles the FETCH_IMAGE_DATA_URL message.
 * Fetches a remote image and returns it as a data URL.
 */
export async function handleFetchImageDataUrl(
  imageUrl: string
): Promise<{
  success: boolean
  dataUrl?: string
  error?: string
}> {
  const result = await CaptureService.fetchImageAsDataUrl(imageUrl)
  
  if (result.success && result.data) {
    return {
      success: true,
      dataUrl: result.data.dataUrl
    }
  }
  
  return {
    success: false,
    error: result.error || "Failed to fetch image"
  }
}
