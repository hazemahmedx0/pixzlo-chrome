import type { ExtractedCSS } from "@/lib/css-extractor"
import { memo, useState } from "react"

import type { ValueDisplayMode } from "./code-value-display"
import CSSPropertyRow from "./css-property-row"
import CSSTableHeader from "./css-table-header"

interface FigmaProperties {
  width?: number
  height?: number
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  color?: string
  backgroundColor?: string
  borderRadius?: number
  padding?: number
  margin?: number
  [key: string]: any
}

interface StylingTabProps {
  extractedCSS: ExtractedCSS
  figmaProperties?: FigmaProperties | null
}

const StylingTab = memo(
  ({ extractedCSS, figmaProperties }: StylingTabProps): JSX.Element => {
    const [displayMode, setDisplayMode] = useState<ValueDisplayMode>("absolute")

    const handleDisplayModeChange = (mode: ValueDisplayMode): void => {
      setDisplayMode(mode)
    }

    return (
      <div className="flex h-full flex-col">
        <div className="flex h-full flex-col rounded-sm pt-0">
          {/* Table header */}
          <CSSTableHeader
            displayMode={displayMode}
            onDisplayModeChange={handleDisplayModeChange}
          />

          {/* Property rows */}
          <div className="custom-scrollbar flex-1 overflow-y-auto">
            <div className="flex flex-col">
              {extractedCSS.properties.map((property, index) => (
                <CSSPropertyRow
                  key={`${property.name}-${index}`}
                  property={property}
                  displayMode={displayMode}
                  index={index}
                  figmaProperties={figmaProperties}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

StylingTab.displayName = "PixzloDialogStylingTab"

export default StylingTab
