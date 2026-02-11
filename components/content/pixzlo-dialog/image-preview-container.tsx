import { useCompositeImage } from "@/hooks/use-composite-image"
import type { DrawingElement } from "@/types/drawing"
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react"
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
  /** Zoom multiplier (1.0 = fit to view). Only used when isScreenshot. */
  zoom?: number
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
    overrideAspectRatio = null,
    zoom = 1.0
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

    const displayImageUrl = shouldComposite
      ? compositeImageUrl || imageUrl
      : imageUrl

    const imgRef = useRef<HTMLImageElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    // Separate measurement ref for screenshot mode so ResizeObserver is not
    // affected by scrollbar appearance/disappearance on the scroll container.
    const measureRef = useRef<HTMLDivElement | null>(null)

    // ───────── Screenshot-mode: stable base coordinate system ─────────
    // Natural image dimensions – locked once on first successful load
    const [baseSize, setBaseSize] = useState<{
      width: number
      height: number
    } | null>(null)

    // Container dimensions tracked via ResizeObserver
    const [containerSize, setContainerSize] = useState({
      width: 0,
      height: 0
    })

    // ───────── Non-screenshot mode: legacy compositeImageSize ─────────
    const [compositeImageSize, setCompositeImageSize] = useState({
      width: 0,
      height: 0
    })

    // Handle image load
    const handleImageLoadInternal = useCallback(
      (event: SyntheticEvent<HTMLImageElement>) => {
        const img = event.currentTarget

        // Lock base size from naturalWidth/Height on first load
        if (isScreenshot && img.naturalWidth > 0 && img.naturalHeight > 0) {
          setBaseSize((prev) =>
            prev ? prev : { width: img.naturalWidth, height: img.naturalHeight }
          )
        }

        // Legacy: track rendered size for non-screenshot mode
        if (!isScreenshot) {
          setCompositeImageSize({
            width: img.offsetWidth,
            height: img.offsetHeight
          })
        }

        onImageLoad(event)
      },
      [onImageLoad, isScreenshot]
    )

    // Track container size via ResizeObserver on the *measurement* div
    // (not the scroll div) so scrollbar appearance doesn't cause a feedback loop.
    useEffect(() => {
      const measureEl = measureRef.current
      if (!measureEl || !isScreenshot) return

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          setContainerSize({ width, height })
        }
      })
      ro.observe(measureEl)

      // Initial measurement
      setContainerSize({
        width: measureEl.clientWidth,
        height: measureEl.clientHeight
      })

      return () => ro.disconnect()
    }, [isScreenshot])

    // Non-screenshot: keep canvas size in sync via ResizeObserver (legacy)
    useEffect(() => {
      if (isScreenshot) return
      const imgEl = imgRef.current
      const containerEl = containerRef.current
      if (!imgEl) return

      const updateSize = (): void => {
        setCompositeImageSize({
          width: imgEl.offsetWidth,
          height: imgEl.offsetHeight
        })
      }

      const roImg = new ResizeObserver(() => updateSize())
      roImg.observe(imgEl)

      let roContainer: ResizeObserver | null = null
      if (containerEl) {
        roContainer = new ResizeObserver(() => updateSize())
        roContainer.observe(containerEl)
      }

      const onWindowResize = (): void => updateSize()
      window.addEventListener("resize", onWindowResize)
      updateSize()

      return () => {
        roImg.disconnect()
        if (roContainer) roContainer.disconnect()
        window.removeEventListener("resize", onWindowResize)
      }
    }, [displayImageUrl, isScreenshot])

    // ───────── Screenshot-mode computed values ─────────
    // 2px ring inset reserve so the ring-1 box-shadow is never clipped
    const RING_RESERVE = 2

    const { fitScale, effectiveScale, displayWidth, displayHeight } =
      useMemo(() => {
        if (!isScreenshot || !baseSize || containerSize.width === 0) {
          return {
            fitScale: 1,
            effectiveScale: 1,
            displayWidth: 0,
            displayHeight: 0
          }
        }

        // Available space after subtracting ring reserve on each side
        const availW = Math.max(containerSize.width - RING_RESERVE * 2, 1)
        const availH = Math.max(containerSize.height - RING_RESERVE * 2, 1)

        // Scale that makes the image fit entirely within the container
        // Cap at 1 so we never upscale beyond natural size at zoom=1
        const fit = Math.min(
          availW / baseSize.width,
          availH / baseSize.height,
          1
        )
        const eff = fit * zoom
        const dw = Math.round(baseSize.width * eff)
        const dh = Math.round(baseSize.height * eff)

        return {
          fitScale: fit,
          effectiveScale: eff,
          displayWidth: dw,
          displayHeight: dh
        }
      }, [isScreenshot, baseSize, containerSize, zoom])

    // ───────── Non-screenshot styling ─────────
    const formattedOverrideAspect = useMemo(() => {
      if (overrideAspectRatio && overrideAspectRatio > 0) {
        return Number(overrideAspectRatio.toFixed(4))
      }
      return null
    }, [overrideAspectRatio])

    const nonScreenshotStyle = useMemo(() => {
      if (formattedOverrideAspect) {
        return { aspectRatio: formattedOverrideAspect.toString() }
      }
      return {}
    }, [formattedOverrideAspect])

    useLayoutEffect(() => {
      if (!isScreenshot || !baseSize) {
        return
      }

      const containerEl = containerRef.current
      if (!containerEl) {
        return
      }

      // Keep zoom transitions visually stable by centering scrollable overflow.
      containerEl.scrollLeft = Math.max(
        (containerEl.scrollWidth - containerEl.clientWidth) / 2,
        0
      )
      containerEl.scrollTop = Math.max(
        (containerEl.scrollHeight - containerEl.clientHeight) / 2,
        0
      )
    }, [baseSize, displayHeight, displayWidth, isScreenshot, zoom])

    // ───────── Screenshot-mode rendering ─────────
    if (isScreenshot) {
      const ready = baseSize && displayWidth > 0 && displayHeight > 0

      return (
        // Outer: stable measurement div – ResizeObserver watches this.
        // No overflow so scrollbar appearance never changes its size.
        <div ref={measureRef} className="h-full w-full">
          {/* Inner: scroll container */}
          <div
            ref={containerRef}
            className="h-full w-full overflow-auto"
            style={{
              padding: RING_RESERVE,
              scrollbarGutter: "stable"
            }}>
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

            {/* Image not yet measured – show invisible img to get naturalWidth/Height */}
            {!ready && (
              <div className="flex h-full w-full items-center justify-center">
                <img
                  ref={imgRef}
                  alt={altText}
                  className="block max-h-full max-w-full object-contain"
                  src={displayImageUrl}
                  onLoad={handleImageLoadInternal}
                />
              </div>
            )}

            {ready && (
              <div
                className="relative flex-shrink-0"
                style={{
                  width: displayWidth,
                  height: displayHeight,
                  margin: "auto"
                }}>
                <img
                  ref={imgRef}
                  alt={altText}
                  className="block rounded-sm ring-1 ring-gray-300"
                  style={{ width: displayWidth, height: displayHeight }}
                  src={displayImageUrl}
                  onLoad={handleImageLoadInternal}
                />

                {/* Drawing Canvas Overlay */}
                {!isHighlighted && (
                  <div
                    className="pointer-events-none absolute left-0 top-0"
                    style={{ width: displayWidth, height: displayHeight }}>
                    <div className="pointer-events-auto h-full w-full">
                      <DrawingCanvas
                        ref={canvasRef}
                        imageUrl={displayImageUrl}
                        width={displayWidth}
                        height={displayHeight}
                        scaleX={effectiveScale}
                        scaleY={effectiveScale}
                        onElementsChange={onElementsChange}
                        initialElements={elements}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    // ───────── Non-screenshot rendering (unchanged) ─────────
    return (
      <div
        ref={containerRef}
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
        style={nonScreenshotStyle}>
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
        <div className="relative flex h-full w-full items-center justify-center">
          <img
            ref={imgRef}
            alt={altText}
            className="block max-h-full max-w-full object-contain"
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
