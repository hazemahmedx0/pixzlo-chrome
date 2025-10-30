import { CSSExtractor, type CSSProperty } from "@/lib/css-extractor"
import {
  EnhancedFigmaExtractor,
  type EnhancedFigmaProperties
} from "@/lib/enhanced-figma-utils"
import { ValueComparison, type ComparisonResult } from "@/lib/value-comparison"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import { memo } from "react"

import type { ValueDisplayMode } from "./code-value-display"
import PropertyCheckbox from "./property-checkbox"
import PropertyValueDisplay from "./property-value-display"

interface FigmaProperties {
  width?: number
  height?: number
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  color?: string
  backgroundColor?: string
  borderRadius?: number
  padding?: number | string
  margin?: number | string
  lineHeight?: number | string
  letterSpacing?: number | string
  textAlign?: string
  opacity?: number
  display?: string
  gap?: number | string
  boxShadow?: string
  [key: string]: any
}

interface CSSPropertyRowProps {
  property: CSSProperty
  displayMode: ValueDisplayMode
  index: number
  figmaProperties?: FigmaProperties | null | EnhancedFigmaProperties
}

const CSSPropertyRow = memo(
  ({
    property,
    displayMode,
    index,
    figmaProperties
  }: CSSPropertyRowProps): JSX.Element => {
    const { selectedProperties, toggleProperty } = usePixzloDialogStore()
    const isSelected = selectedProperties.has(property.name)

    const handleCheckboxChange = (): void => {
      toggleProperty(property.name)
    }

    // Get Figma property value using enhanced extractor
    const getFigmaValue = (): string | null => {
      if (!figmaProperties) return null

      // Try enhanced figma extractor first
      if ("_rawElement" in figmaProperties) {
        return EnhancedFigmaExtractor.getFigmaPropertyValue(
          property.name,
          figmaProperties as EnhancedFigmaProperties
        )
      }

      // Fallback to legacy property mapping for backward compatibility
      const propertyMap: Record<string, string> = {
        width: "width",
        height: "height",
        "font-family": "fontFamily",
        "font-size": "fontSize",
        "font-weight": "fontWeight",
        color: "color",
        "background-color": "backgroundColor",
        "border-radius": "borderRadius",
        padding: "padding",
        margin: "margin",
        "box-shadow": "boxShadow"
      }

      const figmaProperty = propertyMap[property.name]
      if (!figmaProperty || !(figmaProperty in figmaProperties)) return null

      const value = figmaProperties[figmaProperty]
      if (value === undefined || value === null) return null

      // Format the value based on property type
      if (property.name === "width" || property.name === "height") {
        return `${value}px`
      } else if (property.name === "font-size") {
        return `${value}px`
      } else if (property.name === "border-radius") {
        return `${value}px`
      } else {
        return String(value)
      }
    }

    // Get values and compare using enhanced comparison
    const cssValue = CSSExtractor.formatValue(property, displayMode)
    const figmaValue = getFigmaValue()

    // Use enhanced comparison logic
    const comparisonResult: ComparisonResult =
      figmaValue && figmaValue !== "undefined"
        ? ValueComparison.compareValues(cssValue, figmaValue)
        : {
            isMatch: false,
            normalizedCssValue: cssValue,
            normalizedFigmaValue: "",
            confidence: 0
          }

    const isMatch = comparisonResult.isMatch

    // Helper function to get figma color for preview
    const getFigmaColor = (): string | null => {
      if (!figmaValue || figmaValue === "undefined") return null

      // Check if it's a color property and extract color
      if (property.name.includes("color") || property.name === "border") {
        return figmaValue
      }

      return null
    }

    const figmaColor = getFigmaColor()

    return (
      <div
        key={`${property.name}-${index}`}
        className="grid grid-cols-[32px_120px_1fr_1fr] gap-2 border-b border-gray-100 px-3 py-2 text-paragraph-xs text-gray-600 last:border-b-0 hover:bg-gray-100">
        {/* Checkbox */}
        <div className="flex items-start pt-0.5">
          <PropertyCheckbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
          />
        </div>

        {/* Property name */}
        <div className="z-5 sticky left-0 flex items-start break-all pt-0.5 text-gray-700">
          {property.name}
        </div>

        {/* Code value */}
        <div className="code-column">
          <PropertyValueDisplay
            value={
              comparisonResult.normalizedCssValue ||
              CSSExtractor.formatValue(property, displayMode)
            }
            className={`${
              figmaValue && figmaValue !== "undefined" && isMatch
                ? "text-gray-650" // Gray for matching values
                : figmaValue && figmaValue !== "undefined"
                  ? "text-red-600" // Red for different values
                  : "text-red-600" // Red if no Figma value to compare (CSS has value but Figma doesn't)
            }`}
            showColorPreview={!!property.color}
            colorValue={property.color}
            maxLines={4}
          />
        </div>

        {/* Design value */}
        <div className="design-column">
          {figmaValue && figmaValue !== "undefined" ? (
            <PropertyValueDisplay
              value={comparisonResult.normalizedFigmaValue || figmaValue}
              className={`${
                isMatch
                  ? "text-gray-650" // Gray for matching values
                  : "text-red-600" // Red for different values
              }`}
              showColorPreview={!!figmaColor}
              colorValue={figmaColor}
              maxLines={4}
            />
          ) : (
            <span className="italic text-gray-400">undefined</span>
          )}
        </div>
      </div>
    )
  }
)

CSSPropertyRow.displayName = "CSSPropertyRow"

export default CSSPropertyRow
