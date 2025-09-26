import type { FigmaDesignLink } from "@/types/figma"
import { ExternalLink, MoreHorizontal } from "lucide-react"
import { memo, useState } from "react"

interface FigmaDesignViewerProps {
  design: FigmaDesignLink
  onClick?: () => void
  onDesignSelected?: (designData: {
    imageUrl: string
    designName: string
    figmaUrl: string
  }) => void
}

/**
 * Component for viewing an existing Figma design link
 */
const FigmaDesignViewer = memo(
  ({
    design,
    onClick,
    onDesignSelected
  }: FigmaDesignViewerProps): JSX.Element => {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)

    const handleImageLoad = (): void => {
      setImageLoaded(true)
    }

    const handleImageError = (): void => {
      setImageError(true)
      setImageLoaded(true)
    }

    const handleClick = (): void => {
      onClick?.()
    }

    const handleSelectDesign = (): void => {
      if (design.thumbnail_url && !imageError) {
        onDesignSelected?.({
          imageUrl: design.thumbnail_url,
          designName: design.frame_name || "Figma Design",
          figmaUrl: design.frame_url
        })
      }
    }

    const openInFigma = (e: React.MouseEvent): void => {
      e.stopPropagation()
      window.open(design.frame_url, "_blank")
    }

    return (
      <div
        className="group relative aspect-[16/9] min-h-[168px] w-full min-w-[300px] cursor-pointer overflow-hidden rounded-sm border border-gray-300 bg-white shadow-sm transition-all hover:shadow-md"
        onClick={handleClick}>
        {/* Design Image */}
        <div className="absolute inset-0">
          {design.thumbnail_url && !imageError ? (
            <img
              src={design.thumbnail_url}
              alt={design.frame_name || "Figma Design"}
              className={`h-full w-full object-cover transition-opacity duration-200 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : null}

          {/* Loading/Error Fallback */}
          {(!imageLoaded || imageError) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="flex flex-col items-center gap-2 text-gray-500">
                {imageError ? (
                  <>
                    <div className="text-2xl">🎨</div>
                    <div className="text-center text-sm font-medium">
                      Design Preview
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-6 w-6 animate-pulse rounded-full bg-gray-300" />
                    <div className="text-center text-sm font-medium">
                      Loading...
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 transition-all group-hover:bg-opacity-10" />

        {/* Header */}
        <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/50 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium text-white">
                {design.frame_name || "Untitled Design"}
              </h3>
              <p className="text-xs text-gray-200">Figma Design</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={openInFigma}
                className="rounded p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                title="Open in Figma">
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                title="More options">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-200">Click to manage designs</div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSelectDesign()
              }}
              className="rounded bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30">
              Use Design
            </button>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="absolute right-2 top-2">
          <div className="flex h-2 w-2 items-center justify-center">
            <div
              className="h-2 w-2 rounded-full bg-green-500"
              title="Connected"
            />
          </div>
        </div>
      </div>
    )
  }
)

FigmaDesignViewer.displayName = "FigmaDesignViewer"

export default FigmaDesignViewer
