import { CaptureService } from "@/lib/capture-service"
import { ElementSelectionService } from "@/lib/element-selection-service"
import { SessionService } from "@/lib/session-service"
import type { Screenshot } from "@/types/capture"
import type { CaptureSessionData } from "@/types/session"
import { memo, useCallback, useEffect, useRef, useState } from "react"

import ElementHighlighter from "./element-highlighter"
import FloatingToolbar from "./floating-toolbar"
import SelectionOverlay from "./selection-overlay"

type CaptureMode = "pointer" | "element" | "area" | "fullscreen" | null

interface EnhancedElementSelectorProps {
  initialMode?: CaptureMode
  onReset?: () => void
}

const EnhancedElementSelector = memo(
  ({ initialMode = "element", onReset }: EnhancedElementSelectorProps) => {
    const [isActive, setIsActive] = useState(false)
    const [captureMode, setCaptureMode] = useState<CaptureMode>(null)

    const hasTriggeredFullscreenCapture = useRef(false)

    const captureService = CaptureService.getInstance()
    const elementSelectionService = ElementSelectionService.getInstance()

    // Extension is now controlled by the parent wrapper component

    // Auto-activate when component mounts (since it's now conditionally mounted)
    useEffect(() => {
      setIsActive(true)
      setCaptureMode(initialMode)
    }, [initialMode])

    const handleClose = useCallback(() => {
      setIsActive(false)
      setCaptureMode(null)
      hasTriggeredFullscreenCapture.current = false

      // Notify parent to reset the mount state
      onReset?.()
    }, [onReset])

    /**
     * Opens the capture tab page with the given screenshots and element info
     * Note: Does NOT close the selector UI - user can continue capturing on the same page
     */
    const openCaptureTab = useCallback(
      async (
        screenshots: Screenshot[],
        selectedElement?: HTMLElement
      ): Promise<void> => {
        try {
          // Create session data (sourceTabId will be added by background script from sender)
          const sessionData: Omit<CaptureSessionData, "sourceTabId"> = {
            sessionId: SessionService.generateSessionId(),
            screenshots,
            selectedElementInfo: selectedElement
              ? SessionService.serializeElement(selectedElement)
              : undefined,
            createdAt: Date.now(),
            sourceUrl: window.location.href
          }

          // Send message to background script to open the tab
          // The background script will add the sourceTabId from the sender
          await chrome.runtime.sendMessage({
            type: "OPEN_CAPTURE_TAB",
            data: sessionData
          })

          // UI stays open - user can continue capturing more elements/areas
        } catch (error) {
          console.error("Failed to open capture tab:", error)
          // Don't close UI on error - user can retry
        }
      },
      []
    )

    const handleElementSelect = useCallback(
      async (element: HTMLElement, rect: DOMRect) => {
        // Stay in element mode - user can continue selecting more elements
        // Capture the element
        try {
          const screenshots = await elementSelectionService.captureElement(
            element,
            {
              type: "element",
              includeMetadata: true,
              preserveOriginalAspect: true
            },
            rect
          )

          // Open capture tab with screenshots and element info
          await openCaptureTab(screenshots, element)
        } catch {
          // Even if capture fails, try to open with a fallback
          const fallbackScreenshots: Screenshot[] = [
            {
              dataUrl:
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
              timestamp: Date.now(),
              type: "element" as const,
              metadata: {
                url: window.location.href,
                device: "Desktop",
                browser: "Chrome",
                screenResolution: "1920x1080px",
                viewportSize: "1200x800px"
              }
            }
          ]
          await openCaptureTab(fallbackScreenshots, element)
        }
      },
      [elementSelectionService, openCaptureTab]
    )

    const handleAreaSelect = useCallback(
      async (area: {
        startX: number
        startY: number
        width: number
        height: number
      }) => {
        // Stay in area mode - user can continue selecting more areas
        try {
          const screenshot = await captureService.captureArea(area, {
            type: "area",
            includeMetadata: true,
            preserveOriginalAspect: true
          })

          await openCaptureTab([screenshot])
        } catch {
          // Even if capture fails, try to open with fallback
          const fallbackScreenshots: Screenshot[] = [
            {
              dataUrl:
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
              timestamp: Date.now(),
              type: "area",
              metadata: {
                url: window.location.href,
                device: "Desktop",
                browser: "Chrome",
                screenResolution: "1920x1080px",
                viewportSize: "1200x800px"
              }
            }
          ]
          await openCaptureTab(fallbackScreenshots)
        }
      },
      [captureService, openCaptureTab]
    )

    const handleFullScreenCapture = useCallback(async () => {
      // Stay in fullscreen mode - user can capture again if needed
      try {
        const screenshot = await captureService.captureFullScreen({
          type: "fullscreen",
          includeMetadata: true,
          preserveOriginalAspect: true
        })

        await openCaptureTab([screenshot])
      } catch {
        // Even if capture fails, try to open with fallback
        const fallbackScreenshots: Screenshot[] = [
          {
            dataUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            timestamp: Date.now(),
            type: "fullscreen",
            metadata: {
              url: window.location.href,
              device: "Desktop",
              browser: "Chrome",
              screenResolution: "1920x1080px",
              viewportSize: "1200x800px"
            }
          }
        ]
        await openCaptureTab(fallbackScreenshots)
      }
    }, [captureService, openCaptureTab])

    // Trigger full-screen capture immediately once the mode is active
    useEffect(() => {
      if (!isActive) {
        hasTriggeredFullscreenCapture.current = false
        return
      }

      if (
        captureMode === "fullscreen" &&
        !hasTriggeredFullscreenCapture.current
      ) {
        hasTriggeredFullscreenCapture.current = true
        handleFullScreenCapture()
      }
    }, [captureMode, handleFullScreenCapture, isActive])

    const handleCapture = useCallback(() => {
      switch (captureMode) {
        case "area":
          // Area selection is handled by SelectionOverlay
          break
        case "fullscreen":
          handleFullScreenCapture()
          break
        default:
          // Element mode is handled by ElementHighlighter
          break
      }
    }, [captureMode, handleFullScreenCapture])

    const handleModeChange = useCallback(
      (mode: "pointer" | "element" | "area" | "fullscreen") => {
        setCaptureMode(mode)
        if (mode === "fullscreen") {
          handleFullScreenCapture()
        }
      },
      [handleFullScreenCapture]
    )

    if (!isActive) {
      return null
    }

    return (
      <>
        {/* Floating toolbar */}
        <FloatingToolbar
          onClose={handleClose}
          onCapture={handleCapture}
          onModeChange={handleModeChange}
          activeMode={captureMode || "element"}
        />

        {/* Element highlighter for element selection mode */}
        {captureMode === "element" && (
          <ElementHighlighter
            isActive={true}
            onElementSelect={handleElementSelect}
            onCancel={handleClose}
          />
        )}

        {/* Selection overlay for area capture mode */}
        {captureMode === "area" && (
          <SelectionOverlay
            isActive={true}
            onSelectionComplete={handleAreaSelect}
            onCancel={handleClose}
          />
        )}
      </>
    )
  }
)

EnhancedElementSelector.displayName = "EnhancedElementSelector"

export default EnhancedElementSelector
