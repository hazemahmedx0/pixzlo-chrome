import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { memo } from "react"

interface FigmaUrlInputProps {
  figmaUrl: string
  setFigmaUrl: (url: string) => void
  isProcessing: boolean
  error: string | null
  onSubmit: () => Promise<void>
  onCancel: () => void
  showCancel?: boolean
  onBack?: () => void
  showBack?: boolean
}

/**
 * Component for inputting and validating Figma URLs
 */
const FigmaUrlInput = memo(
  ({
    figmaUrl,
    setFigmaUrl,
    isProcessing,
    error,
    onSubmit,
    onCancel,
    showCancel = true,
    onBack,
    showBack = false
  }: FigmaUrlInputProps): JSX.Element => {
    return (
      <div
        className="custom-scrollbar flex h-full w-full overflow-y-auto p-6"
        data-scrollable="true"
        onWheel={(e) => e.stopPropagation()}>
        <div className="m-auto max-w-md">
          {/* SVG Image */}

          <div className="text-left">
            <p className="mb-2 text-label-md text-gray-900">Link Figma file</p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-lg bg-red-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Connection Failed</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="figma-url">Figma frame URL</Label>
              <Input
                id="figma-url"
                type="url"
                placeholder="https://www.figma.com/design/9QffdeFxxspmLoj72Rimc..."
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                className="mt-1"
                // Event isolation - prevent Radix UI focus-trap interference
                onFocus={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
              <p className="mt-2 text-paragraph-xs text-gray-500">
                Paste a link to a specific Figma frame. Ensure you have edit
                permissions to access design variables.
              </p>
            </div>

            <div className="flex gap-3">
              {showBack && onBack && (
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="flex-shrink-0"
                  disabled={isProcessing}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              {showCancel && (
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                  disabled={isProcessing}>
                  Cancel
                </Button>
              )}
              <Button
                onClick={() => {
                  onSubmit()
                }}
                className={showCancel || showBack ? "flex-1" : "w-full"}
                variant="sky"
                disabled={isProcessing || !figmaUrl.trim()}>
                {isProcessing ? "Fetching..." : "Link Figma File"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

FigmaUrlInput.displayName = "FigmaUrlInput"

export default FigmaUrlInput
