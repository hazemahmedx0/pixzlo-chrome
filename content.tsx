import "@/lib/console-silencer"

import EnhancedElementSelector from "@/components/content/enhanced-element-selector"
import { PIXZLO_APP_URL } from "@/lib/constants"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import cssText from "data-text:~globals.css"
import type { PlasmoCSConfig } from "plasmo"
import { useCallback, useEffect, useState } from "react"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

// ============================================================================
// Pixzlo Web Page Communication (for /welcome page pinned state)
// ============================================================================

/**
 * Handle postMessage from the Pixzlo web app (welcome page).
 * This allows the web page to request the extension's pinned state.
 */
function setupWelcomePageCommunication(): void {
  const handleWindowMessage = (event: MessageEvent): void => {
    // Only accept messages from the Pixzlo web app
    const isPixzloOrigin =
      event.origin === PIXZLO_APP_URL ||
      event.origin === "http://localhost:3001" ||
      event.origin === "http://localhost:3000"

    if (!isPixzloOrigin) return

    // Validate message structure
    if (
      !event.data ||
      typeof event.data !== "object" ||
      event.data.source !== "pixzlo-web"
    ) {
      return
    }

    // Handle pinned state request
    if (event.data.type === "REQUEST_PINNED_STATE") {
      console.log("📌 Received pinned state request from web page")

      // Query background script for pinned state
      chrome.runtime
        .sendMessage({ type: "GET_PINNED_STATE" })
        .then((response: { success: boolean; isPinned?: boolean }) => {
          // Send response back to the web page via postMessage
          window.postMessage(
            {
              source: "pixzlo-extension",
              type: "PINNED_STATE",
              payload: {
                isPinned: response.success ? response.isPinned : false
              }
            },
            event.origin
          )
        })
        .catch((error: Error) => {
          console.error("📌 Failed to get pinned state:", error)
          // Send false as fallback
          window.postMessage(
            {
              source: "pixzlo-extension",
              type: "PINNED_STATE",
              payload: {
                isPinned: false
              }
            },
            event.origin
          )
        })
    }
  }

  window.addEventListener("message", handleWindowMessage)
}

// Initialize welcome page communication if on Pixzlo domain
const currentHost = window.location.host
const isPixzloDomain =
  currentHost === "app.pixzlo.com" ||
  currentHost === "localhost:3001" ||
  currentHost === "localhost:3000"

if (isPixzloDomain) {
  setupWelcomePageCommunication()
  console.log("📌 Welcome page communication initialized for:", currentHost)
}

// Signal that content script is loaded
console.log("🎯 Pixzlo content script loaded and ready!")
console.log("🔍 Chrome runtime available:", !!chrome?.runtime)
console.log("🔍 Chrome onMessage available:", !!chrome?.runtime?.onMessage)
console.log("🔍 Page URL:", window.location.href)
console.log("🔍 Document readyState:", document.readyState)
console.log("🔍 Extension ID:", chrome?.runtime?.id)
console.log("🔍 Is in iframe:", window !== window.top)

// Add window property for debugging
;(window as any).__PIXZLO_CONTENT_SCRIPT_LOADED__ = true

// Create a wrapper component that only renders when active
const ConditionalExtension = () => {
  const [shouldMount, setShouldMount] = useState(false)
  const [captureMode, setCaptureMode] = useState<string>("element")

  // Handle reset from child component
  const handleReset = useCallback(() => {
    try {
      const storeState = (usePixzloDialogStore as any).getState?.()
      if (!storeState) {
        throw new Error("Pixzlo dialog store not available")
      }

      if (
        storeState.isFigmaFlowActive ||
        storeState.isOpen ||
        storeState.isFigmaPopupOpen
      ) {
        console.log(
          "⏸️ Skip reset: dialog is still active (Figma flow or popup open)"
        )
        return
      }
    } catch (error) {
      console.warn("Reset guard failed, proceeding with fallback reset", error)
    }

    console.log("🔄 Resetting content script state...")
    setShouldMount(false)
    setCaptureMode("element")
  }, [])

  useEffect(() => {
    console.log("🔧 Setting up content script message listener...")

    const listener = (
      message: { type?: string; mode?: string },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ): boolean => {
      console.log("🎯 Content script received message:", message)

      try {
        if (message.type === "ping") {
          console.log("📡 Responding to ping...")
          sendResponse({ pong: true, ready: true })
          return true
        }

        if (message.type === "start-element-selection") {
          console.log("🚀 Starting element selection mode:", message.mode)
          console.log(
            "🔍 Current state - shouldMount:",
            shouldMount,
            "captureMode:",
            captureMode
          )
          setShouldMount(true)
          setCaptureMode(message.mode || "element")
          console.log(
            "🔍 New state will be - shouldMount: true, captureMode:",
            message.mode || "element"
          )
          sendResponse({ success: true, mounted: true, mode: message.mode })
          return true // Keep message channel open for async response
        }

        if (message.type === "reset-element-selection") {
          console.log("🔄 Received reset request from external source")
          handleReset()
          sendResponse({ success: true, reset: true })
          return true
        }
      } catch (error) {
        console.error("❌ Error in message listener:", error)
        sendResponse({ error: error.message })
        return true
      }

      return false
    }

    // More defensive check
    if (typeof chrome !== "undefined" && chrome?.runtime?.onMessage) {
      try {
        chrome.runtime.onMessage.addListener(listener)
        console.log(
          "✅ Content script message listener registered successfully"
        )

        // Test if the listener is working by sending a test log
        setTimeout(() => {
          console.log("🎯 Content script is alive and listening...")
        }, 100)

        // Send periodic heartbeat for debugging
        const heartbeatInterval = setInterval(() => {
          console.log("💓 Content script heartbeat - still alive")
        }, 5000) // Every 5 seconds

        // Clear heartbeat on cleanup
        const originalCleanup = () => {
          clearInterval(heartbeatInterval)
          try {
            chrome.runtime.onMessage.removeListener(listener)
            console.log("🧹 Content script message listener removed")
          } catch (error) {
            console.log("Extension context invalidated during cleanup:", error)
          }
        }

        return originalCleanup
      } catch (error) {
        console.error("❌ Failed to register message listener:", error)
      }
    } else {
      console.error("❌ Chrome runtime or onMessage not available!")
      console.log("Debug info:", {
        chrome: typeof chrome,
        runtime: !!chrome?.runtime,
        onMessage: !!chrome?.runtime?.onMessage
      })
    }
  }, [])

  // Only render the actual extension when shouldMount is true
  if (!shouldMount) {
    console.log("🚨 ConditionalExtension: shouldMount is false, not rendering")
    return null
  }

  console.log(
    "✅ ConditionalExtension: Rendering EnhancedElementSelector with mode:",
    captureMode
  )
  return (
    <EnhancedElementSelector
      initialMode={captureMode as any}
      onReset={handleReset}
    />
  )
}

const styleElement = document.createElement("style")

/**
 * Generates a style element with adjusted CSS to work correctly within a Shadow DOM.
 *
 * Tailwind CSS relies on `rem` units, which are based on the root font size (typically defined on the <html>
 * or <body> element). However, in a Shadow DOM (as used by Plasmo), there is no native root element, so the
 * rem values would reference the actual page's root font size—often leading to sizing inconsistencies.
 *
 * To address this, we:
 * 1. Replace the `:root` selector with `:host(plasmo-csui)` to properly scope the styles within the Shadow DOM.
 * 2. Convert all `rem` units to pixel values using a fixed base font size, ensuring consistent styling
 *    regardless of the host page's font size.
 */
export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16

  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize

    return `${pixelsValue}px`
  })

  styleElement.textContent = updatedCssText

  return styleElement
}

export default ConditionalExtension
