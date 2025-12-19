import { ChevronDown } from "lucide-react"
import { memo, useState } from "react"

export type ValueDisplayMode = "raw" | "absolute"

interface CodeValueDisplayProps {
  mode: ValueDisplayMode
  onModeChange: (mode: ValueDisplayMode) => void
}

const CodeValueDisplay = memo(
  ({ mode, onModeChange }: CodeValueDisplayProps): JSX.Element => {
    const [isOpen, setIsOpen] = useState(false)

    const handleToggle = (): void => {
      setIsOpen(!isOpen)
    }

    const handleModeSelect = (selectedMode: ValueDisplayMode): void => {
      onModeChange(selectedMode)
      setIsOpen(false)
    }

    return (
      <div className="relative inline-block text-left">
        <button
          className="flex items-center justify-start gap-1 uppercase text-gray-350 transition-colors"
          onClick={handleToggle}
          type="button">
          CODE ({mode === "raw" ? "R" : "A"})
          <ChevronDown
            size={12}
            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown menu */}
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="py-1">
                <button
                  className={`block w-full px-4 py-2 text-left text-xs ${
                    mode === "raw"
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => handleModeSelect("raw")}
                  type="button">
                  Raw (As Defined)
                </button>
                <button
                  className={`block w-full px-4 py-2 text-left text-xs ${
                    mode === "absolute"
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => handleModeSelect("absolute")}
                  type="button">
                  Absolute (Processed)
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }
)

CodeValueDisplay.displayName = "CodeValueDisplay"

export default CodeValueDisplay
