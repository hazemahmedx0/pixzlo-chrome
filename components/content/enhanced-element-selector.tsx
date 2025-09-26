import { CaptureService } from "@/lib/capture-service"
import { ElementSelectionService } from "@/lib/element-selection-service"
import type { CaptureType, Screenshot } from "@/types/capture"
import { memo, useCallback, useEffect, useRef, useState } from "react"

import ElementHighlighter from "./element-highlighter"
import FloatingToolbar from "./floating-toolbar"
import PixzloDialog from "./pixzlo-dialog"
import SelectionOverlay from "./selection-overlay"

type CaptureMode = "element" | "area" | "fullscreen" | null

interface EnhancedElementSelectorProps {
  initialMode?: CaptureMode
  onReset?: () => void
}

const EnhancedElementSelector = memo(
  ({ initialMode = "element", onReset }: EnhancedElementSelectorProps) => {
    const [isActive, setIsActive] = useState(false)
    const [captureMode, setCaptureMode] = useState<CaptureMode>(null)
    const [screenshots, setScreenshots] = useState<Screenshot[]>([])
    const [showDialog, setShowDialog] = useState(false)
    const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(
      null
    )

    const hasTriggeredFullscreenCapture = useRef(false)

    const captureService = CaptureService.getInstance()
    const elementSelectionService = ElementSelectionService.getInstance()

    // Extension is now controlled by the parent wrapper component

    // Auto-activate when component mounts (since it's now conditionally mounted)
    useEffect(() => {
      setIsActive(true)
      setCaptureMode(initialMode)
      console.log(
        `🟢 Enhanced Element Selector activated with mode: ${initialMode}`
      )
    }, [initialMode])

    const handleClose = useCallback(() => {
      setIsActive(false)
      setCaptureMode(null)
      setScreenshots([])
      setShowDialog(false)
      setSelectedElement(null)
      hasTriggeredFullscreenCapture.current = false

      // Notify parent to reset the mount state
      console.log(
        "🔄 EnhancedElementSelector: Calling onReset to reset parent state"
      )
      onReset?.()
    }, [onReset])

    const handleElementSelect = useCallback(
      async (element: HTMLElement, rect: DOMRect) => {
        console.log(
          "🎯 handleElementSelect called with element:",
          element.tagName,
          element.className
        )
        console.log("🎯 Element rect:", rect)

        // TEMPORARY: Force dialog to open immediately for debugging
        console.log("🔧 DEBUGGING: Forcing dialog to open immediately")
        const fallbackScreenshots = [
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

        setScreenshots(fallbackScreenshots)
        setSelectedElement(element)
        setShowDialog(true)
        setIsActive(false)
        console.log("✅ Force-opened dialog with fallback data")

        // Try capture in background but don't block dialog opening
        try {
          console.log("🚀 Starting element capture in background...")
          const screenshots = await elementSelectionService.captureElement(
            element,
            {
              type: "element",
              includeMetadata: true,
              preserveOriginalAspect: true
            },
            rect
          )

          console.log(
            "✅ Element capture successful, updating screenshots:",
            screenshots.length
          )
          setScreenshots(screenshots)
        } catch (error) {
          console.error(
            "❌ Failed to capture element (but dialog already open):",
            error
          )
        }
      },
      [elementSelectionService]
    )

    const handleAreaSelect = useCallback(
      async (area: {
        startX: number
        startY: number
        width: number
        height: number
      }) => {
        try {
          const screenshot = await captureService.captureArea(area, {
            type: "area",
            includeMetadata: true,
            preserveOriginalAspect: true
          })

          setScreenshots([screenshot])
          setShowDialog(true)
          setIsActive(false)
        } catch (error) {
          console.error("Failed to capture area:", error)
          // Show dialog with fallback data for debugging
          setShowDialog(true)
          setScreenshots([
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
          ])
          setIsActive(false)
        }
      },
      [captureService]
    )

    const handleFullScreenCapture = useCallback(async () => {
      try {
        const screenshot = await captureService.captureFullScreen({
          type: "fullscreen",
          includeMetadata: true,
          preserveOriginalAspect: true
        })

        setScreenshots([screenshot])
        setShowDialog(true)
        setIsActive(false)
      } catch (error) {
        console.error("Failed to capture full screen:", error)
        // Show dialog with fallback data for debugging
        setShowDialog(true)
        setScreenshots([
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
        ])
        setIsActive(false)
      }
    }, [captureService])

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
      (mode: CaptureMode) => {
        setCaptureMode(mode)
        if (mode === "fullscreen") {
          handleFullScreenCapture()
        }
      },
      [handleFullScreenCapture]
    )

    const handleSubmit = useCallback((issueData: any) => {
      // Here you would typically send the issue data to your backend
      console.log("Issue submitted:", issueData)

      // IMPORTANT: Don't automatically close the dialog here!
      // Let the background submission process handle success/error states
      // The dialog should only close when the user explicitly closes it
      // or when there's a successful submission with a copied URL

      console.log(
        "✅ Issue submission initiated - dialog remains open for user feedback"
      )
    }, [])

    // Debug logging
    console.log("🔍 EnhancedElementSelector render state:", {
      isActive,
      captureMode,
      showDialog,
      screenshotsLength: screenshots.length,
      selectedElement: selectedElement?.tagName
    })

    if (!isActive && !showDialog) {
      console.log(
        "🚫 Not rendering - isActive:",
        isActive,
        "showDialog:",
        showDialog
      )
      return null
    }

    return (
      <>
        {/* Floating toolbar */}
        {isActive && (
          <FloatingToolbar
            onClose={handleClose}
            onCapture={handleCapture}
            activeMode={captureMode || "element"}
          />
        )}

        {/* Element highlighter for element selection mode */}
        {isActive && captureMode === "element" && (
          <ElementHighlighter
            isActive={true}
            onElementSelect={handleElementSelect}
            onCancel={handleClose}
          />
        )}

        {/* Selection overlay for area capture mode */}
        {isActive && captureMode === "area" && (
          <SelectionOverlay
            isActive={true}
            onSelectionComplete={handleAreaSelect}
            onCancel={handleClose}
          />
        )}

        {/* Design QA screenshot dialog */}
        {showDialog &&
          (() => {
            console.log("🎨 Rendering PixzloDialog with:", {
              showDialog,
              screenshotsCount: screenshots.length,
              selectedElement: selectedElement?.tagName
            })
            return (
              <PixzloDialog
                screenshots={
                  screenshots.length > 0
                    ? screenshots
                    : [
                        {
                          dataUrl:
                            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                          timestamp: Date.now(),
                          type: "element",
                          metadata: {
                            url: window.location.href,
                            device: "Desktop",
                            browser: "Chrome",
                            screenResolution: "1920x1080px",
                            viewportSize: "1200x800px"
                          }
                        }
                      ]
                }
                selectedElement={selectedElement}
                isOpen={showDialog}
                onClose={() => {
                  console.log("🔄 PixzloDialog onClose called")
                  setShowDialog(false)
                  handleClose()
                }}
                onSubmit={handleSubmit}
              />
            )
          })()}
      </>
    )
  }
)

EnhancedElementSelector.displayName = "EnhancedElementSelector"

export default EnhancedElementSelector
