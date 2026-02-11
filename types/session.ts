import type { CSSProperty, ExtractedCSS } from "@/lib/css-extractor"

import type { Screenshot } from "./capture"

/**
 * Serialized element information that can be passed between contexts
 * (content script -> background -> tab page)
 */
export interface SerializedElementInfo {
  /** CSS selector for the element */
  selector: string
  /** Tag name of the element */
  tagName: string
  /** Element's id attribute */
  id?: string
  /** Element's class names */
  classNames: string[]
  /** Bounding rect at time of capture */
  boundingRect: {
    top: number
    left: number
    width: number
    height: number
  }
  /** Pre-extracted CSS properties */
  extractedCSS: ExtractedCSS
  /** Outer HTML snippet (truncated for large elements) */
  htmlSnippet?: string
}

/**
 * Session data stored in chrome.storage.session
 */
export interface CaptureSessionData {
  /** Unique session identifier */
  sessionId: string
  /** Captured screenshots */
  screenshots: Screenshot[]
  /** Serialized element info (for element captures) */
  selectedElementInfo?: SerializedElementInfo
  /** Timestamp when session was created */
  createdAt: number
  /** URL of the page where capture was taken */
  sourceUrl: string
  /** Tab ID of the source page (for potential navigation back) */
  sourceTabId?: number
}

/**
 * Storage key prefix for capture sessions
 */
export const CAPTURE_SESSION_PREFIX = "capture-session-"

/**
 * Get the storage key for a session ID
 */
export function getSessionStorageKey(sessionId: string): string {
  return `${CAPTURE_SESSION_PREFIX}${sessionId}`
}
