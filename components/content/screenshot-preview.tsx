import { Plus } from "lucide-react"
import { memo } from "react"

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
    return (
      <div
        className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        {/* Main image display */}
        <div className="flex w-full items-center justify-center">
          <div className="w-full max-w-2xl overflow-hidden rounded-sm border border-gray-300 bg-gray-50">
            <img
              alt="Screenshot"
              className="h-auto w-full object-contain"
              src={currentImage}
            />
          </div>
        </div>

        {/* Add Figma design placeholder - only show when in element capture mode */}
        {hasHighlightedVersion && (
          <div className="flex gap-3">
            <div
              className="group flex aspect-[16/9] w-48 cursor-pointer select-none items-center justify-center overflow-hidden rounded-sm border border-dashed border-gray-300 bg-gray-50 transition-colors hover:bg-gray-100"
              onClick={onAddFigmaDesign}>
              <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-500 group-hover:text-gray-700">
                <Plus size={20} />
                <div className="text-center text-sm font-medium">
                  Add Figma design
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
)

ScreenshotPreview.displayName = "ScreenshotPreview"

export default ScreenshotPreview
