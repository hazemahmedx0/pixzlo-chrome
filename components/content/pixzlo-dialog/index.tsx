import { useCSSExtraction } from "@/hooks/use-css-extraction"
import { useDialogIntegrationData } from "@/hooks/use-dialog-linear-data"
import { useDialogSubmission } from "@/hooks/use-dialog-submission"
import { useFigmaAuth } from "@/hooks/use-figma-auth"
import { useFigmaDesigns } from "@/hooks/use-figma-designs"
import { ImageDownloader } from "@/lib/image-download"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import type { IssueData, Screenshot } from "@/types/capture"
import type { DrawingElement } from "@/types/drawing"
import { FigmaLogoIcon } from "@phosphor-icons/react"
import { X } from "lucide-react"
import { memo, useCallback, useEffect, useRef } from "react"

import FigmaModalContent from "./figma/figma-modal-content"
import FormSection from "./form/form-section"
import ImageSection from "./images/image-section"
import Footer from "./layout/footer"
import Header from "./layout/header"
import TabsSection from "./tabs/tabs-section"

interface PixzloDialogProps {
  screenshots: Screenshot[]
  isOpen: boolean
  onClose: () => void
  onSubmit?: (issueData: IssueData) => void
  selectedElement?: HTMLElement
}

const PixzloDialog = memo(
  ({
    screenshots,
    isOpen,
    onClose,
    onSubmit,
    selectedElement
  }: PixzloDialogProps): JSX.Element | null => {
    const {
      activeTab,
      activeImageIndex,
      includeFullscreen,
      title,
      description,
      screenshots: storeScreenshots,
      extractedCSS,
      drawingElements,
      figmaDesign,
      figmaContext,
      isFigmaPopupOpen,
      setActiveTab,
      setActiveImageIndex,
      setIncludeFullscreen,
      setTitle,
      setDescription,
      setDrawingElements,
      setFigmaDesign,
      setFigmaContext,
      setIsFigmaPopupOpen,
      openDialog,
      closeDialog
    } = usePixzloDialogStore()

    // Initialize dialog when props change
    useEffect(() => {
      if (isOpen && screenshots.length > 0) {
        openDialog(screenshots, selectedElement)
      }
    }, [isOpen, screenshots, selectedElement, openDialog])

    // Extract CSS when element is provided
    useCSSExtraction()

    // Pre-load integration data (Linear + Figma metadata) when dialog opens
    useDialogIntegrationData()

    // Handle submission
    const { handleSubmit } = useDialogSubmission(onSubmit)

    // Figma designs
    const {
      designs,
      hasDesigns,
      isLoading: designsLoading,
      refreshDesigns
    } = useFigmaDesigns()

    // Figma auth (only for auth completion callback)
    const { checkAuth } = useFigmaAuth()

    // Handle close
    const handleClose = (): void => {
      console.log(
        "🔍 DEBUG: Main dialog handleClose called - closing entire dialog"
      )
      closeDialog()
      onClose()
    }

    // Store ref to the drawing canvas for export
    const drawingCanvasRef = useRef<any>(null)

    // Handle drawing save
    const handleDrawingSave = (
      imageUrl: string,
      elements: DrawingElement[],
      originalImage: string
    ): void => {
      console.log("Drawing saved:", { imageUrl, elements, originalImage })
      setDrawingElements(elements)
      try {
        // Export drawing overlay from Konva if available and store globally
        if (
          drawingCanvasRef.current &&
          drawingCanvasRef.current.exportDrawing
        ) {
          const overlay = drawingCanvasRef.current.exportDrawing()
          usePixzloDialogStore.getState().setDrawingOverlayDataUrl(overlay)
        }
      } catch (error) {
        console.warn("Failed to export drawing overlay:", error)
      }
    }

    // Handle Figma design selection
    const handleFigmaDesignSelected = (
      designData: {
        imageUrl: string
        designName: string
        figmaUrl: string
      },
      contextData?: {
        figmaUrl: string
        fileId: string
        frameId: string
        frameData?: any
      }
    ): void => {
      console.log("✅ Figma design received in main dialog:", designData)
      console.log("🔄 Current figmaDesign state:", figmaDesign)

      // Store the selected design in the Zustand store
      setFigmaDesign(designData)

      // Store the context data for future "change design" operations
      if (contextData) {
        setFigmaContext(contextData)
        console.log("🔄 Figma context stored:", contextData)
      }

      console.log("🔄 Figma design stored in Zustand store")
    }

    // Handle Figma authentication completion
    const handleAuthCompleted = async (): Promise<void> => {
      console.log(
        "🎯 Figma auth completed, refreshing auth status and designs..."
      )
      // Refresh authentication status
      await checkAuth()
      // Refresh designs
      await refreshDesigns()
      // Don't close the modal, let it switch to design selection
    }

    // Track if we've already refreshed for this popup open session
    const hasRefreshedForPopupRef = useRef(false)

    // Load designs when Figma popup opens - ALWAYS refresh to get latest data from backend
    useEffect(() => {
      if (!isFigmaPopupOpen) {
        // Reset the flag when popup closes so next open will refresh
        hasRefreshedForPopupRef.current = false
        return
      }

      // Only refresh once per popup open to prevent infinite loops
      if (hasRefreshedForPopupRef.current || designsLoading) {
        return
      }

      hasRefreshedForPopupRef.current = true
      console.log("🎯 Figma popup opened - refreshing designs from backend...")
      void refreshDesigns()
    }, [isFigmaPopupOpen, designsLoading, refreshDesigns])

    // Handle image download
    const handleDownload = useCallback(async (): Promise<void> => {
      try {
        const currentScreenshot = storeScreenshots[0]
        if (!currentScreenshot) {
          console.error("No screenshot available for download")
          return
        }

        // Get the current image URL (use highlighted version if selected, otherwise original)
        const originalImageUrl =
          activeImageIndex === 1 && storeScreenshots[1]?.dataUrl
            ? storeScreenshots[1].dataUrl
            : currentScreenshot.dataUrl

        // Get current drawings from the store
        const drawings: DrawingElement[] = drawingElements

        // Export drawing overlay from Konva if available
        let drawingOverlay: string | null = null
        if (
          drawingCanvasRef.current &&
          drawingCanvasRef.current.exportDrawing
        ) {
          // Force a small delay to ensure all drawings are rendered
          await new Promise((resolve) => setTimeout(resolve, 100))
          drawingOverlay = drawingCanvasRef.current.exportDrawing()
          console.log(
            "Exported drawing overlay:",
            drawingOverlay ? "Success" : "Failed"
          )
        }

        console.log("Downloading image with:", {
          originalImageUrl,
          drawingsCount: drawings.length,
          hasDrawingOverlay: !!drawingOverlay
        })

        // Use the composite image URL which matches the drawing canvas dimensions
        const compositeImageUrl =
          storeScreenshots[activeImageIndex]?.compositeImageUrl ||
          originalImageUrl

        await ImageDownloader.downloadImage({
          imageUrl: compositeImageUrl,
          drawings,
          aspectRatio: [16, 9],
          minWidth: 300,
          minHeight: 168,
          fileName: `pixzlo-capture-${Date.now()}.png`,
          useComposite: true, // Use the composite image that matches drawing canvas
          drawingOverlay // Pass the Konva export
        })

        console.log("Image downloaded successfully")
      } catch (error) {
        console.error("Failed to download image:", error)
      }
    }, [activeImageIndex, storeScreenshots, drawingElements])

    const currentScreenshot = storeScreenshots[0]
    const isElementCapture = currentScreenshot?.type === "element"
    const showStylingTab = isElementCapture

    console.log("🎨 PixzloDialog render check:", {
      isOpen,
      currentScreenshot: !!currentScreenshot,
      storeScreenshotsLength: storeScreenshots.length,
      propsScreenshotsLength: screenshots.length
    })

    if (!isOpen || !currentScreenshot) {
      console.log(
        "🚫 PixzloDialog not rendering - isOpen:",
        isOpen,
        "currentScreenshot:",
        !!currentScreenshot
      )
      return null
    }

    return (
      <div
        className="fixed inset-0 z-[2147483647] flex text-gray-900"
        data-pixzlo-ui="pixzlo-dialog"
        style={{
          position: "fixed",
          top: "0",
          left: "0",
          right: "0",
          bottom: "0",
          backgroundColor: "rgba(0, 0, 0, 0.3)", // 30% black background
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
          pointerEvents: "none" // Allow clicks to pass through to the host page
        }}>
        <div
          className="flex flex-col overflow-hidden rounded-lg bg-white shadow-lg"
          style={{
            position: "fixed",
            top: "40px",
            left: "40px",
            right: "40px",
            bottom: "40px",
            width: "calc(100vw - 80px)",
            height: "calc(100vh - 80px)",
            pointerEvents: "auto" // Enable interactions on the dialog content
          }}>
          <div className="flex h-full flex-col">
            {/* Header */}
            <Header onClose={handleClose} />

            <div className="flex flex-1 overflow-hidden">
              {/* Left side - Images */}
              <ImageSection
                screenshots={storeScreenshots}
                activeImageIndex={activeImageIndex}
                includeFullscreen={includeFullscreen}
                onImageSelect={setActiveImageIndex}
                onIncludeFullscreenChange={setIncludeFullscreen}
                onDrawingSave={handleDrawingSave}
                onFigmaDesignSelected={handleFigmaDesignSelected}
                drawingCanvasRef={drawingCanvasRef}
                figmaDesign={figmaDesign}
                figmaDesigns={designs}
                isLoadingFigmaDesigns={designsLoading}
              />

              {/* Right side - Form and Details */}
              <div className="bg-gray-50 pr-5" style={{ width: "430px" }}>
                <div className="flex h-full flex-col">
                  {/* Title and Description */}
                  <FormSection
                    title={title}
                    description={description}
                    onTitleChange={setTitle}
                    onDescriptionChange={setDescription}
                  />

                  {/* Tabs section */}
                  <TabsSection
                    activeTab={activeTab}
                    showStylingTab={showStylingTab}
                    extractedCSS={extractedCSS}
                    currentScreenshot={currentScreenshot}
                    onTabChange={setActiveTab}
                    figmaProperties={figmaContext?.selectedElementProperties}
                  />

                  {/* Footer buttons */}
                  <Footer
                    onCancel={handleClose}
                    onSubmit={handleSubmit}
                    issueTitle={title}
                    issueDescription={description}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Figma Design Popup - overlay when changing design */}
        {isFigmaPopupOpen && (
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{
              zIndex: 2147483649, // Higher than main dialog
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.3)", // Additional 30% black background
              pointerEvents: "none" // Allow clicks to pass through to the host page
            }}
            data-pixzlo-ui="figma-popup-overlay">
            {/* Modal Content */}
            <div
              className="flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
              style={{
                position: "fixed",
                top: "5vh",
                left: "5vw",
                right: "5vw",
                bottom: "5vh",
                width: "90vw",
                height: "90vh",
                maxHeight: "90vh",
                zIndex: 10,
                pointerEvents: "auto" // Enable clicks on modal
              }}
              onClick={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <div className="border-separator flex h-[58px] items-center justify-between gap-2 border-b p-5">
                <div className="flex items-center text-paragraph-md text-gray-850">
                  <FigmaLogoIcon
                    className="mr-3 text-gray-500"
                    size={16}
                    weight="duotone"
                  />{" "}
                  Select design
                </div>
                <button
                  onClick={() => setIsFigmaPopupOpen(false)}
                  className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-gray-500 shadow-sm transition-colors hover:bg-white hover:text-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Content Area with proper height constraints */}
              <div
                className="flex-1 overflow-hidden"
                style={{ height: "calc(100% - 58px)" }}
                data-scrollable="true"
                onWheel={(e) => e.stopPropagation()}>
                <FigmaModalContent
                  isOpen={isFigmaPopupOpen}
                  onClose={() => {
                    console.log(
                      "🔍 DEBUG: Figma popup onClose called - closing only Figma popup"
                    )
                    setIsFigmaPopupOpen(false)
                  }}
                  onDesignSelected={handleFigmaDesignSelected}
                  existingDesigns={designs}
                  initialContext={figmaContext}
                  onAuthCompleted={handleAuthCompleted}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
)

PixzloDialog.displayName = "PixzloDialog"

export default PixzloDialog
