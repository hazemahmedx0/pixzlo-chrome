import EnhancedElementSelector from "@/components/content/enhanced-element-selector"
import cssText from "data-text:~globals.css"
import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

// Signal that content script is loaded
console.log("🎯 Pixzlo content script loaded and ready!")

// Create a wrapper component that only renders when active
const ConditionalExtension = () => {
  const [shouldMount, setShouldMount] = useState(false)
  const [captureMode, setCaptureMode] = useState<string>("element")

  useEffect(() => {
    const listener = (
      message: { type?: string; mode?: string },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ): boolean => {
      console.log("🎯 Content script received message:", message)

      if (message.type === "ping") {
        sendResponse({ pong: true, ready: true })
        return true
      }

      if (message.type === "start-element-selection") {
        setShouldMount(true)
        setCaptureMode(message.mode || "element")
        sendResponse({ success: true, mounted: true, mode: message.mode })
        return true // Keep message channel open for async response
      }

      return false
    }

    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.onMessage
    ) {
      chrome.runtime.onMessage.addListener(listener)
      console.log("✅ Content script message listener registered")

      return () => {
        try {
          chrome.runtime.onMessage.removeListener(listener)
          console.log("🧹 Content script message listener removed")
        } catch (error) {
          console.log("Extension context invalidated during cleanup")
        }
      }
    }
  }, [])

  // Only render the actual extension when shouldMount is true
  if (!shouldMount) {
    return null
  }

  return <EnhancedElementSelector initialMode={captureMode as any} />
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
