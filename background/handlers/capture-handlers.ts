/**
 * Capture Handlers
 *
 * Message handlers for screen capture and image fetching operations.
 */

import type { CaptureSessionData } from "@/types/session"
import {
  CAPTURE_SESSION_PREFIX,
  getSessionStorageKey
} from "@/types/session"

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
export async function handleFetchImageDataUrl(imageUrl: string): Promise<{
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

/**
 * Maximum age of a capture session before it is considered stale (1 hour).
 */
const SESSION_MAX_AGE_MS = 3_600_000

/**
 * Remove capture sessions older than `maxAge` from chrome.storage.session.
 * Called opportunistically before opening a new capture tab and on startup.
 */
export async function cleanupStaleSessions(
  maxAge: number = SESSION_MAX_AGE_MS
): Promise<void> {
  try {
    const result = await chrome.storage.session.get(null)
    const now = Date.now()
    const keysToRemove: string[] = []

    for (const [key, value] of Object.entries(result)) {
      if (key.startsWith(CAPTURE_SESSION_PREFIX)) {
        const session = value as CaptureSessionData
        if (now - session.createdAt > maxAge) {
          keysToRemove.push(key)
        }
      }
    }

    if (keysToRemove.length > 0) {
      await chrome.storage.session.remove(keysToRemove)
    }
  } catch {
    // Storage access may fail in rare edge cases; ignore silently.
  }
}

export async function handleOpenCaptureTab(
  sessionData: CaptureSessionData
): Promise<{
  success: boolean
  tabId?: number
  error?: string
}> {
  try {
    // Opportunistically clean up stale sessions before storing a new one
    await cleanupStaleSessions()

    // Store session data in chrome.storage.session
    const storageKey = getSessionStorageKey(sessionData.sessionId)
    await chrome.storage.session.set({ [storageKey]: sessionData })

    // Open the tab page
    const tab = await chrome.tabs.create({
      url: `tabs/capture.html?session=${sessionData.sessionId}`,
      active: true
    })

    return {
      success: true,
      tabId: tab.id
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to open capture tab"
    }
  }
}
