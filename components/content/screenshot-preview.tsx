import { Plus } from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, SyntheticEvent } from "react"

interface ScreenshotPreviewProps {
  currentImage: string
  hasHighlightedVersion?: boolean
  onAddFigmaDesign?: () => void
  showHighlighted?: boolean
  highlightedImage?: string
  className?: string
}

const ScreenshotPreview = memo(
  ({
    currentImage,
    hasHighlightedVersion = false,
    onAddFigmaDesign,
    showHighlighted = false,
    highlightedImage,
    className = ""
  }: ScreenshotPreviewProps) => {
    const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(
      null
    )
    const [containerWidth, setContainerWidth] = useState<number>(0)
    const containerRef = useRef<HTMLDivElement>(null)

    // Track container width for dynamic sizing
    useEffect(() => {
      const updateContainerWidth = (): void => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          setContainerWidth(rect.width)
        }
      }

      updateContainerWidth()
      window.addEventListener("resize", updateContainerWidth)

      const observer = new ResizeObserver(updateContainerWidth)
      if (containerRef.current) {
        observer.observe(containerRef.current)
      }

      return () => {
        window.removeEventListener("resize", updateContainerWidth)
        observer.disconnect()
      }
    }, [])

    const handleImageLoad = useCallback(
      (event: SyntheticEvent<HTMLImageElement>) => {
        const img = event.currentTarget
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          // Use the natural aspect ratio of the screenshot
          setImageAspectRatio(img.naturalWidth / img.naturalHeight)
        }
      },
      []
    )

    // Calculate optimal width based on available space and image requirements
    const calculateOptimalWidth = useMemo(() => {
      if (!containerWidth || containerWidth === 0) return 400 // fallback

      // Available width for images (accounting for gap and padding)
      const availableWidth = hasHighlightedVersion
        ? (containerWidth - 24) / 2 // 24px gap between columns
        : containerWidth - 48 // 48px total horizontal padding

      // Use natural aspect ratio or fallback to 16:9
      const aspectRatio = imageAspectRatio || 16 / 9

      // Minimum and maximum constraints
      const minWidth = 200
      const maxWidth = Math.min(availableWidth, 1200) // Increased max for screenshots

      // Use available width but respect min/max
      return Math.max(minWidth, Math.min(maxWidth, availableWidth))
    }, [containerWidth, hasHighlightedVersion, imageAspectRatio])

    const sharedContainerStyle: CSSProperties = {
      aspectRatio: imageAspectRatio ? `${imageAspectRatio}` : "16 / 9",
      width: `${calculateOptimalWidth}px`,
      flexShrink: 0
    }

    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center px-6 py-4 ${className}`}>
        <div
          className={`flex items-center justify-center ${hasHighlightedVersion ? "gap-6" : ""}`}>
          {/* Main image display */}
          <div className="group relative flex flex-col gap-1">
            <div
              className="overflow-hidden rounded-sm border border-solid border-gray-300 bg-gray-150"
              style={sharedContainerStyle}>
              <img
                alt="Original Screenshot"
                className="h-full w-full object-contain"
                src={currentImage}
                onLoad={handleImageLoad}
              />
            </div>
            <div className="text-xs text-gray-600">Implementation</div>
          </div>

          {/* Add Figma design placeholder or second image - only show when hasHighlightedVersion */}
          {hasHighlightedVersion && (
            <div className="group relative flex flex-col gap-1">
              <div
                className="overflow-hidden rounded-sm border border-solid border-gray-300 bg-gray-150"
                style={sharedContainerStyle}>
                {showHighlighted && highlightedImage ? (
                  <img
                    alt="Highlighted Screenshot"
                    className="h-full w-full object-contain"
                    src={highlightedImage}
                  />
                ) : (
                  <div
                    className="group flex h-full w-full cursor-pointer select-none items-center justify-center overflow-hidden bg-gray-200 transition-colors hover:bg-gray-300"
                    onClick={onAddFigmaDesign}>
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-gray-600 group-hover:text-gray-800">
                      <Plus size={16} />
                      <div className="text-center text-sm font-medium">
                        Add design reference
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-600">
                {showHighlighted && highlightedImage ? "Highlighted" : ""}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

ScreenshotPreview.displayName = "ScreenshotPreview"

export default ScreenshotPreview
