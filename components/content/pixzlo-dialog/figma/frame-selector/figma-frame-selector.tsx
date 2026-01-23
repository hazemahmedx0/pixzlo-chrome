import { useFigmaToolbarStore, type FigmaFrame } from "@/stores/figma-toolbar"
import { memo, useCallback, useEffect, useRef, useState } from "react"

import FigmaToolbar from "./figma-toolbar"

interface FigmaElement {
  id: string
  name: string
  type: string
  absoluteBoundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  depth: number
}

interface FigmaFrameSelectorProps {
  imageUrl: string
  elements: FigmaElement[]
  frameData: any // Full Figma node data with children
  onElementSelect: (
    element: any,
    frameImageElement: HTMLImageElement | null
  ) => void
  onCancel: () => void
  onAddFrame?: () => void
  onRefreshFrames?: () => Promise<void> | void
  onOpenInFigma?: (figmaUrl: string) => void
  onFrameSwitch?: (frame: { id: string }) => Promise<void>
  availableFrames?: FigmaFrame[]
  currentFrame?: FigmaFrame
  isProcessing?: boolean
}

/**
 * Component for selecting elements from a Figma frame (based on reviewit implementation)
 */
const FigmaFrameSelector = memo(
  ({
    imageUrl,
    elements,
    frameData,
    onElementSelect,
    onCancel,
    onAddFrame,
    onRefreshFrames,
    onOpenInFigma,
    onFrameSwitch,
    availableFrames = [],
    currentFrame,
    isProcessing
  }: FigmaFrameSelectorProps): JSX.Element => {
    const [hoveredElement, setHoveredElement] = useState<any>(null)
    const [containerWidth, setContainerWidth] = useState(0)
    // Track if the image has actually loaded (not just the URL)
    const [isImageLoaded, setIsImageLoaded] = useState(false)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const frameContainerRef = useRef<HTMLDivElement>(null)
    const frameImageRef = useRef<HTMLImageElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    const currentHighlightRef = useRef<HTMLDivElement | null>(null)
    // Track the current imageUrl to detect changes
    const previousImageUrlRef = useRef<string>(imageUrl)

    // Reset image loaded state when imageUrl changes
    useEffect(() => {
      if (imageUrl !== previousImageUrlRef.current) {
        setIsImageLoaded(false)
        previousImageUrlRef.current = imageUrl
      }
    }, [imageUrl])

    // Determine if we should show loading state:
    // - isProcessing means API call is in progress
    // - !isImageLoaded means image hasn't loaded yet after URL change
    const isLoading = isProcessing || !isImageLoaded

    // Initialize toolbar store
    const { setAvailableFrames, setCurrentFrame } = useFigmaToolbarStore()

    const framesAreEqual = useCallback(
      (a: FigmaFrame[], b: FigmaFrame[]) => {
        if (a === b) {
          return true
        }
        if (a.length !== b.length) {
          return false
        }
        for (let i = 0; i < a.length; i++) {
          if (a[i].id !== b[i].id) {
            return false
          }
        }
        return true
      },
      []
    )

    // Initialize store with frame data while avoiding redundant updates
    useEffect(() => {
      let framesToSet = availableFrames
      if (
        currentFrame &&
        !availableFrames.some((f) => f.id === currentFrame.id)
      ) {
        framesToSet = [...availableFrames, currentFrame]
      }

      const storeState = useFigmaToolbarStore.getState()

      if (!framesAreEqual(storeState.availableFrames, framesToSet)) {
        setAvailableFrames(framesToSet)
      }

      if (
        currentFrame &&
        (!storeState.currentFrame || storeState.currentFrame.id !== currentFrame.id)
      ) {
        setCurrentFrame(currentFrame)
      }
    }, [
      availableFrames,
      currentFrame,
      setAvailableFrames,
      setCurrentFrame,
      framesAreEqual
    ])

    // Toolbar handlers
    const handleAddFrame = useCallback((): void => {
      onAddFrame?.()
    }, [onAddFrame])

    const handleRefreshFrames = useCallback(async (): Promise<void> => {
      await onRefreshFrames?.()
    }, [onRefreshFrames])

    const handleOpenInFigma = useCallback(
      (frame: FigmaFrame): void => {
        onOpenInFigma?.(frame.figmaUrl)
      },
      [onOpenInFigma]
    )

    const handleFrameChange = useCallback(
      (frame: FigmaFrame): void => {
        // Always trigger frame switch when user selects a different frame
        // Use void to handle the promise without blocking
        if (onFrameSwitch) {
          void onFrameSwitch({ id: frame.id })
        }
      },
      [onFrameSwitch]
    )

    // Track container width for intelligent image sizing
    useEffect(() => {
      const updateContainerWidth = (): void => {
        if (scrollContainerRef.current) {
          setContainerWidth(scrollContainerRef.current.offsetWidth)
        }
      }

      updateContainerWidth()
      window.addEventListener("resize", updateContainerWidth)

      return () => {
        window.removeEventListener("resize", updateContainerWidth)
      }
    }, [])

    // Calculate intelligent image max-width based on container size
    const getImageMaxWidth = (): string => {
      if (containerWidth === 0) return "1400px" // Default fallback

      if (containerWidth >= 1400) {
        // For large containers, use full width with some padding
        return `${Math.min(containerWidth - 80, 2400)}px`
      } else {
        // For smaller containers, use a generous max-width but allow scrolling
        return "1800px"
      }
    }

    const removeHighlight = useCallback(() => {
      if (currentHighlightRef.current && overlayRef.current) {
        overlayRef.current.removeChild(currentHighlightRef.current)
        currentHighlightRef.current = null
      }
      setHoveredElement(null)
    }, [])

    const createHighlight = useCallback(
      (
        node: any,
        rect: { x: number; y: number; width: number; height: number }
      ) => {
        removeHighlight()

        if (!overlayRef.current) return

        const highlight = document.createElement("div")
        highlight.style.cssText = `
        position: absolute;
        left: ${rect.x}px;
        top: ${rect.y}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        outline: 2px solid #2563eb;
        background: rgba(37, 99, 235, 0.1);
        pointer-events: none;
        z-index: 10;
        box-sizing: border-box;
      `
        overlayRef.current.appendChild(highlight)
        currentHighlightRef.current = highlight
        setHoveredElement(node)
      },
      [removeHighlight]
    )

    const getElementsAtPosition = useCallback(
      (mouseX: number, mouseY: number) => {
        if (!frameImageRef.current || !frameData.absoluteBoundingBox) return []

        const elements: any[] = []
        const imageRect = frameImageRef.current.getBoundingClientRect()
        const displayedWidth = frameImageRef.current.offsetWidth
        const displayedHeight = frameImageRef.current.offsetHeight

        const scaleX = frameData.absoluteBoundingBox.width / displayedWidth || 1
        const scaleY =
          frameData.absoluteBoundingBox.height / displayedHeight || 1

        const relativeMouseX = mouseX - imageRect.left
        const relativeMouseY = mouseY - imageRect.top

        const figmaX =
          relativeMouseX * scaleX + (frameData.absoluteBoundingBox.x || 0)
        const figmaY =
          relativeMouseY * scaleY + (frameData.absoluteBoundingBox.y || 0)

        // Recursive function to check all nodes (exactly like reviewit)
        function checkNode(node: any) {
          if (!node.absoluteBoundingBox) return

          const nodeLeft = node.absoluteBoundingBox.x
          const nodeTop = node.absoluteBoundingBox.y
          const nodeRight = nodeLeft + node.absoluteBoundingBox.width
          const nodeBottom = nodeTop + node.absoluteBoundingBox.height

          if (
            figmaX >= nodeLeft &&
            figmaX <= nodeRight &&
            figmaY >= nodeTop &&
            figmaY <= nodeBottom
          ) {
            const relativeX =
              (nodeLeft - (frameData.absoluteBoundingBox.x || 0)) / scaleX
            const relativeY =
              (nodeTop - (frameData.absoluteBoundingBox.y || 0)) / scaleY
            const displayWidth = node.absoluteBoundingBox.width / scaleX
            const displayHeight = node.absoluteBoundingBox.height / scaleY

            elements.push({
              node,
              rect: {
                x: relativeX,
                y: relativeY,
                width: displayWidth,
                height: displayHeight
              },
              area:
                node.absoluteBoundingBox.width * node.absoluteBoundingBox.height
            })
          }

          if (node.children) {
            node.children.forEach(checkNode)
          }
        }

        checkNode(frameData)
        return elements
      },
      [frameData]
    )

    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        const elementsAtPosition = getElementsAtPosition(e.clientX, e.clientY)

        if (elementsAtPosition.length > 0) {
          // Select the smallest element (most specific)
          const targetElement = elementsAtPosition.reduce(
            (smallest, current) => {
              return current.area < smallest.area ? current : smallest
            }
          )

          createHighlight(targetElement.node, targetElement.rect)
        } else {
          removeHighlight()
        }
      },
      [getElementsAtPosition, createHighlight, removeHighlight]
    )

    const handleMouseLeave = useCallback(() => {
      removeHighlight()
    }, [removeHighlight])

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (hoveredElement) {
          // Remove the blue highlight before capturing the screenshot
          // This ensures the captured image doesn't include the selection box
          removeHighlight()

          // Small delay to ensure DOM update is processed before screenshot
          setTimeout(() => {
            onElementSelect(hoveredElement, frameImageRef.current)
          }, 50) // 50ms delay
        }
      },
      [hoveredElement, onElementSelect, removeHighlight]
    )

    // Handle image load completion
    const handleImageLoad = useCallback((): void => {
      setIsImageLoaded(true)
    }, [])

    return (
      <div className="flex h-full w-full flex-col">
        {/* Main Content Area - Scrollable with left alignment */}
        {/* Disable scrolling while loading to prevent user confusion */}
        <div
          ref={scrollContainerRef}
          className={`relative flex-1 bg-gray-50 ${isLoading ? "overflow-hidden" : "overflow-auto"}`}
          data-scrollable="true"
          onWheel={(e) => {
            // Prevent scrolling while loading
            if (isLoading) {
              e.preventDefault()
              e.stopPropagation()
            } else {
              e.stopPropagation()
            }
          }}
          style={{ scrollBehavior: "smooth" }}>
          {/* Loading overlay - only covers the preview area */}
          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                <span className="text-sm font-medium">
                  Loading design preview...
                </span>
              </div>
            </div>
          )}

          {/* Left-aligned container */}
          <div className="flex justify-start">
            <div className="inline-block rounded-lg">
              <div
                ref={frameContainerRef}
                data-pixzlo-frame="true"
                className="relative cursor-crosshair"
                onMouseMove={isLoading ? undefined : handleMouseMove}
                onMouseLeave={isLoading ? undefined : handleMouseLeave}
                onClick={isLoading ? undefined : handleClick}>
                <img
                  ref={frameImageRef}
                  src={imageUrl}
                  alt="Figma Frame"
                  className="block w-auto rounded"
                  style={{
                    minWidth: "600px",
                    maxWidth: getImageMaxWidth(),
                    height: "auto",
                    opacity: isLoading ? 0.5 : 1,
                    transition: "opacity 0.2s ease-in-out"
                  }}
                  draggable={false}
                  onLoad={handleImageLoad}
                />
                <div
                  ref={overlayRef}
                  className="pointer-events-none absolute inset-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Figma Toolbar - always visible, never hidden during loading */}
        <FigmaToolbar
          onAddFrame={handleAddFrame}
          onRefreshFrames={handleRefreshFrames}
          onOpenInFigma={handleOpenInFigma}
          onFrameChange={handleFrameChange}
          frames={availableFrames}
          selectedFrame={currentFrame}
        />
      </div>
    )
  }
)

FigmaFrameSelector.displayName = "FigmaFrameSelector"

export default FigmaFrameSelector
