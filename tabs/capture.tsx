import "globals.css"

import FigmaModalContent from "@/components/content/pixzlo-dialog/figma/figma-modal-content"
import { PageSelector } from "@/components/content/pixzlo-dialog/figma/page-selector"
import FormSection from "@/components/content/pixzlo-dialog/form/form-section"
import ImageSection from "@/components/content/pixzlo-dialog/images/image-section"
import Footer from "@/components/content/pixzlo-dialog/layout/footer"
import Header from "@/components/content/pixzlo-dialog/layout/header"
import TabsSection from "@/components/content/pixzlo-dialog/tabs/tabs-section"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useDialogIntegrationData } from "@/hooks/use-dialog-linear-data"
import { useFigmaAuth } from "@/hooks/use-figma-auth"
import { useFigmaDesigns } from "@/hooks/use-figma-designs"
import type { IssueCreatedResult } from "@/hooks/use-issue-submission-with-preferences"
import { useSessionCSSExtraction } from "@/hooks/use-session-css-extraction"
import { ImageDownloader } from "@/lib/image-download"
import { SessionService } from "@/lib/session-service"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import type { IssueData } from "@/types/capture"
import type { DrawingElement } from "@/types/drawing"
import type { CaptureSessionData } from "@/types/session"
import { X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

/**
 * Capture Tab Page - Dedicated page for editing captures
 *
 * This page is opened after a capture is taken, providing a full-page
 * editing experience instead of an in-page modal overlay.
 *
 * URL format: chrome-extension://[ID]/tabs/capture.html?session=abc123
 */
function CaptureTabPage(): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<CaptureSessionData | null>(
    null
  )

  const activeTab = usePixzloDialogStore((state) => state.activeTab)
  const activeImageIndex = usePixzloDialogStore(
    (state) => state.activeImageIndex
  )
  const includeFullscreen = usePixzloDialogStore(
    (state) => state.includeFullscreen
  )
  const title = usePixzloDialogStore((state) => state.title)
  const description = usePixzloDialogStore((state) => state.description)
  const storeScreenshots = usePixzloDialogStore((state) => state.screenshots)
  const extractedCSS = usePixzloDialogStore((state) => state.extractedCSS)
  const figmaDesign = usePixzloDialogStore((state) => state.figmaDesign)
  const figmaContext = usePixzloDialogStore((state) => state.figmaContext)
  const isFigmaPopupOpen = usePixzloDialogStore(
    (state) => state.isFigmaPopupOpen
  )

  const setActiveTab = usePixzloDialogStore((state) => state.setActiveTab)
  const setActiveImageIndex = usePixzloDialogStore(
    (state) => state.setActiveImageIndex
  )
  const setIncludeFullscreen = usePixzloDialogStore(
    (state) => state.setIncludeFullscreen
  )
  const setTitle = usePixzloDialogStore((state) => state.setTitle)
  const setDescription = usePixzloDialogStore((state) => state.setDescription)
  const setDrawingElements = usePixzloDialogStore(
    (state) => state.setDrawingElements
  )
  const setDrawingOverlayDataUrl = usePixzloDialogStore(
    (state) => state.setDrawingOverlayDataUrl
  )
  const setDrawingOverlayExporter = usePixzloDialogStore(
    (state) => state.setDrawingOverlayExporter
  )
  const setFigmaDesign = usePixzloDialogStore((state) => state.setFigmaDesign)
  const setFigmaContext = usePixzloDialogStore((state) => state.setFigmaContext)
  const setIsFigmaPopupOpen = usePixzloDialogStore(
    (state) => state.setIsFigmaPopupOpen
  )
  const closeDialog = usePixzloDialogStore((state) => state.closeDialog)

  // Load session data once on mount.
  // Uses getState().openDialog to avoid depending on the store action reference.
  useEffect(() => {
    const loadSession = async (): Promise<void> => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const sessionId = urlParams.get("session")

        if (!sessionId) {
          setError("No session ID provided")
          setIsLoading(false)
          return
        }

        const data = await SessionService.loadSession(sessionId)

        if (!data) {
          setError("Session not found or expired")
          setIsLoading(false)
          return
        }

        setSessionData(data)
        // Initialize the dialog store with session data and source URL
        usePixzloDialogStore
          .getState()
          .openDialog(data.screenshots, undefined, data.sourceUrl)

        setIsLoading(false)
      } catch {
        setError("Failed to load session data")
        setIsLoading(false)
      }
    }

    void loadSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount
  }, [])

  // Clean up session storage when the tab is closed (browser X / navigate away)
  useEffect(() => {
    const cleanup = (): void => {
      const urlParams = new URLSearchParams(window.location.search)
      const sessionId = urlParams.get("session")
      if (sessionId) {
        void SessionService.removeSession(sessionId)
      }
    }
    window.addEventListener("pagehide", cleanup)
    return () => window.removeEventListener("pagehide", cleanup)
  }, [])

  // Use the session CSS extraction hook (works with serialized element info)
  useSessionCSSExtraction(sessionData?.selectedElementInfo)

  // Pre-load integration data (Linear + Figma metadata)
  useDialogIntegrationData()

  // Figma designs
  const {
    designs,
    isLoading: designsLoading,
    refreshDesigns
  } = useFigmaDesigns()

  // Figma auth (only for auth completion callback)
  const { checkAuth } = useFigmaAuth()

  // Store ref to the drawing canvas for export
  const drawingCanvasRef = useRef<{
    exportDrawing: (options?: {
      pixelRatio?: number
      mimeType?: string
      quality?: number
    }) => string | null
  } | null>(null)

  useEffect(() => {
    if (storeScreenshots.length === 0) {
      setDrawingOverlayExporter(null)
      return
    }

    const exportOverlay = (): string | null => {
      if (!drawingCanvasRef.current?.exportDrawing) {
        return null
      }

      return drawingCanvasRef.current.exportDrawing({ pixelRatio: 1 })
    }

    setDrawingOverlayExporter(exportOverlay)

    return () => {
      setDrawingOverlayExporter(null)
    }
  }, [setDrawingOverlayExporter, storeScreenshots.length])

  // Handle close - clean up session and close tab, return to source page
  const handleClose = useCallback((): void => {
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get("session")

    if (sessionId) {
      void SessionService.removeSession(sessionId)
    }

    closeDialog()

    // Close this tab and return to source page
    if (sessionData?.sourceTabId) {
      // Focus the source tab first, then close this tab
      chrome.tabs
        .update(sessionData.sourceTabId, { active: true })
        .then(() => {
          // Close the capture tab after focusing source
          window.close()
        })
        .catch(() => {
          // Source tab might not exist anymore, just close this tab
          window.close()
        })
    } else {
      window.close()
    }
  }, [closeDialog, sessionData?.sourceTabId])

  // Handle drawing save
  const handleDrawingSave = useCallback(
    (
      _imageUrl: string,
      elements: DrawingElement[],
      _originalImage: string
    ): void => {
      setDrawingElements(elements)
    },
    [setDrawingElements]
  )

  // Handle Figma design selection
  const handleFigmaDesignSelected = useCallback(
    (
      designData: {
        imageUrl: string
        designName: string
        figmaUrl: string
      },
      contextData?: {
        figmaUrl: string
        fileId: string
        frameId: string
        frameData?: unknown
      }
    ): void => {
      setFigmaDesign(designData)
      if (contextData) {
        setFigmaContext(contextData)
      }
    },
    [setFigmaDesign, setFigmaContext]
  )

  // Handle Figma authentication completion
  const handleAuthCompleted = useCallback(async (): Promise<void> => {
    await checkAuth()
    await refreshDesigns()
  }, [checkAuth, refreshDesigns])

  // Track if we've already refreshed for this popup open session
  const hasRefreshedForPopupRef = useRef(false)

  // Load designs when Figma popup opens
  useEffect(() => {
    if (!isFigmaPopupOpen) {
      hasRefreshedForPopupRef.current = false
      return
    }

    if (hasRefreshedForPopupRef.current || designsLoading) {
      return
    }

    hasRefreshedForPopupRef.current = true
    void refreshDesigns()
  }, [isFigmaPopupOpen, designsLoading, refreshDesigns])

  // Handle image download
  const handleDownload = useCallback(async (): Promise<void> => {
    try {
      const currentScreenshot = storeScreenshots[0]
      if (!currentScreenshot) {
        return
      }

      const originalImageUrl =
        activeImageIndex === 1 && storeScreenshots[1]?.dataUrl
          ? storeScreenshots[1].dataUrl
          : currentScreenshot.dataUrl

      const drawings: DrawingElement[] =
        usePixzloDialogStore.getState().drawingElements

      let drawingOverlay: string | null = null
      if (drawingCanvasRef.current?.exportDrawing) {
        drawingOverlay = drawingCanvasRef.current.exportDrawing({
          pixelRatio: 1
        })
        setDrawingOverlayDataUrl(drawingOverlay)
      }

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
        useComposite: true,
        drawingOverlay
      })
    } catch {
      // Failed to download image
    }
  }, [activeImageIndex, setDrawingOverlayDataUrl, storeScreenshots])

  // Handle submit - would trigger issue creation
  const handleSubmit = useCallback((): void => {
    const state = usePixzloDialogStore.getState()
    const issueData: IssueData | null = state.createIssueData()
    if (issueData) {
      // Issue will be created via the Footer component's submission logic
    }
  }, [])

  // Handle issue created callback
  const handleIssueCreated = useCallback(
    (result?: IssueCreatedResult): void => {
      const sourceTabId = sessionData?.sourceTabId

      const notifySourceTab = async (): Promise<void> => {
        if (!sourceTabId) {
          return
        }

        await new Promise<void>((resolve) => {
          chrome.tabs.sendMessage(
            sourceTabId,
            {
              type: "SHOW_ISSUE_CREATED_TOAST",
              data: {
                issueUrl: result?.issueUrl,
                trackedIssueUrl: result?.trackedIssueUrl,
                copiedToClipboard: result?.copiedToClipboard
              }
            },
            () => {
              resolve()
            }
          )
        })
      }

      void notifySourceTab().finally(() => {
        // Clean up and close after successful issue creation
        handleClose()
      })
    },
    [handleClose, sessionData?.sourceTabId]
  )

  // Get current screenshot and ensure metadata URL is from the source page, not the extension page
  const sourceUrl = sessionData?.sourceUrl
  const currentScreenshot = useMemo(() => {
    const raw = storeScreenshots[0]
    if (!raw) return undefined
    return {
      ...raw,
      metadata: raw.metadata
        ? {
            ...raw.metadata,
            // Use sessionData.sourceUrl as the authoritative URL (set in content script)
            url: sourceUrl || raw.metadata.url
          }
        : undefined
    }
  }, [storeScreenshots, sourceUrl])

  const isElementCapture = currentScreenshot?.type === "element"
  const showStylingTab = isElementCapture

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500" />
          <span className="text-sm text-gray-600">Loading capture...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !currentScreenshot) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-lg font-medium text-gray-900">
            {error || "No capture data found"}
          </h1>
          <p className="max-w-md text-sm text-gray-600">
            The capture session may have expired or the data was not properly
            saved. Please try capturing again.
          </p>
          <button
            onClick={() => window.close()}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            Close Tab
          </button>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-gray-900">
        {/* Header */}
        <Header onClose={handleClose} />

        <div className="flex min-w-0 flex-1 overflow-hidden">
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
          <div className="shrink-0 bg-gray-50 pr-5" style={{ width: "430px" }}>
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
                onIssueCreated={handleIssueCreated}
                issueTitle={title}
                issueDescription={description}
              />
            </div>
          </div>
        </div>

        {/* Figma Design Popup */}
        {isFigmaPopupOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}>
            <div
              className="flex flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl"
              style={{
                width: "90vw",
                height: "90vh",
                maxWidth: "1400px"
              }}
              onClick={(e) => e.stopPropagation()}>
              {/* Header with Page selector */}
              <div className="border-separator flex h-[58px] items-center justify-between border-b px-5">
                <div className="flex items-center gap-3">
                  <PageSelector />
                </div>
                <button
                  onClick={() => setIsFigmaPopupOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Content Area */}
              <div
                className="flex-1 overflow-hidden"
                style={{ height: "calc(100% - 58px)" }}>
                <FigmaModalContent
                  isOpen={isFigmaPopupOpen}
                  onClose={() => setIsFigmaPopupOpen(false)}
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
    </TooltipProvider>
  )
}

export default CaptureTabPage
