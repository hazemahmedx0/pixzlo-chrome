import { Button } from "@/components/ui/button"
import type { FigmaFile, FigmaNode } from "@/types/figma"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { memo } from "react"

interface FigmaFrameSelectionProps {
  figmaFile: FigmaFile
  selectedFrame: FigmaNode | null
  frameImages: Record<string, string>
  isProcessing: boolean
  error: string | null
  onFrameSelect: (frame: FigmaNode) => void
  onConfirm: () => Promise<void>
  onBack: () => void
}

/**
 * Component for selecting frames from a Figma file
 */
const FigmaFrameSelection = memo(
  ({
    figmaFile,
    selectedFrame,
    frameImages,
    isProcessing,
    error,
    onFrameSelect,
    onConfirm,
    onBack
  }: FigmaFrameSelectionProps): JSX.Element => {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg p-1 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h3 className="text-lg font-semibold">Select Frame</h3>
            <p className="text-sm text-gray-600">
              Choose a frame from "{figmaFile.name}"
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg bg-red-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
            <div className="text-sm text-red-700">
              <p className="font-medium">Error</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border p-3">
            {(figmaFile as any).pages?.map((page: any) => (
              <div key={page.id} className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">
                  {page.name}
                </h4>
                {page.children
                  ?.filter((child) => child.type === "FRAME")
                  .map((frame) => (
                    <button
                      key={frame.id}
                      onClick={() => onFrameSelect(frame)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                        selectedFrame?.id === frame.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}>
                      {/* Frame Thumbnail */}
                      <div className="flex-shrink-0">
                        {frameImages[frame.id] ? (
                          <img
                            src={frameImages[frame.id]}
                            alt={frame.name}
                            className="h-12 w-12 rounded border object-cover"
                            onError={(e) => {
                              console.log(
                                "Image failed to load:",
                                frameImages[frame.id]
                              )
                              e.currentTarget.style.display = "none"
                            }}
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded border bg-gray-100">
                            <div className="text-xs text-gray-400">📱</div>
                          </div>
                        )}
                      </div>

                      {/* Frame Info */}
                      <div className="flex-grow">
                        <div className="font-medium">{frame.name}</div>
                        <div className="text-xs text-gray-500">
                          {frame.absoluteBoundingBox
                            ? `${Math.round(frame.absoluteBoundingBox.width)} × ${Math.round(frame.absoluteBoundingBox.height)}`
                            : "Frame"}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1"
              disabled={isProcessing}>
              Back
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1"
              disabled={isProcessing || !selectedFrame}>
              {isProcessing ? "Creating Link..." : "Use Selected Frame"}
            </Button>
          </div>
        </div>
      </div>
    )
  }
)

FigmaFrameSelection.displayName = "FigmaFrameSelection"

export default FigmaFrameSelection
