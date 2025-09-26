import { useCompositeImage } from "@/hooks/use-composite-image"
import type { DrawingElement } from "@/types/drawing"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { RefObject, SyntheticEvent } from "react"

import DrawingCanvas from "../drawing/drawing-canvas"

interface ImagePreviewContainerProps {
  imageUrl: string
  imageSize: { width: number; height: number }
  canvasRef: RefObject<any>
  elements: DrawingElement[]
  onElementsChange: (elements: DrawingElement[]) => void
  onImageLoad: (event: SyntheticEvent<HTMLImageElement>) => void
  altText: string
  isHighlighted?: boolean
  isScreenshot?: boolean
  overrideAspectRatio?: number | null
}

const ImagePreviewContainer = memo(
  ({
    imageUrl,
    imageSize,
    canvasRef,
    elements,
    onElementsChange,
    onImageLoad,
    altText,
    isHighlighted = false,
    isScreenshot = false,
    overrideAspectRatio = null
  }: ImagePreviewContainerProps): JSX.Element => {
    // Only use composite for specific cases where we need consistent aspect ratio
    // Don't use composite for screenshots or design references to avoid gray padding
    const shouldComposite = false
    // Create composite image with gray background baked in
    const { compositeImageUrl, isLoading, error } = useCompositeImage({
      originalImageUrl: imageUrl,
      aspectRatio: [16, 9],
      minWidth: 300,
      minHeight: 168,
      backgroundColor: "#e5e7eb", // gray-200
      paddingPercent: 0, // Remove padding to eliminate gray space
      enabled: shouldComposite
    })

    // Track the actual composite image dimensions
    const [compositeImageSize, setCompositeImageSize] = useState({
      width: 0,
      height: 0
    })

    const displayImageUrl = shouldComposite
      ? compositeImageUrl || imageUrl
      : imageUrl

    const imgRef = useRef<HTMLImageElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    // Handle composite image load to get exact dimensions
    const handleImageLoadInternal = useCallback(
      (event: SyntheticEvent<HTMLImageElement>) => {
        const img = event.currentTarget
        setCompositeImageSize({
          width: img.offsetWidth,
          height: img.offsetHeight
        })
        // Also call the original onImageLoad for compatibility
        onImageLoad(event)
      },
      [onImageLoad]
    )

    // Keep canvas size in sync with displayed image on resize and container changes
    useEffect(() => {
      const imgEl = imgRef.current
      const containerEl = containerRef.current
      if (!imgEl) return

      const updateSize = (): void => {
        setCompositeImageSize({
          width: imgEl.offsetWidth,
          height: imgEl.offsetHeight
        })
      }

      // ResizeObserver for image and container
      const roImg = new ResizeObserver(() => updateSize())
      roImg.observe(imgEl)

      let roContainer: ResizeObserver | null = null
      if (containerEl) {
        roContainer = new ResizeObserver(() => updateSize())
        roContainer.observe(containerEl)
      }

      // Window resize
      const onWindowResize = (): void => updateSize()
      window.addEventListener("resize", onWindowResize)

      // Initial sync in case onLoad already fired
      updateSize()

      return () => {
        roImg.disconnect()
        if (roContainer) roContainer.disconnect()
        window.removeEventListener("resize", onWindowResize)
      }
    }, [displayImageUrl])

    const formattedOverrideAspect = useMemo(() => {
      if (overrideAspectRatio && overrideAspectRatio > 0) {
        return Number(overrideAspectRatio.toFixed(4))
      }
      return null
    }, [overrideAspectRatio])

    const containerStyle = useMemo(() => {
      if (isScreenshot) {
        return {}
      }

      if (formattedOverrideAspect) {
        return {
          aspectRatio: formattedOverrideAspect.toString()
        }
      }

      return {}
    }, [formattedOverrideAspect])

    const containerClassName = isScreenshot
      ? "relative flex h-full w-full items-center justify-center overflow-hidden rounded-sm"
      : "relative flex h-full w-full items-center justify-center overflow-hidden"

    return (
      <div
        ref={containerRef}
        className={containerClassName}
        style={containerStyle}>
        {isLoading && shouldComposite && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100">
            <div className="text-sm text-red-600">Error: {error}</div>
          </div>
        )}

        {/* Image without forced dimensions to preserve natural size */}
        <div
          className={`relative flex items-center justify-center ${isScreenshot ? "" : "h-full w-full"}`}>
          <img
            ref={imgRef}
            alt={altText}
            className={`block object-contain ${isScreenshot ? "max-h-full max-w-full" : "max-h-full max-w-full"}`}
            src={displayImageUrl}
            onLoad={handleImageLoadInternal}
          />

          {/* Drawing Canvas Overlay - only for non-highlighted images */}
          {!isHighlighted &&
            compositeImageSize.width > 0 &&
            (shouldComposite ? compositeImageUrl : true) && (
              <div className="pointer-events-none absolute inset-0">
                <div className="pointer-events-auto flex h-full w-full items-center justify-center">
                  <DrawingCanvas
                    ref={canvasRef}
                    imageUrl={displayImageUrl}
                    width={compositeImageSize.width}
                    height={compositeImageSize.height}
                    onElementsChange={onElementsChange}
                    initialElements={elements}
                  />
                </div>
              </div>
            )}
        </div>
      </div>
    )
  }
)

ImagePreviewContainer.displayName = "ImagePreviewContainer"

export default ImagePreviewContainer
