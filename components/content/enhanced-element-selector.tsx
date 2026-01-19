import { Toaster } from "@/components/ui/sonner"
import { CaptureService } from "@/lib/capture-service"
import { ElementSelectionService } from "@/lib/element-selection-service"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import type { CaptureType, Screenshot } from "@/types/capture"
import { memo, useCallback, useEffect, useRef, useState } from "react"

import ElementHighlighter from "./element-highlighter"
import FloatingToolbar from "./floating-toolbar"
import PixzloDialog from "./pixzlo-dialog"
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
    }, [initialMode])

    const handleClose = useCallback(() => {
      setIsActive(false)
      setCaptureMode(null)
      setScreenshots([])
      setShowDialog(false)
      setSelectedElement(null)
      hasTriggeredFullscreenCapture.current = false

      // Notify parent to reset the mount state
      onReset?.()
    }, [onReset])

    const handleElementSelect = useCallback(
      async (element: HTMLElement, rect: DOMRect) => {
        // Force dialog to open immediately
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

        // Try capture in background but don't block dialog opening
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

          setScreenshots(screenshots)
        } catch {
          // Failed to capture element (but dialog already open)
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
        } catch {
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
      } catch {
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
      (mode: "pointer" | "element" | "area" | "fullscreen") => {
        setCaptureMode(mode)
        if (mode === "fullscreen") {
          handleFullScreenCapture()
        }
      },
      [handleFullScreenCapture]
    )

    const handleSubmit = useCallback((issueData: any) => {
      // Here you would typically send the issue data to your backend
      // IMPORTANT: Don't automatically close the dialog here!
      // Let the background submission process handle success/error states
      // The dialog should only close when the user explicitly closes it
      // or when there's a successful submission with a copied URL
    }, [])

    // Handle successful issue creation - close dialog but keep extension active
    const handleIssueCreated = useCallback(() => {
      // Reset the store form data and close dialog state
      const store = usePixzloDialogStore.getState()
      store.resetForm()
      store.closeDialog()

      // Close the dialog in local state
      setShowDialog(false)
      setScreenshots([])
      setSelectedElement(null)
      // Re-enable selection mode so user can select another element
      setIsActive(true)
      setCaptureMode(initialMode)
      hasTriggeredFullscreenCapture.current = false
    }, [initialMode])

    if (!isActive && !showDialog) {
      return null
    }

    return (
      <>
        {/* Floating toolbar */}
        {isActive && (
          <FloatingToolbar
            onClose={handleClose}
            onCapture={handleCapture}
            onModeChange={handleModeChange}
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
              setShowDialog(false)
              handleClose()
            }}
            onSubmit={handleSubmit}
            onIssueCreated={handleIssueCreated}
          />
        )}

        {/* Toast notifications */}
        <Toaster />
      </>
    )
  }
)

EnhancedElementSelector.displayName = "EnhancedElementSelector"

export default EnhancedElementSelector
