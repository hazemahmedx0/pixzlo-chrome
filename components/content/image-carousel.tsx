import type { ImageCarouselProps } from "@/types/ui"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { memo } from "react"

const ImageCarousel = memo(
  ({ images, activeIndex, onImageSelect }: ImageCarouselProps) => {
    if (images.length === 0) return null

    const hasMultipleImages = images.length > 1

    return (
      <div className="space-y-4">
        {/* Main image display */}
        <div className="relative">
          <img
            src={images[activeIndex]}
            alt={`Screenshot ${activeIndex + 1}`}
            className="max-h-[60vh] w-full rounded-lg border border-gray-200 object-contain"
          />

          {/* Navigation arrows for multiple images */}
          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={() =>
                  onImageSelect(
                    activeIndex === 0 ? images.length - 1 : activeIndex - 1
                  )
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                aria-label="Previous image">
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={() =>
                  onImageSelect(
                    activeIndex === images.length - 1 ? 0 : activeIndex + 1
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
                aria-label="Next image">
                <ChevronRight size={20} />
              </button>

              {/* Image counter */}
              <div className="absolute bottom-2 right-2 rounded bg-black/50 px-2 py-1 text-sm text-white">
                {activeIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>

        {/* Thumbnail strip for multiple images */}
        {hasMultipleImages && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onImageSelect(index)}
                className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded border-2 transition-all ${
                  index === activeIndex
                    ? "border-blue-500 ring-2 ring-blue-500/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                aria-label={`View screenshot ${index + 1}`}>
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
)

ImageCarousel.displayName = "ImageCarousel"

export default ImageCarousel
