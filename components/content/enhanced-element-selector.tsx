import { CaptureService } from "@/lib/capture-service"
import type { CaptureType, Screenshot } from "@/types/capture"
import { memo, useCallback, useEffect, useState } from "react"

import DesignQADialog from "./design-qa-dialog"
import ElementHighlighter from "./element-highlighter"
import FloatingToolbar from "./floating-toolbar"
import SelectionOverlay from "./selection-overlay"

type CaptureMode = "element" | "area" | "fullscreen" | null

interface EnhancedElementSelectorProps {
  initialMode?: CaptureMode
}

const EnhancedElementSelector = memo(
  ({ initialMode = "element" }: EnhancedElementSelectorProps) => {
    const [isActive, setIsActive] = useState(false)
    const [captureMode, setCaptureMode] = useState<CaptureMode>(null)
    const [screenshots, setScreenshots] = useState<Screenshot[]>([])
    const [showDialog, setShowDialog] = useState(false)
    const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(
      null
    )

    const captureService = CaptureService.getInstance()

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
    }, [])

    const handleElementSelect = useCallback(
      async (element: HTMLElement, rect: DOMRect) => {
        try {
          const screenshots = await captureService.captureElement(element, {
            type: "element",
            includeMetadata: true
          })

          setScreenshots(screenshots)
          setSelectedElement(element)
          setShowDialog(true)
          setIsActive(false)
        } catch (error) {
          console.error("Failed to capture element:", error)
          // Show dialog with fallback data for debugging
          setShowDialog(true)
          setSelectedElement(element)
          setScreenshots([
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
          ])
          setIsActive(false)
        }
      },
      [captureService]
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
            includeMetadata: true
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
          includeMetadata: true
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

    const handleSubmit = useCallback(
      (issueData: any) => {
        // Here you would typically send the issue data to your backend
        console.log("Issue submitted:", issueData)

        // For now, just close the dialog
        setShowDialog(false)
        handleClose()
      },
      [handleClose]
    )

    // Debug logging (temporarily disabled)
    // console.log("EnhancedElementSelector state:", {
    //   isActive,
    //   captureMode,
    //   showDialog,
    //   screenshotsLength: screenshots.length
    // })

    if (!isActive && !showDialog) return null

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
        {showDialog && (
          <DesignQADialog
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
            onClose={() => setShowDialog(false)}
            onSubmit={handleSubmit}
          />
        )}
      </>
    )
  }
)

EnhancedElementSelector.displayName = "EnhancedElementSelector"

export default EnhancedElementSelector
