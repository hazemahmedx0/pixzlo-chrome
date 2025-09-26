import { memo } from "react"

import CodeValueDisplay, { type ValueDisplayMode } from "./code-value-display"

interface CSSTableHeaderProps {
  displayMode: ValueDisplayMode
  onDisplayModeChange: (mode: ValueDisplayMode) => void
}

const CSSTableHeader = memo(
  ({ displayMode, onDisplayModeChange }: CSSTableHeaderProps): JSX.Element => {
    return (
      <div className="sticky top-0 z-10 grid grid-cols-[120px_1fr_1fr] rounded-t-sm border-b border-gray-100 px-3 py-1.5 text-subheading-2xs uppercase text-gray-350">
        <div className="z-15 sticky left-0">
          <div>PROPERTY</div>
        </div>
        <div>
          <div className="flex justify-start pl-2">
            <CodeValueDisplay
              mode={displayMode}
              onModeChange={onDisplayModeChange}
            />
          </div>
        </div>
        <div>
          <div>DESIGN</div>
        </div>
      </div>
    )
  }
)

CSSTableHeader.displayName = "CSSTableHeader"

export default CSSTableHeader
