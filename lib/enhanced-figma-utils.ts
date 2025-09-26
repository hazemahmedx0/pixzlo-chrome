/**
 * Enhanced Figma utilities with recursive text element search and comprehensive property extraction
 */

import { ValueComparison } from "./value-comparison"

export interface EnhancedFigmaProperties {
  // Dimensions
  width?: number
  height?: number

  // Typography
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  lineHeight?: number
  letterSpacing?: number
  textAlign?: string
  color?: string

  // Layout
  backgroundColor?: string
  borderRadius?: number
  padding?: string
  margin?: string

  // Effects
  boxShadow?: string
  opacity?: number

  // Additional properties
  display?: string
  position?: string
  gap?: number

  // Raw Figma data for debugging
  _rawElement?: any
  _textElements?: any[]

  [key: string]: any
}

export class EnhancedFigmaExtractor {
  /**
   * Extract comprehensive properties from a Figma element with recursive text search
   */
  static extractEnhancedProperties(
    element: any,
    allElements?: any[]
  ): EnhancedFigmaProperties {
    const properties: EnhancedFigmaProperties = {
      _rawElement: element,
      _textElements: []
    }

    // Extract basic properties
    this.extractDimensions(element, properties)
    this.extractLayoutProperties(element, properties)
    this.extractEffects(element, properties)

    // Extract or find text properties
    if (element.type === "TEXT") {
      // Direct text element
      this.extractTextProperties(element, properties)
      properties._textElements = [element]
    } else {
      // Look for text elements within this element
      const textElements = this.findTextElements(element, allElements)
      if (textElements.length > 0) {
        // Use the first text element found
        this.extractTextProperties(textElements[0], properties)
        properties._textElements = textElements
      }
    }

    return properties
  }

  /**
   * Extract dimension properties
   */
  private static extractDimensions(
    element: any,
    properties: EnhancedFigmaProperties
  ): void {
    if (element.absoluteBoundingBox) {
      properties.width = this.roundToPrecision(
        element.absoluteBoundingBox.width,
        1
      )
      properties.height = this.roundToPrecision(
        element.absoluteBoundingBox.height,
        1
      )
    }
  }

  /**
   * Extract layout properties (colors, borders, etc.)
   */
  private static extractLayoutProperties(
    element: any,
    properties: EnhancedFigmaProperties
  ): void {
    // Background color
    if (element.fills && element.fills.length > 0) {
      const fill = element.fills.find((f: any) => f.visible !== false)
      if (fill && fill.type === "SOLID" && fill.color) {
        const { r, g, b } = fill.color
        const alpha = fill.opacity !== undefined ? fill.opacity : 1
        properties.backgroundColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`
      }
    }

    // Border radius
    if (element.cornerRadius !== undefined) {
      properties.borderRadius = this.roundToPrecision(element.cornerRadius, 0)
    } else if (element.rectangleCornerRadii) {
      // Handle different corner radii
      const radii = element.rectangleCornerRadii
      if (radii.every((r: number) => r === radii[0])) {
        properties.borderRadius = this.roundToPrecision(radii[0], 0)
      }
    }

    // Layout properties
    if (element.layoutMode) {
      properties.display =
        element.layoutMode === "HORIZONTAL"
          ? "flex"
          : element.layoutMode === "VERTICAL"
            ? "flex"
            : "block"
    }

    // Gap (for flex layouts)
    if (element.itemSpacing !== undefined) {
      properties.gap = this.roundToPrecision(element.itemSpacing, 0)
    }

    // Padding
    if (
      element.paddingLeft !== undefined ||
      element.paddingTop !== undefined ||
      element.paddingRight !== undefined ||
      element.paddingBottom !== undefined
    ) {
      const top = element.paddingTop || 0
      const right = element.paddingRight || 0
      const bottom = element.paddingBottom || 0
      const left = element.paddingLeft || 0

      if (top === right && right === bottom && bottom === left) {
        properties.padding = `${this.roundToPrecision(top, 0)}px`
      } else if (top === bottom && left === right) {
        properties.padding = `${this.roundToPrecision(top, 0)}px ${this.roundToPrecision(right, 0)}px`
      } else {
        properties.padding = `${this.roundToPrecision(top, 0)}px ${this.roundToPrecision(right, 0)}px ${this.roundToPrecision(bottom, 0)}px ${this.roundToPrecision(left, 0)}px`
      }
    }

    // Opacity
    if (element.opacity !== undefined && element.opacity !== 1) {
      properties.opacity = this.roundToPrecision(element.opacity, 2)
    }
  }

  /**
   * Extract text-specific properties
   */
  private static extractTextProperties(
    textElement: any,
    properties: EnhancedFigmaProperties
  ): void {
    if (!textElement || textElement.type !== "TEXT") return

    // Font properties from style
    if (textElement.style) {
      if (textElement.style.fontFamily) {
        properties.fontFamily = textElement.style.fontFamily
      }
      if (textElement.style.fontSize) {
        properties.fontSize = this.roundToPrecision(
          textElement.style.fontSize,
          0
        )
      }
      if (textElement.style.fontWeight) {
        properties.fontWeight = textElement.style.fontWeight
      }
      if (textElement.style.lineHeightPx) {
        properties.lineHeight = `${this.roundToPrecision(textElement.style.lineHeightPx, 0)}px`
      }
      if (textElement.style.letterSpacing) {
        properties.letterSpacing = `${this.roundToPrecision(textElement.style.letterSpacing, 2)}px`
      }
      if (textElement.style.textAlignHorizontal) {
        const align = textElement.style.textAlignHorizontal.toLowerCase()
        properties.textAlign =
          align === "center" ? "center" : align === "right" ? "right" : "left"
      }
    }

    // Text color
    if (textElement.fills && textElement.fills.length > 0) {
      const fill = textElement.fills.find((f: any) => f.visible !== false)
      if (fill && fill.type === "SOLID" && fill.color) {
        const { r, g, b } = fill.color
        const alpha = fill.opacity !== undefined ? fill.opacity : 1
        properties.color = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`
      }
    }
  }

  /**
   * Extract effects (shadows, etc.)
   */
  private static extractEffects(
    element: any,
    properties: EnhancedFigmaProperties
  ): void {
    if (element.effects && element.effects.length > 0) {
      const dropShadow = element.effects.find(
        (effect: any) =>
          effect.type === "DROP_SHADOW" && effect.visible !== false
      )

      if (dropShadow) {
        const offsetX = dropShadow.offset?.x || 0
        const offsetY = dropShadow.offset?.y || 0
        const radius = dropShadow.radius || 0
        const spread = dropShadow.spread || 0

        let shadowColor = "rgba(0, 0, 0, 0.25)"
        if (dropShadow.color) {
          const { r, g, b } = dropShadow.color
          const alpha =
            dropShadow.color.a !== undefined ? dropShadow.color.a : 0.25
          shadowColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`
        }

        properties.boxShadow =
          spread > 0
            ? `${offsetX}px ${offsetY}px ${radius}px ${spread}px ${shadowColor}`
            : `${offsetX}px ${offsetY}px ${radius}px ${shadowColor}`
      }
    }
  }

  /**
   * Recursively find text elements within a Figma element
   */
  private static findTextElements(
    parentElement: any,
    allElements?: any[]
  ): any[] {
    const textElements: any[] = []

    // If we have all elements, search through them
    if (allElements) {
      for (const element of allElements) {
        if (element.type === "TEXT" && this.isChildOf(element, parentElement)) {
          textElements.push(element)
        }
      }
    }

    // Also check direct children
    if (parentElement.children) {
      this.findTextElementsRecursive(parentElement.children, textElements)
    }

    // Sort by position (top-left first) to get the most prominent text
    return textElements.sort((a, b) => {
      if (!a.absoluteBoundingBox || !b.absoluteBoundingBox) return 0

      const aTop = a.absoluteBoundingBox.y
      const bTop = b.absoluteBoundingBox.y
      const aLeft = a.absoluteBoundingBox.x
      const bLeft = b.absoluteBoundingBox.x

      // Sort by top position first, then left position
      if (Math.abs(aTop - bTop) < 5) {
        return aLeft - bLeft
      }
      return aTop - bTop
    })
  }

  /**
   * Recursively search for text elements in children
   */
  private static findTextElementsRecursive(
    children: any[],
    textElements: any[]
  ): void {
    for (const child of children) {
      if (child.type === "TEXT") {
        textElements.push(child)
      } else if (child.children) {
        this.findTextElementsRecursive(child.children, textElements)
      }
    }
  }

  /**
   * Check if an element is a child of another element
   */
  private static isChildOf(childElement: any, parentElement: any): boolean {
    if (
      !childElement.absoluteBoundingBox ||
      !parentElement.absoluteBoundingBox
    ) {
      return false
    }

    const childBox = childElement.absoluteBoundingBox
    const parentBox = parentElement.absoluteBoundingBox

    return (
      childBox.x >= parentBox.x &&
      childBox.y >= parentBox.y &&
      childBox.x + childBox.width <= parentBox.x + parentBox.width &&
      childBox.y + childBox.height <= parentBox.y + parentBox.height
    )
  }

  /**
   * Round number to specified precision
   */
  private static roundToPrecision(value: number, precision: number): number {
    const factor = Math.pow(10, precision)
    return Math.round(value * factor) / factor
  }

  /**
   * Get Figma property value for a given CSS property name
   */
  static getFigmaPropertyValue(
    cssPropertyName: string,
    figmaProperties: EnhancedFigmaProperties
  ): string | null {
    if (!figmaProperties) return null

    // Enhanced property mapping
    const propertyMap: Record<string, string> = {
      width: "width",
      height: "height",
      "font-family": "fontFamily",
      "font-size": "fontSize",
      "font-weight": "fontWeight",
      "line-height": "lineHeight",
      "letter-spacing": "letterSpacing",
      "text-align": "textAlign",
      color: "color",
      "background-color": "backgroundColor",
      "border-radius": "borderRadius",
      padding: "padding",
      margin: "margin",
      "box-shadow": "boxShadow",
      opacity: "opacity",
      display: "display",
      gap: "gap"
    }

    const figmaProperty = propertyMap[cssPropertyName]
    if (!figmaProperty || !(figmaProperty in figmaProperties)) return null

    const value = figmaProperties[figmaProperty]
    if (value === undefined || value === null) return null

    // Format the value based on property type
    return this.formatFigmaValueForComparison(cssPropertyName, value)
  }

  /**
   * Format Figma value for comparison with CSS
   */
  private static formatFigmaValueForComparison(
    propertyName: string,
    value: any
  ): string {
    switch (propertyName) {
      case "width":
      case "height":
      case "font-size":
      case "border-radius":
        return `${value}px`

      case "gap":
        return typeof value === "number" ? `${value}px` : String(value)

      case "font-weight":
        return String(value)

      case "opacity":
        return String(value)

      case "color":
      case "background-color":
        // Colors are already in rgba format from extraction
        return ValueComparison.formatColorForDisplay(String(value), "absolute")

      default:
        return String(value)
    }
  }
}
