import type { Screenshot } from "@/types/capture"
import type { CaptureSessionData, SerializedElementInfo } from "@/types/session"
import { getSessionStorageKey } from "@/types/session"

import { CSSExtractor, type ExtractedCSS } from "./css-extractor"

/**
 * Service for managing capture session data in chrome.storage.session
 *
 * Session storage is cleared when the browser closes, which is appropriate
 * for temporary capture data.
 */
export class SessionService {
  /**
   * Store a capture session in chrome.storage.session
   */
  static async storeSession(data: CaptureSessionData): Promise<void> {
    const key = getSessionStorageKey(data.sessionId)
    await chrome.storage.session.set({ [key]: data })
  }

  /**
   * Load a capture session from chrome.storage.session
   */
  static async loadSession(
    sessionId: string
  ): Promise<CaptureSessionData | null> {
    const key = getSessionStorageKey(sessionId)
    const result = await chrome.storage.session.get(key)
    return (result[key] as CaptureSessionData) || null
  }

  /**
   * Remove a capture session from chrome.storage.session
   */
  static async removeSession(sessionId: string): Promise<void> {
    const key = getSessionStorageKey(sessionId)
    await chrome.storage.session.remove(key)
  }

  /**
   * Serialize an HTMLElement into transferable data
   * This must be called in the content script context where the element exists
   */
  static serializeElement(element: HTMLElement): SerializedElementInfo {
    const rect = element.getBoundingClientRect()
    const extractedCSS = CSSExtractor.extractElementCSS(element)

    // Get class names safely (handles SVG elements)
    let classNames: string[] = []
    if (typeof element.className === "string") {
      classNames = element.className.split(" ").filter((c) => c.length > 0)
    } else if (
      element.className &&
      typeof (element.className as SVGAnimatedString).baseVal === "string"
    ) {
      classNames = (element.className as SVGAnimatedString).baseVal
        .split(" ")
        .filter((c) => c.length > 0)
    }

    // Get truncated HTML snippet
    let htmlSnippet: string | undefined
    try {
      const outerHTML = element.outerHTML
      if (outerHTML.length > 500) {
        htmlSnippet = outerHTML.substring(0, 500) + "..."
      } else {
        htmlSnippet = outerHTML
      }
    } catch {
      // Some elements may throw when accessing outerHTML
    }

    return {
      selector: extractedCSS.selector,
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      classNames,
      boundingRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      },
      extractedCSS,
      htmlSnippet
    }
  }

  /**
   * Generate a unique session ID
   */
  static generateSessionId(): string {
    return crypto.randomUUID()
  }

  /**
   * Create a full session data object
   */
  static createSessionData(params: {
    screenshots: Screenshot[]
    selectedElement?: HTMLElement
    sourceTabId?: number
  }): CaptureSessionData {
    const sessionId = this.generateSessionId()

    return {
      sessionId,
      screenshots: params.screenshots,
      selectedElementInfo: params.selectedElement
        ? this.serializeElement(params.selectedElement)
        : undefined,
      createdAt: Date.now(),
      sourceUrl: window.location.href,
      sourceTabId: params.sourceTabId
    }
  }
}
