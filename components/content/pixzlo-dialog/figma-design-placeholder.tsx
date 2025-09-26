import { Plus } from "lucide-react"
import { memo, useMemo } from "react"

interface FigmaDesignPlaceholderProps {
  onClick?: () => void
  aspectRatio?: number | string | null
  minHeight?: number | string | null
}

const FigmaDesignPlaceholder = memo(
  ({
    onClick,
    aspectRatio = null,
    minHeight = null
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
        className="group flex h-full w-full cursor-pointer select-none items-center justify-center overflow-hidden bg-gray-200 transition-colors hover:bg-gray-300"
        onClick={onClick}>
        <div className="flex h-full flex-col items-center justify-center gap-1 text-gray-600 group-hover:text-gray-800">
          <Plus size={16} />
          <div className="text-center text-sm font-medium">
            Add design reference
          </div>
        </div>
      </div>
    )
  }
)

FigmaDesignPlaceholder.displayName = "FigmaDesignPlaceholder"

export default FigmaDesignPlaceholder
