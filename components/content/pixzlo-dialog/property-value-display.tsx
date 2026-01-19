import { Check, Copy } from "lucide-react"
import { memo, useState } from "react"

interface PropertyValueDisplayProps {
  value: string
  className?: string
  maxLines?: number
  showColorPreview?: boolean
  colorValue?: string | null
}

const PropertyValueDisplay = memo(
  ({
    value,
    className = "",
    maxLines = 4,
    showColorPreview = false,
    colorValue = null
  }: PropertyValueDisplayProps): JSX.Element => {
    const [copied, setCopied] = useState(false)

    const handleCopy = async (): Promise<void> => {
      try {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Failed to copy text
      }
    }

    const textClampStyle = {
      display: "-webkit-box",
      WebkitBoxOrient: "vertical" as const,
      WebkitLineClamp: maxLines,
      overflow: "hidden",
      lineHeight: "1.25",
      wordBreak: "break-all" as const
    }

    return (
      <div className="group relative">
        <div className="flex items-start gap-1">
          {showColorPreview && colorValue && (
            <div
              className="h-4 w-4 flex-shrink-0 rounded-[2px] ring-1 ring-inset ring-black/10"
              style={{
                backgroundColor:
                  colorValue === "transparent" ? "transparent" : colorValue
              }}
            />
          )}

          <div
            className={`cursor-pointer select-text text-wrap pr-2 ${className}`}
            style={textClampStyle}
            onClick={handleCopy}
            title={`${value} (Click to copy)`}>
            {value}
          </div>

          {/* Copy button - absolutely positioned with backdrop */}
          <button
            className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded bg-black/20 text-white opacity-0 transition-opacity duration-150 hover:bg-black/40 group-hover:opacity-100"
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy value"}
            type="button">
            {copied ? (
              <Check size={10} className="text-green-400" />
            ) : (
              <Copy size={10} />
            )}
          </button>
        </div>
      </div>
    )
  }
)

PropertyValueDisplay.displayName = "PropertyValueDisplay"

export default PropertyValueDisplay
