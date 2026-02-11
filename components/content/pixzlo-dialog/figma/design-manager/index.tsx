// Removed useFigmaDesigns import - designs now passed as props
import { EnhancedFigmaExtractor } from "@/lib/enhanced-figma-utils"
import { FigmaService } from "@/lib/figma-service"
import { useFigmaDataStore } from "@/stores/figma-data"
import { useFigmaToolbarStore } from "@/stores/figma-toolbar"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import type { FigmaDesignLink, FigmaFile, FigmaNode } from "@/types/figma"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"

import FigmaFrameSelector from "../frame-selector/figma-frame-selector"
import FigmaFrameSelection from "./figma-frame-selection"
import FigmaUrlInput from "./figma-url-input"
import {
  convertTo16x9WithPadding,
  cropImageFromSource,
  extractFigmaProperties,
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
  existingDesigns?: FigmaDesignLink[]
  initialContext?: FigmaContextData | null
}

type ViewMode = "add-new" | "select-frame" | "select-element"

type FigmaDesignReference = Pick<
  FigmaDesignLink,
  | "id"
  | "figma_file_id"
  | "figma_frame_id"
  | "frame_name"
  | "frame_url"
  | "thumbnail_url"
>

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
    const figmaUrlRequestRef = useRef<string | null>(null)
    const figmaUrlRef = useRef(figmaUrl)
    figmaUrlRef.current = figmaUrl
    const autoLoadTriggeredRef = useRef(false)
    const previousDesignCountRef = useRef(0)
    const initialContextLoadRef = useRef(false)

    // Request cancellation: use a request ID to track and cancel stale requests
    const currentRequestIdRef = useRef<number>(0)

    const { metadata, isLoadingMetadata, refreshMetadata } = useFigmaDataStore()
    const { setCurrentFrame, replaceFrames } = useFigmaToolbarStore()
    const figmaService = FigmaService.getInstance()
    const localFigmaDesigns = usePixzloDialogStore(
      (state) => state.localFigmaDesigns
    )
    const addLocalFigmaDesign = usePixzloDialogStore(
      (state) => state.addLocalFigmaDesign
    )
    const needsFigmaMetadataRefresh = usePixzloDialogStore(
      (state) => state.needsFigmaMetadataRefresh
    )
    const setNeedsFigmaMetadataRefresh = usePixzloDialogStore(
      (state) => state.setNeedsFigmaMetadataRefresh
    )

    // Use metadata.designLinks from store directly for immediate reactivity
    // This ensures the component sees new designs immediately after refreshMetadata
    // without waiting for parent component re-render to pass updated props
    const remoteDesigns = useMemo<FigmaDesignReference[]>(
      () => metadata.designLinks ?? existingDesigns ?? [],
      [metadata.designLinks, existingDesigns]
    )

    const preferredFrameId = metadata.preference?.lastUsedFrameId ?? null

    const orderedRemoteDesigns = useMemo<FigmaDesignReference[]>(() => {
      if (!preferredFrameId) {
        return remoteDesigns
      }

      const preferredIndex = remoteDesigns.findIndex(
        (design) =>
          design.figma_frame_id === preferredFrameId ||
          design.id === preferredFrameId
      )

      if (preferredIndex <= 0) {
        return remoteDesigns
      }

      const preferredDesign = remoteDesigns[preferredIndex]
      return [
        preferredDesign,
        ...remoteDesigns.slice(0, preferredIndex),
        ...remoteDesigns.slice(preferredIndex + 1)
      ]
    }, [remoteDesigns, preferredFrameId])

    const filteredLocalDesigns = useMemo<FigmaDesignReference[]>(() => {
      if (localFigmaDesigns.length === 0) {
        return []
      }

      return localFigmaDesigns.filter(
        (localDesign) =>
          !remoteDesigns.some(
            (remoteDesign) =>
              remoteDesign.figma_frame_id === localDesign.figma_frame_id ||
              remoteDesign.frame_url === localDesign.frame_url
          )
      )
    }, [localFigmaDesigns, remoteDesigns])

    const availableDesigns = useMemo<FigmaDesignReference[]>(() => {
      if (filteredLocalDesigns.length === 0) {
        return orderedRemoteDesigns
      }
      return [...orderedRemoteDesigns, ...filteredLocalDesigns]
    }, [orderedRemoteDesigns, filteredLocalDesigns])

    const availableFrameOptions = useMemo(() => {
      return availableDesigns.map((design) => ({
        id: design.id, // Use database ID for uniqueness (allows duplicate Figma frames)
        name: design.frame_name || "Unnamed Frame",
        figmaUrl: design.frame_url,
        imageUrl: design.thumbnail_url || "",
        fileId: design.figma_file_id,
        figmaFrameId: design.figma_frame_id // Keep Figma frame ID for preference matching
      }))
    }, [availableDesigns])

    const orderDesignLinks = useCallback(
      (designs: FigmaDesignLink[]) => {
        if (!preferredFrameId) {
          return designs
        }

        const preferredIndex = designs.findIndex(
          (design) =>
            design.figma_frame_id === preferredFrameId ||
            design.id === preferredFrameId
        )

        if (preferredIndex <= 0) {
          return designs
        }

        const preferredDesign = designs[preferredIndex]
        return [
          preferredDesign,
          ...designs.slice(0, preferredIndex),
          ...designs.slice(preferredIndex + 1)
        ]
      },
      [preferredFrameId]
    )

    const selectedDesign = useMemo(() => {
      if (!selectedDesignId) return null
      return (
        availableDesigns.find((design) => design.id === selectedDesignId) ||
        null
      )
    }, [availableDesigns, selectedDesignId])

    const currentFrameOption = useMemo(() => {
      if (selectedDesign) {
        return {
          id: selectedDesign.id, // Use database ID for uniqueness
          name: selectedDesign.frame_name || frameData?.name || "Current Frame",
          figmaUrl: selectedDesign.frame_url,
          imageUrl: frameImageUrl || selectedDesign.thumbnail_url || "",
          fileId: selectedDesign.figma_file_id,
          figmaFrameId: selectedDesign.figma_frame_id // Keep Figma frame ID
        }
      }

      if (frameData) {
        const matchedDesign = availableDesigns.find(
          (design) =>
            design.figma_frame_id === frameData.id ||
            design.frame_url === figmaUrl
        )

        if (matchedDesign) {
          return {
            id: matchedDesign.id,
            name: matchedDesign.frame_name || frameData.name || "Current Frame",
            figmaUrl: matchedDesign.frame_url,
            imageUrl: frameImageUrl || matchedDesign.thumbnail_url || "",
            fileId: matchedDesign.figma_file_id,
            figmaFrameId: matchedDesign.figma_frame_id
          }
        }

        return {
          id: frameData.id,
          name: frameData.name || "Current Frame",
          figmaUrl: figmaUrl,
          imageUrl: frameImageUrl,
          fileId:
            frameData.fileId ||
            figmaService.parseFigmaUrl(figmaUrl)?.fileId ||
            "",
          figmaFrameId: frameData.id // For new frames, use frame ID as figmaFrameId
        }
      }

      return undefined
    }, [
      selectedDesign,
      frameData,
      frameImageUrl,
      figmaUrl,
      figmaService,
      availableDesigns
    ])

    const addLocalDesign = useCallback(
      (design: {
        fileId: string
        frameId: string
        frameName?: string | null
        frameUrl: string
        thumbnailUrl?: string
      }): void => {
        if (!design.fileId || !design.frameId || !design.frameUrl) {
          return
        }

        const alreadyLinked = remoteDesigns.some(
          (existing) =>
            existing.figma_frame_id === design.frameId ||
            existing.frame_url === design.frameUrl
        )
        if (alreadyLinked) {
          return
        }

        addLocalFigmaDesign({
          id: `local-${design.fileId}-${design.frameId}`,
          figma_file_id: design.fileId,
          figma_frame_id: design.frameId,
          frame_name: design.frameName || "Selected Frame",
          frame_url: design.frameUrl,
          thumbnail_url: design.thumbnailUrl
        })
      },
      [addLocalFigmaDesign, remoteDesigns]
    )

    // Sync selectedDesignId to match existing design when reopening
    useEffect(() => {
      if (!isOpen || !initialContext || selectedDesignId) {
        return
      }

      const matchedDesign = availableDesigns.find(
        (design) =>
          design.figma_frame_id === initialContext.frameId ||
          design.frame_url === initialContext.figmaUrl
      )

      if (matchedDesign) {
        setSelectedDesignId(matchedDesign.id)
      }
    }, [isOpen, initialContext, selectedDesignId, availableDesigns])

    // Fetch frame images when file is loaded
    useEffect(() => {
      // Prevent API calls when in change design mode
      if (isChangeDesignMode) {
        return
      }

      if (!figmaFile || viewMode !== "select-frame") return

      const fetchFrameImages = async () => {
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
        const frameIds = framesToFetch.map((frame) => frame.id)

        if (frameIds.length === 0) {
          setFrameImages({})
          return
        }

        try {
          const response = await figmaService.getFigmaNodeImages(
            (figmaFile as any).id,
            frameIds
          )
          if (response.success && response.data) {
            setFrameImages((prev) => ({
              ...prev,
              ...response.data
            }))
          }
        } catch {
          // Failed to fetch frame images
        }
      }

      fetchFrameImages()
    }, [figmaFile, viewMode, figmaService, isChangeDesignMode])

    // Event handlers
    const handleCancel = (): void => {
      if (
        availableDesigns.length > 0 &&
        previousViewMode === "select-element"
      ) {
        // Going back to the previous frame - restore state without reloading
        setViewMode("select-element")
        setPreviousViewMode(null)
        setError(null)
        return
      }
      // If no existing designs, close only the figma modal
      onClose()
    }

    const handleAddMoreFrames = (): void => {
      // Store current frame state to restore if user cancels
      setPreviousViewMode(viewMode)
      setViewMode("add-new")
      setError(null)
      // Clear figmaUrl so the input starts empty for adding a new frame
      setFigmaUrl("")
    }

    const handleBackToPreviousFrame = (): void => {
      if (previousViewMode) {
        // Restore previous view without reloading
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

    const handleDesignSelect = (design: FigmaDesignReference): void => {
      // Extract fileId and frameId from the Figma URL or use from the design link
      const contextData: FigmaContextData = {
        figmaUrl: design.frame_url,
        fileId: design.figma_file_id,
        frameId: design.figma_frame_id,
        frameData: undefined // Frame data not available for existing designs
      }

      onDesignSelected(
        {
          imageUrl: design.thumbnail_url || "",
          designName: design.frame_name || "Figma Design",
          figmaUrl: design.frame_url
        },
        contextData
      )
    }

    const handleFigmaUrlSubmit = useCallback(
      async (
        overrideUrl?: string,
        context?: { frameId?: string; force?: boolean }
      ): Promise<void> => {
        // Determine the URL we're about to fetch
        const urlToFetch = overrideUrl?.trim() || figmaUrlRef.current.trim()
        const forceReload = context?.force === true

        // Prevent API calls when in change design mode, UNLESS:
        // 1. User explicitly clicked "Add more frames" (previousViewMode is set), OR
        // 2. User is switching to a DIFFERENT frame (URL differs from cached), OR
        // 3. A forced reload is requested (frame reselect/refresh)
        const isSameAsCachedUrl =
          initialContext?.figmaUrl &&
          urlToFetch === initialContext.figmaUrl.trim()
        const isSameAsCachedFrame =
          !context?.frameId ||
          !initialContext?.frameId ||
          context.frameId === initialContext.frameId

        if (
          isChangeDesignMode &&
          previousViewMode === null &&
          isSameAsCachedUrl &&
          isSameAsCachedFrame &&
          !forceReload
        ) {
          return
        }

        const urlCandidate = overrideUrl?.trim() || figmaUrlRef.current.trim()

        if (!urlCandidate) {
          setError("Please enter a Figma URL")
          return
        }

        if (!figmaService.isValidFigmaUrl(urlCandidate)) {
          setError("Please enter a valid Figma URL")
          return
        }

        // Generate a new request ID to track this request
        // This allows us to cancel stale requests when user switches designs
        currentRequestIdRef.current += 1
        const thisRequestId = currentRequestIdRef.current

        if (!overrideUrl) {
          setSelectedDesignId(null)
        }
        setFigmaUrl(urlCandidate)

        setIsProcessing(true)
        figmaUrlRequestRef.current = urlCandidate
        setError(null)
        // Don't clear frame data immediately to keep showing current design during load
        // setFrameData(null)
        // setFrameElements([])
        // setFrameImageUrl("")

        try {
          // Check if URL has node-id parameter for direct frame rendering
          const hasNodeId = urlCandidate.includes("node-id=")

          if (hasNodeId) {
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
                    figmaUrl: urlCandidate,
                    force: forceReload
                  },
                  (response) => {
                    if (chrome.runtime.lastError) {
                      resolve({
                        success: false,
                        error:
                          chrome.runtime.lastError.message || "Extension error"
                      })
                    } else {
                      resolve(
                        response || { success: false, error: "No response" }
                      )
                    }
                  }
                )
              } catch {
                resolve({
                  success: false,
                  error: "Failed to communicate with background script"
                })
              }
            })

            // Check if this request was cancelled (a newer request was started)
            if (thisRequestId !== currentRequestIdRef.current) {
              // This request is stale, discard the response
              return
            }

            if (!response.success || !response.data) {
              setError(response.error || "Failed to render Figma frame")
              return
            }

            // Check if this request was cancelled (a newer request was started)
            if (thisRequestId !== currentRequestIdRef.current) {
              return
            }

            const renderedFrameData = response.data.frameData
            const renderedFileId = response.data.fileId

            // Store the frame locally until the issue is created
            if (renderedFrameData?.id && renderedFileId) {
              addLocalDesign({
                fileId: renderedFileId,
                frameId: renderedFrameData.id,
                frameName: renderedFrameData.name,
                frameUrl: urlCandidate,
                thumbnailUrl: response.data.imageUrl
              })
            }

            try {
              // Check if component is still mounted and dialog is still open
              if (!isOpen) {
                return
              }

              // Final check before updating state
              if (thisRequestId !== currentRequestIdRef.current) {
                return
              }

              setFrameData({
                ...renderedFrameData,
                fileId: renderedFileId
              })
              setFrameElements(response.data.elements)
              setFrameImageUrl(response.data.imageUrl)
              setViewMode("select-element")
            } catch {
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

            // Fetch Figma file using Figma API
            const response = await figmaService.getFigmaFile(parsed.fileId, {
              depth: 2
            })

            // Check if this request was cancelled
            if (thisRequestId !== currentRequestIdRef.current) {
              return
            }

            if (!response.success || !response.data) {
              setError(response.error || "Failed to fetch Figma file")
              return
            }

            // Store the file and move to frame selection
            setFigmaFile(response.data)
            setViewMode("select-frame")
          }
        } catch (err) {
          // Only show error if this request wasn't cancelled
          if (thisRequestId === currentRequestIdRef.current) {
            setError(
              err instanceof Error ? err.message : "Failed to fetch Figma file"
            )
          }
        } finally {
          // Only update processing state if this is still the current request
          if (thisRequestId === currentRequestIdRef.current) {
            setIsProcessing(false)
            figmaUrlRequestRef.current = null
          }
          // Clear figma flow active flag
          try {
            usePixzloDialogStore.getState().setIsFigmaFlowActive(false)
          } catch {
            // Failed to reset Figma flow flag
          }
        }
      },
      [
        figmaService,
        isChangeDesignMode,
        previousViewMode,
        initialContext,
        isOpen,
        addLocalDesign
      ]
    )

    // Get the correct page URL (handles tab page context)
    const getPageUrl = usePixzloDialogStore((state) => state.getPageUrl)

    useEffect(() => {
      if (!isOpen || !needsFigmaMetadataRefresh) {
        return
      }

      refreshMetadata(getPageUrl(), { force: true })
        .catch(() => {
          // Ignore refresh errors here
        })
        .finally(() => {
          setNeedsFigmaMetadataRefresh(false)
        })
    }, [
      isOpen,
      needsFigmaMetadataRefresh,
      refreshMetadata,
      setNeedsFigmaMetadataRefresh,
      getPageUrl
    ])

    // Initialize state from initialContext when changing design
    useEffect(() => {
      if (!initialContext || !isOpen) {
        return
      }

      setFigmaUrl(initialContext.figmaUrl)

      if (initialContext.frameImageUrl) {
        setViewMode("select-element")
        setFrameData(initialContext.frameData)

        // Use cached frame image URL - no API calls when changing design
        setFrameImageUrl(initialContext.frameImageUrl)

        // Use cached frame elements if available
        if (initialContext.frameElements) {
          setFrameElements(initialContext.frameElements)
        }

        // Set selected element if available
        if (initialContext.selectedElementId) {
          // Find and set the selected element
          const selectedElement = initialContext.frameElements?.find(
            (element) => element.id === initialContext.selectedElementId
          )
          if (selectedElement) {
            setSelectedElement(selectedElement)
          }
        }

        return
      }

      if (initialContextLoadRef.current) {
        return
      }

      initialContextLoadRef.current = true
      setViewMode("add-new")
      void handleFigmaUrlSubmit(initialContext.figmaUrl, {
        frameId: initialContext.frameId,
        force: true
      })
    }, [initialContext, isOpen, handleFigmaUrlSubmit])

    const loadDesignFromLink = useCallback(
      async (design: FigmaDesignReference): Promise<void> => {
        const resolvedFrameUrl = design.frame_url.includes("node-id=")
          ? design.frame_url
          : `${design.frame_url}${design.frame_url.includes("?") ? "&" : "?"}node-id=${encodeURIComponent(design.figma_frame_id.replace(/:/g, "-"))}`
        setSelectedDesignId(design.id)
        await handleFigmaUrlSubmit(resolvedFrameUrl, {
          frameId: design.figma_frame_id,
          force: true
        })
      },
      [handleFigmaUrlSubmit]
    )

    const handleFrameSelect = (frame: FigmaNode): void => {
      setSelectedFrame(frame)
    }

    const handleConfirmFrameSelection = useCallback(async (): Promise<void> => {
      if (!figmaFile || !selectedFrame) return

      setIsProcessing(true)
      setError(null)

      try {
        const frameUrl = figmaUrl.includes("node-id=")
          ? figmaUrl
          : `${figmaUrl}${figmaUrl.includes("?") ? "&" : "?"}node-id=${encodeURIComponent(selectedFrame.id.replace(/:/g, "-"))}`

        const resolvedFileId =
          (figmaFile as any).id ||
          (figmaFile as any).key ||
          figmaService.parseFigmaUrl(figmaUrl)?.fileId ||
          ""

        addLocalDesign({
          fileId: resolvedFileId,
          frameId: selectedFrame.id,
          frameName: selectedFrame.name,
          frameUrl: frameUrl,
          thumbnailUrl: frameImages[selectedFrame.id]
        })

        // Create context data with file and frame IDs for issue submission
        const contextData: FigmaContextData = {
          figmaUrl: frameUrl,
          fileId: resolvedFileId,
          frameId: selectedFrame.id,
          frameData: selectedFrame
        }

        setSelectedDesignId(null)
        onDesignSelected(
          {
            imageUrl: "",
            designName: selectedFrame.name || "Selected Frame",
            figmaUrl: frameUrl
          },
          contextData
        )

        setFigmaUrl("")
        setFigmaFile(null)
        setSelectedFrame(null)
        setHasAutoLoadedDesign(false)
        autoLoadTriggeredRef.current = false
        onClose()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to use selected frame"
        )
      } finally {
        setIsProcessing(false)
      }
    }, [
      figmaFile,
      selectedFrame,
      figmaUrl,
      figmaService,
      addLocalDesign,
      frameImages,
      onDesignSelected,
      onClose
    ])

    useEffect(() => {
      if (!isOpen) {
        setHasAutoLoadedDesign(false)
        setSelectedDesignId(null)
        autoLoadTriggeredRef.current = false
        figmaUrlRequestRef.current = null
        initialContextLoadRef.current = false
        // Reset so we auto-load the stored design again the next time the modal opens.
        previousDesignCountRef.current = 0
        return
      }

      const currentCount = orderedRemoteDesigns.length
      previousDesignCountRef.current = currentCount

      if (
        autoLoadTriggeredRef.current ||
        hasAutoLoadedDesign ||
        viewMode !== "add-new" ||
        previousViewMode !== null ||
        currentCount === 0 ||
        figmaUrlRequestRef.current !== null
      ) {
        return
      }

      const firstDesign = orderedRemoteDesigns[0]
      if (!firstDesign?.frame_url) {
        return
      }

      setHasAutoLoadedDesign(true)
      setIsAutoLoading(true)
      autoLoadTriggeredRef.current = true
      loadDesignFromLink(firstDesign).finally(() => {
        setIsAutoLoading(false)
      })
    }, [
      orderedRemoteDesigns,
      hasAutoLoadedDesign,
      isOpen,
      viewMode,
      previousViewMode,
      loadDesignFromLink
    ])

    // NOTE: Metadata fetching is handled by parent (popup open effect).
    // Avoid fetching here to prevent duplicate/infinite requests.

    // Separate effect to handle frame setup when metadata changes
    useEffect(() => {
      if (!isOpen || isLoadingMetadata) {
        return
      }

      // Set frames from metadata once
      if (metadata.designLinks.length > 0) {
        const orderedLinks = orderDesignLinks(metadata.designLinks)
        const frames = orderedLinks.map((design) => ({
          id: design.id, // Use database ID for uniqueness (allows duplicate Figma frames)
          name: design.frame_name ?? "Untitled",
          figmaUrl: design.frame_url,
          imageUrl: design.thumbnail_url ?? undefined,
          fileId: design.figma_file_id,
          figmaFrameId: design.figma_frame_id // Keep Figma frame ID for preference matching
        }))

        replaceFrames(frames)

        // Auto-select preferred frame if available - match by Figma frame ID
        if (metadata.preference?.lastUsedFrameId) {
          const preferred = frames.find(
            (frame) =>
              frame.figmaFrameId === metadata.preference?.lastUsedFrameId ||
              frame.id === metadata.preference?.lastUsedFrameId
          )
          if (preferred) {
            setCurrentFrame(preferred)
          }
        }
      }
    }, [
      isOpen,
      isLoadingMetadata,
      metadata.designLinks,
      metadata.preference?.lastUsedFrameId,
      replaceFrames,
      setCurrentFrame,
      orderDesignLinks
    ])

    const handleElementSelect = async (
      element: any,
      frameImage: HTMLImageElement | null
    ): Promise<void> => {
      if (!frameData) {
        setError("Critical error: Frame data is missing.")
        return
      }

      // Store the selected element for context caching
      setSelectedElement(element)

      setIsProcessing(true)
      setError(null)

      try {
        // Calculate element position in the displayed frame image
        if (!frameImage) {
          throw new Error("Frame image DOM element was not provided.")
        }

        // Validate frameImageUrl is available
        if (!frameImageUrl) {
          throw new Error(
            "Frame image URL is not available. Please try refreshing the frame."
          )
        }

        // Get the actual displayed dimensions of the frame image
        const displayedWidth = frameImage.offsetWidth
        const displayedHeight = frameImage.offsetHeight

        if (!displayedWidth || !displayedHeight) {
          throw new Error("Frame image has invalid dimensions.")
        }

        const scaleX = displayedWidth / frameData.absoluteBoundingBox.width
        const scaleY = displayedHeight / frameData.absoluteBoundingBox.height

        // Calculate element position relative to the frame image (not viewport!)
        const elementRelativeX =
          (element.absoluteBoundingBox.x - frameData.absoluteBoundingBox.x) *
          scaleX
        const elementRelativeY =
          (element.absoluteBoundingBox.y - frameData.absoluteBoundingBox.y) *
          scaleY
        const elementWidth = element.absoluteBoundingBox.width * scaleX
        const elementHeight = element.absoluteBoundingBox.height * scaleY

        // Calculate capture area with 40px padding, bounded within the frame image
        const PADDING = 40

        // Calculate the capture area relative to the element, with padding
        const captureX = elementRelativeX - PADDING
        const captureY = elementRelativeY - PADDING
        const captureWidth = elementWidth + PADDING * 2
        const captureHeight = elementHeight + PADDING * 2

        // Clamp the capture area to stay within the frame image boundaries
        const clampedX = Math.max(0, captureX)
        const clampedY = Math.max(0, captureY)
        const clampedWidth = Math.min(captureWidth, displayedWidth - clampedX)
        const clampedHeight = Math.min(
          captureHeight,
          displayedHeight - clampedY
        )

        // Crop directly from the frame image (already loaded from Figma)
        // This avoids viewport/scroll issues entirely
        const croppedImageUrl = await cropImageFromSource(
          frameImageUrl, // Use the source frame image URL
          {
            x: clampedX,
            y: clampedY,
            width: clampedWidth,
            height: clampedHeight
          },
          displayedWidth,
          displayedHeight
        )

        // Convert to 16:9 aspect ratio with gray background
        const processedImageUrl =
          await convertTo16x9WithPadding(croppedImageUrl)

        const designData = {
          imageUrl: processedImageUrl,
          designName: element.name || "Figma Element",
          figmaUrl: figmaUrl
        }

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

        onClose()
      } catch (err) {
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
      <div
        className="custom-scrollbar flex h-full w-full"
        data-scrollable="true"
        onWheel={(e) => e.stopPropagation()}>
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
                  } catch {
                    // Failed to refresh frame
                  } finally {
                    setIsProcessing(false)
                  }
                }
              }}
              onOpenInFigma={(designUrl) => {
                window.open(designUrl, "_blank")
              }}
              onFrameSwitch={async ({ id }) => {
                const design = availableDesigns.find(
                  (item) => item.figma_frame_id === id || item.id === id
                )
                if (design) {
                  await loadDesignFromLink(design)
                }
              }}
              availableFrames={availableFrameOptions}
              currentFrame={currentFrameOption}
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
