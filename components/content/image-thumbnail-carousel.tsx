import { RotateCcw } from "lucide-react"
import { memo } from "react"

interface ImageThumbnailCarouselProps {
  images: Array<{
    src: string
    label: string
    isActive?: boolean
  }>
  onImageSelect: (index: number) => void
  includeFullscreen?: boolean
  onIncludeFullscreenChange?: (include: boolean) => void
  className?: string
}

const ImageThumbnailCarousel = memo(
  ({
    images,
    onImageSelect,
    includeFullscreen = true,
    onIncludeFullscreenChange,
    className = ""
  }: ImageThumbnailCarouselProps) => {
    if (images.length === 0) return null

    return (
      <div className={`flex flex-col gap-3 ${className}`}>
        {/* Thumbnail strip */}
        <div className="flex items-center justify-center gap-3">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => onImageSelect(index)}
              className={`group relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-sm border-2 transition-all ${
                image.isActive
                  ? "border-blue-500 ring-2 ring-blue-500/20"
                  : "border-white bg-gray-200 hover:border-gray-300"
              }`}
              title={image.label}>
              <img
                alt={image.label}
                className="h-full w-full object-cover"
                src={image.src}
              />
              {!image.isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <RotateCcw size={12} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Include fullscreen option */}
        {onIncludeFullscreenChange && (
          <div className="flex items-center justify-center gap-2">
            <input
              id="include-full-page"
              className="h-4 w-4"
              type="checkbox"
              checked={includeFullscreen}
              onChange={(e) => onIncludeFullscreenChange(e.target.checked)}
            />
            <label
              htmlFor="include-full-page"
              className="text-xs text-gray-700">
              Also include fullscreen screenshot
            </label>
          </div>
        )}
      </div>
    )
  }
)

ImageThumbnailCarousel.displayName = "ImageThumbnailCarousel"

export default ImageThumbnailCarousel
