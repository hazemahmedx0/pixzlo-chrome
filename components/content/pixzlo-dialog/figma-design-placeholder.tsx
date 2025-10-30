import { Loader2, Plus } from "lucide-react"
import { memo, useMemo } from "react"

interface FigmaDesignPlaceholderProps {
  onClick?: () => void
  aspectRatio?: number | string | null
  minHeight?: number | string | null
  isLoading?: boolean
}

const FigmaDesignPlaceholder = memo(
  ({
    onClick,
    aspectRatio = null,
    minHeight = null,
    isLoading = false
  }: FigmaDesignPlaceholderProps): JSX.Element => {
    const resolvedAspectRatio = useMemo(() => {
      if (typeof aspectRatio === "number" && aspectRatio > 0) {
        return aspectRatio.toString()
      }

      if (typeof aspectRatio === "string" && aspectRatio.trim().length > 0) {
        return aspectRatio
      }

      return "16/9"
    }, [aspectRatio])

    const resolvedMinHeight = useMemo(() => {
      if (typeof minHeight === "number" && minHeight > 0) {
        return `${minHeight}px`
      }

      if (typeof minHeight === "string" && minHeight.trim().length > 0) {
        return minHeight
      }

      return "300px"
    }, [minHeight])

    return (
      <div
        className="group relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-gray-200 transition-colors hover:bg-gray-300"
        style={{
          aspectRatio: resolvedAspectRatio,
          minHeight: resolvedMinHeight
        }}
        onClick={isLoading ? undefined : onClick}>
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <div className="text-xs font-medium uppercase tracking-wide">
              Loading Figma data…
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-gray-600 group-hover:text-gray-800">
            <Plus size={16} />
            <div className="text-center text-sm font-medium">
              Add design reference
            </div>
          </div>
        )}
      </div>
    )
  }
)

FigmaDesignPlaceholder.displayName = "FigmaDesignPlaceholder"

export default FigmaDesignPlaceholder
