// Removed useFigmaDesigns import - designs now passed as props
import { EnhancedFigmaExtractor } from "@/lib/enhanced-figma-utils"
import { FigmaService } from "@/lib/figma-service"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import type { FigmaDesignLink, FigmaFile, FigmaNode } from "@/types/figma"
import { memo, useCallback, useEffect, useMemo, useState } from "react"

import FigmaFrameSelector from "../frame-selector/figma-frame-selector"
import FigmaFrameSelection from "./figma-frame-selection"
import FigmaUrlInput from "./figma-url-input"
import {
  convertTo16x9WithPadding,
  extractFigmaProperties,
  processScreenshotCrop,
  type FigmaContextData
} from "./figma-utils"

interface FigmaDesignManagerProps {
  isOpen: boolean
  onClose: () => void
  onDesignSelected: (
    designData: {
      imageUrl: string
      designName: string
      figmaUrl: string
    },
    contextData?: FigmaContextData
  ) => void
  existingDesigns: FigmaDesignLink[]
  initialContext?: FigmaContextData | null
}

type ViewMode = "add-new" | "select-frame" | "select-element"

/**
 * Main component for managing Figma design integration
 * Orchestrates different views and handles the complete Figma workflow
 */
const FigmaDesignManager = memo(
  ({
    isOpen,
    onClose,
    onDesignSelected,
    existingDesigns,
    initialContext
  }: FigmaDesignManagerProps): JSX.Element => {
    // View state management - always start with add-new, no list view
    const [viewMode, setViewMode] = useState<ViewMode>("add-new")
    const [previousViewMode, setPreviousViewMode] = useState<ViewMode | null>(
      null
    )

    // Flag to prevent API calls when we have cached data (Change design mode)
    const isChangeDesignMode = Boolean(
      initialContext && initialContext.frameImageUrl
    )

    // Form state
    const [figmaUrl, setFigmaUrl] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hasAutoLoadedDesign, setHasAutoLoadedDesign] = useState(false)
    const [isAutoLoading, setIsAutoLoading] = useState(false)

    // Figma data state
    const [figmaFile, setFigmaFile] = useState<FigmaFile | null>(null)
    const [selectedFrame, setSelectedFrame] = useState<FigmaNode | null>(null)
    const [frameImages, setFrameImages] = useState<Record<string, string>>({})
    const [frameData, setFrameData] = useState<any>(null)
    const [frameElements, setFrameElements] = useState<any[]>([])
    const [frameImageUrl, setFrameImageUrl] = useState<string>("")
    const [selectedElement, setSelectedElement] = useState<any>(null)
    const [selectedDesignId, setSelectedDesignId] = useState<string | null>(
      null
    )

    const figmaService = FigmaService.getInstance()

    const selectedDesign = useMemo(() => {
      if (!selectedDesignId) return null
      return (
        existingDesigns.find((design) => design.id === selectedDesignId) || null
      )
    }, [existingDesigns, selectedDesignId])

    // Initialize state from initialContext when changing design
    useEffect(() => {
      if (initialContext && isOpen) {
        console.log("🔄 Initializing from cached context:", initialContext)
        setFigmaUrl(initialContext.figmaUrl)
        setViewMode("select-element")
        setFrameData(initialContext.frameData)

        // Use cached frame image URL - no API calls when changing design
        if (initialContext.frameImageUrl) {
          console.log("🖼️ Using cached frame image URL - no API call needed")
          setFrameImageUrl(initialContext.frameImageUrl)
        } else {
          console.warn(
            "⚠️ No cached frame image URL available - this should not happen when changing design"
          )
        }

        // Use cached frame elements if available
        if (initialContext.frameElements) {
          console.log("🔧 Using cached frame elements")
          setFrameElements(initialContext.frameElements)
        }

        // Set selected element if available
        if (initialContext.selectedElementId) {
          console.log(
            "🎯 Restoring selected element:",
            initialContext.selectedElementId
          )
          // Find and set the selected element
          const selectedElement = initialContext.frameElements?.find(
            (element) => element.id === initialContext.selectedElementId
          )
          if (selectedElement) {
            setSelectedElement(selectedElement)
          }
        }
      }
    }, [initialContext, isOpen, figmaService])

    // Fetch frame images when file is loaded
    useEffect(() => {
      // Prevent API calls when in change design mode
      if (isChangeDesignMode) {
        console.log(
          "🚫 Skipping frame image fetch - in change design mode with cached data"
        )
        return
      }

      if (!figmaFile || viewMode !== "select-frame") return

      const fetchFrameImages = async () => {
        console.log("🎯 Fetching frame images...")

        const images: Record<string, string> = {}
        const frames: FigmaNode[] = []

        // Collect all frames from all pages
        ;(figmaFile as any).pages?.forEach((page: any) => {
          page.children?.forEach((child) => {
            if (child.type === "FRAME") {
              frames.push(child)
            }
          })
        })

        // Fetch images for first few frames (to avoid rate limits)
        const framesToFetch = frames.slice(0, 5)

        for (const frame of framesToFetch) {
          try {
            const response = await figmaService.getFigmaNodeImage(
              (figmaFile as any).id,
              frame.id
            )
            if (response.success && response.data?.imageUrl) {
              images[frame.id] = response.data.imageUrl
            }
          } catch (error) {
            console.error(
              `Failed to fetch image for frame ${frame.name}:`,
              error
            )
          }
        }

        setFrameImages(images)
        console.log("✅ Frame images loaded:", Object.keys(images).length)
      }

      fetchFrameImages()
    }, [figmaFile, viewMode, figmaService, isChangeDesignMode])

    // Event handlers
    const handleCancel = (): void => {
      console.log(
        "🔍 DEBUG: FigmaDesignManager handleCancel called - prefer using existing designs when available"
      )
      if (existingDesigns.length > 0) {
        // Stay in a selection-friendly state using existing designs instead of closing
        setViewMode("select-element")
        setError(null)
        return
      }
      // If no existing designs, close only the figma modal
      onClose()
    }

    const handleAddMoreFrames = (): void => {
      setPreviousViewMode(viewMode)
      setViewMode("add-new")
      setError(null)
      setSelectedDesignId(null)
      setFrameData(null)
      setFrameElements([])
      setFrameImageUrl("")
    }

    const handleBackToPreviousFrame = (): void => {
      if (previousViewMode) {
        setViewMode(previousViewMode)
        setPreviousViewMode(null)
        setError(null)
      }
    }

    const handleBackToUrl = (): void => {
      setViewMode("add-new")
      setFigmaFile(null)
      setSelectedFrame(null)
      setFrameImages({})
      setError(null)
      setSelectedDesignId(null)
    }

    const handleDesignSelect = (design: FigmaDesignLink): void => {
      onDesignSelected({
        imageUrl: design.thumbnail_url || "",
        designName: design.frame_name || "Figma Design",
        figmaUrl: design.frame_url
      })
    }

    const handleFigmaUrlSubmit = useCallback(
      async (overrideUrl?: string): Promise<void> => {
        // Prevent API calls when in change design mode
        if (isChangeDesignMode) {
          console.log(
            "🚫 Skipping API call - in change design mode with cached data"
          )
          return
        }

        console.log(
          "🎯 handleFigmaUrlSubmit called with overrideUrl:",
          overrideUrl
        )
        console.log("🎯 Current figmaUrl state:", figmaUrl)

        const urlCandidate = overrideUrl?.trim() || figmaUrl.trim()
        console.log("🎯 URL candidate:", urlCandidate)

        if (!urlCandidate) {
          console.log("❌ No URL provided")
          setError("Please enter a Figma URL")
          return
        }

        if (!figmaService.isValidFigmaUrl(urlCandidate)) {
          console.log("❌ Invalid Figma URL:", urlCandidate)
          setError("Please enter a valid Figma URL")
          return
        }

        console.log("✅ URL validation passed, proceeding with processing...")

        if (!overrideUrl) {
          setSelectedDesignId(null)
        }
        setFigmaUrl(urlCandidate)

        setIsProcessing(true)
        setError(null)
        setFrameData(null)
        setFrameElements([])
        setFrameImageUrl("")

        try {
          // Check if URL has node-id parameter for direct frame rendering
          const hasNodeId = urlCandidate.includes("node-id=")

          if (hasNodeId) {
            console.log("🎯 URL has node-id, rendering frame directly...")

            // Use background script to render the frame with elements
            const response = await new Promise<{
              success: boolean
              data?: any
              error?: string
            }>((resolve) => {
              try {
                if (!chrome?.runtime?.sendMessage) {
                  resolve({
                    success: false,
                    error: "Chrome extension context not available"
                  })
                  return
                }

                chrome.runtime.sendMessage(
                  {
                    type: "FIGMA_RENDER_FRAME",
                    figmaUrl: urlCandidate
                  },
                  (response) => {
                    if (chrome.runtime.lastError) {
                      console.error(
                        "Chrome runtime error:",
                        chrome.runtime.lastError
                      )
                      resolve({
                        success: false,
                        error:
                          chrome.runtime.lastError.message || "Extension error"
                      })
                    } else {
                      console.log(
                        "✅ Received response from background:",
                        response
                      )
                      resolve(
                        response || { success: false, error: "No response" }
                      )
                    }
                  }
                )
              } catch (error) {
                console.error("❌ Error sending message to background:", error)
                resolve({
                  success: false,
                  error: "Failed to communicate with background script"
                })
              }
            })

            if (!response.success || !response.data) {
              setError(response.error || "Failed to render Figma frame")
              return
            }

            console.log(
              "✅ Frame rendered successfully:",
              response.data.fileName
            )

            try {
              // Store frame data and move to element selection
              console.log(
                "🔄 Setting frame data and switching to element selection..."
              )

              // Check if component is still mounted and dialog is still open
              if (!isOpen) {
                console.warn(
                  "⚠️ Dialog closed during frame processing, aborting state updates"
                )
                return
              }

              setFrameData({
                ...response.data.frameData,
                fileId: response.data.fileId
              })
              setFrameElements(response.data.elements)
              setFrameImageUrl(response.data.imageUrl)
              setViewMode("select-element")
              console.log("✅ Successfully switched to element selection view")
            } catch (error) {
              console.error("❌ Error setting frame data:", error)
              setError("Failed to process frame data")
              return
            }
          } else {
            // No node-id, proceed with normal file fetching
            const parsed = figmaService.parseFigmaUrl(urlCandidate)
            if (!parsed) {
              setError("Invalid Figma URL format")
              return
            }

            console.log("🎯 Fetching Figma file directly via API...")

            // Fetch Figma file using Figma API
            const response = await figmaService.getFigmaFile(parsed.fileId)

            if (!response.success || !response.data) {
              setError(response.error || "Failed to fetch Figma file")
              return
            }

            console.log(
              "✅ Figma file fetched successfully:",
              response.data.name
            )

            // Store the file and move to frame selection
            setFigmaFile(response.data)
            setViewMode("select-frame")
          }
        } catch (err) {
          console.error("❌ Failed to fetch Figma file:", err)
          setError(
            err instanceof Error ? err.message : "Failed to fetch Figma file"
          )
          // Don't close the dialog on error - let user try again
          console.log("🔍 Error occurred but keeping dialog open for retry")
        } finally {
          setIsProcessing(false)
          // Clear figma flow active flag
          try {
            usePixzloDialogStore.getState().setIsFigmaFlowActive(false)
          } catch (error) {
            console.warn("Failed to reset Figma flow flag", error)
          }
        }
      },
      [figmaUrl, figmaService]
    )

    const loadDesignFromLink = useCallback(
      async (design: FigmaDesignLink): Promise<void> => {
        // Prevent API calls when in change design mode
        if (isChangeDesignMode) {
          console.log(
            "🚫 Skipping loadDesignFromLink - in change design mode with cached data"
          )
          return
        }

        setSelectedDesignId(design.id)
        await handleFigmaUrlSubmit(design.frame_url)
      },
      [handleFigmaUrlSubmit, isChangeDesignMode]
    )

    const handleFrameSelect = (frame: FigmaNode): void => {
      setSelectedFrame(frame)
    }

    const handleConfirmFrameSelection = useCallback(async (): Promise<void> => {
      if (!figmaFile || !selectedFrame) return

      setIsProcessing(true)
      setError(null)

      try {
        console.log("🎯 Creating design link with selected frame...")

        const frameUrl = figmaUrl.includes("node-id=")
          ? figmaUrl
          : `${figmaUrl}${figmaUrl.includes("?") ? "&" : "?"}node-id=${encodeURIComponent(selectedFrame.id.replace(/:/g, "-"))}`

        const response = await figmaService.createDirectDesignLink({
          figma_file_id: (figmaFile as any).id,
          figma_frame_id: selectedFrame.id,
          frame_name: selectedFrame.name || "Selected Frame",
          frame_url: frameUrl
        })

        if (response.success) {
          console.log("✅ Design link created successfully")

          setSelectedDesignId(null)
          onDesignSelected({
            imageUrl: "",
            designName: selectedFrame.name || "Selected Frame",
            figmaUrl: frameUrl
          })

          setFigmaUrl("")
          setFigmaFile(null)
          setSelectedFrame(null)
          setHasAutoLoadedDesign(false)
          onClose()
        } else {
          setError(response.error || "Failed to create design link")
        }
      } catch (err) {
        console.error("❌ Failed to create design link:", err)
        setError(
          err instanceof Error ? err.message : "Failed to create design link"
        )
      } finally {
        setIsProcessing(false)
      }
    }, [
      figmaFile,
      selectedFrame,
      figmaUrl,
      figmaService,
      onDesignSelected,
      onClose
    ])

    useEffect(() => {
      if (!isOpen) {
        setHasAutoLoadedDesign(false)
        setSelectedDesignId(null)
        return
      }

      if (
        hasAutoLoadedDesign ||
        isProcessing ||
        viewMode !== "add-new" ||
        existingDesigns.length === 0
      ) {
        return
      }

      const firstDesign = existingDesigns[0]
      if (!firstDesign?.frame_url) {
        return
      }

      console.log(
        "🎯 Auto-loading stored Figma design in modal:",
        firstDesign.frame_url
      )
      setHasAutoLoadedDesign(true)
      setIsAutoLoading(true)
      loadDesignFromLink(firstDesign).finally(() => {
        setIsAutoLoading(false)
      })
    }, [
      existingDesigns,
      loadDesignFromLink,
      hasAutoLoadedDesign,
      isOpen,
      isProcessing,
      viewMode
    ])

    const handleElementSelect = async (
      element: any,
      frameImage: HTMLImageElement | null
    ): Promise<void> => {
      if (!frameData) {
        console.error("❌ handleElementSelect error: frameData is not set.")
        setError("Critical error: Frame data is missing.")
        return
      }

      console.log("🎯 Element selected for screenshot capture:", {
        element: element,
        frameData: frameData
      })

      // Store the selected element for context caching
      setSelectedElement(element)

      setIsProcessing(true)
      setError(null)

      try {
        console.log(
          "🎯 Using @reviewit-style screenshot capture with 40px margin..."
        )

        // Calculate element position in the displayed frame image
        if (!frameImage) {
          throw new Error("Frame image DOM element was not provided.")
        }

        const frameImageRect = frameImage.getBoundingClientRect()
        const scaleX =
          frameImageRect.width / frameData.absoluteBoundingBox.width
        const scaleY =
          frameImageRect.height / frameData.absoluteBoundingBox.height

        // Calculate element position in the displayed image
        const elementRelativeX =
          (element.absoluteBoundingBox.x - frameData.absoluteBoundingBox.x) *
          scaleX
        const elementRelativeY =
          (element.absoluteBoundingBox.y - frameData.absoluteBoundingBox.y) *
          scaleY
        const elementWidth = element.absoluteBoundingBox.width * scaleX
        const elementHeight = element.absoluteBoundingBox.height * scaleY

        // Calculate capture area with padding
        const PADDING = 40
        const captureArea = {
          x: Math.max(0, frameImageRect.left + elementRelativeX - PADDING),
          y: Math.max(0, frameImageRect.top + elementRelativeY - PADDING),
          width: Math.min(elementWidth + PADDING * 2, window.innerWidth),
          height: Math.min(elementHeight + PADDING * 2, window.innerHeight)
        }

        console.log("📏 Calculated capture area:", captureArea)

        // Request screenshot from background
        const response = await new Promise<{
          success: boolean
          screenshotDataUrl?: string
          error?: string
        }>((resolve) => {
          chrome.runtime.sendMessage(
            {
              type: "CAPTURE_ELEMENT_SCREENSHOT",
              area: captureArea,
              scrollPosition: {
                x: window.scrollX,
                y: window.scrollY
              }
            },
            (response) => {
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || "Extension error"
                })
              } else {
                resolve(response || { success: false, error: "No response" })
              }
            }
          )
        })

        if (!response.success || !response.screenshotDataUrl) {
          setError(response.error || "Failed to capture screenshot")
          return
        }

        console.log("✅ Screenshot captured, processing...")

        // Crop screenshot to element area
        const croppedImageUrl = await processScreenshotCrop(
          response.screenshotDataUrl,
          captureArea
        )
        console.log("✅ Element cropped from screenshot")

        // Convert to 16:9 aspect ratio with gray background
        const processedImageUrl =
          await convertTo16x9WithPadding(croppedImageUrl)
        console.log("🎨 16:9 conversion complete.")

        const designData = {
          imageUrl: processedImageUrl,
          designName: element.name || "Figma Element",
          figmaUrl: figmaUrl
        }

        console.log(
          "🎯 Calling onDesignSelected with processed image data:",
          designData
        )

        // Extract properties from selected element for comparison using enhanced extractor
        const getAllElementsRecursive = (node: any): any[] => {
          const elements = [node]
          if (node.children) {
            for (const child of node.children) {
              elements.push(...getAllElementsRecursive(child))
            }
          }
          return elements
        }

        const allFrameElements = getAllElementsRecursive(frameData)
        const figmaProperties =
          EnhancedFigmaExtractor.extractEnhancedProperties(
            element,
            allFrameElements
          )
        console.log("🎨 Enhanced Figma properties:", figmaProperties)

        // Also keep legacy extraction for backward compatibility debugging
        const legacyProperties = extractFigmaProperties(element)
        console.log(
          "🎨 Legacy Figma properties (for comparison):",
          legacyProperties
        )

        // Return the processed element as a design selection
        const contextData: FigmaContextData = {
          figmaUrl: figmaUrl,
          fileId: figmaService.parseFigmaUrl(figmaUrl)?.fileId || "",
          frameId: frameData?.id || "",
          frameData: frameData,
          selectedElementProperties: figmaProperties,
          frameImageUrl: frameImageUrl, // Cache the frame image URL
          frameElements: frameElements, // Cache the frame elements
          selectedElementId: selectedElement?.id // Store the selected element ID
        }

        onDesignSelected(designData, contextData)

        console.log(
          "🔍 DEBUG: Calling onClose after element selection (should only close Figma popup)"
        )
        onClose()
      } catch (err) {
        console.error("❌ Failed to capture element:", err)
        setError(
          err instanceof Error ? err.message : "Failed to capture element"
        )
      } finally {
        setIsProcessing(false)
      }
    }

    // Show loading state when auto-loading designs
    if (isAutoLoading) {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-gray-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
            <span className="text-sm font-medium">
              Loading existing design...
            </span>
          </div>
        </div>
      )
    }

    // Render appropriate view based on current mode
    return (
      <div className="custom-scrollbar flex h-full w-full">
        {viewMode === "add-new" && (
          <FigmaUrlInput
            figmaUrl={figmaUrl}
            setFigmaUrl={setFigmaUrl}
            isProcessing={isProcessing}
            error={error}
            onSubmit={handleFigmaUrlSubmit}
            onCancel={handleCancel}
            showCancel={true}
            onBack={previousViewMode ? handleBackToPreviousFrame : undefined}
            showBack={previousViewMode !== null}
          />
        )}

        {viewMode === "select-frame" && figmaFile && (
          <FigmaFrameSelection
            figmaFile={figmaFile}
            selectedFrame={selectedFrame}
            frameImages={frameImages}
            isProcessing={isProcessing}
            error={error}
            onFrameSelect={handleFrameSelect}
            onConfirm={handleConfirmFrameSelection}
            onBack={handleBackToUrl}
          />
        )}

        {viewMode === "select-element" &&
          (frameData && frameImageUrl ? (
            <FigmaFrameSelector
              imageUrl={frameImageUrl}
              elements={frameElements}
              frameData={frameData}
              onElementSelect={handleElementSelect}
              onCancel={handleCancel}
              onAddFrame={handleAddMoreFrames}
              onRefreshFrames={async () => {
                if (selectedDesign) {
                  await loadDesignFromLink(selectedDesign)
                  return
                }
                if (frameData?.id) {
                  try {
                    setIsProcessing(true)
                    const response = await figmaService.getFigmaNodeImage(
                      frameData.fileId ||
                        figmaService.parseFigmaUrl(figmaUrl)?.fileId ||
                        "",
                      frameData.id
                    )
                    if (response.success && response.data?.imageUrl) {
                      setFrameImageUrl(response.data.imageUrl)
                    }
                  } catch (error) {
                    console.error("Failed to refresh frame:", error)
                  } finally {
                    setIsProcessing(false)
                  }
                }
              }}
              onOpenInFigma={(designUrl) => {
                window.open(designUrl, "_blank")
              }}
              onFrameSwitch={async ({ id }) => {
                const design = existingDesigns.find((item) => item.id === id)
                if (design) {
                  await loadDesignFromLink(design)
                }
              }}
              availableFrames={existingDesigns.map((design) => ({
                id: design.id,
                name: design.frame_name || "Unnamed Frame",
                figmaUrl: design.frame_url,
                imageUrl: design.thumbnail_url || "",
                fileId: design.figma_file_id
              }))}
              currentFrame={
                selectedDesign
                  ? {
                      id: selectedDesign.id,
                      name:
                        selectedDesign.frame_name ||
                        frameData?.name ||
                        "Current Frame",
                      figmaUrl: selectedDesign.frame_url,
                      imageUrl:
                        frameImageUrl || selectedDesign.thumbnail_url || "",
                      fileId: selectedDesign.figma_file_id
                    }
                  : frameData
                    ? {
                        id: frameData.id,
                        name: frameData.name || "Current Frame",
                        figmaUrl: figmaUrl,
                        imageUrl: frameImageUrl,
                        fileId:
                          frameData.fileId ||
                          figmaService.parseFigmaUrl(figmaUrl)?.fileId ||
                          ""
                      }
                    : undefined
              }
              isProcessing={isProcessing}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                <span className="text-sm font-medium">
                  Loading design preview...
                </span>
              </div>
            </div>
          ))}
      </div>
    )
  }
)

FigmaDesignManager.displayName = "FigmaDesignManager"

export default FigmaDesignManager
