import type React from "react"

export interface CSSProperty {
  name: string
  value: string
  rawValue?: string
  computedValue?: string
  color?: string
}

export interface ExtractedCSS {
  selector: string
  properties: CSSProperty[]
}

export class CSSExtractor {
  static extractElementCSS(element: HTMLElement): ExtractedCSS {
    const computedStyle = window.getComputedStyle(element)
    const selector = this.generateSelector(element)

    // Key CSS properties to extract (expanded list)
    const propertiesToExtract = [
      "width",
      "height",
      "font-family",
      "font-size",
      "font-weight",
      "color",
      "background-color",
      "margin",
      "padding",
      "border",
      "border-radius",
      "display",
      "position",
      "line-height",
      "text-align",
      "letter-spacing",
      "text-transform",
      "opacity",
      "z-index",
      "gap",
      "background",
      "background-image",
      "background-size",
      "background-position",
      "box-shadow",
      "min-width",
      "max-width",
      "min-height",
      "max-height"
    ]

    const properties: CSSProperty[] = propertiesToExtract
      .map((prop) => {
        const computedValue = computedStyle.getPropertyValue(prop)
        const rawValue = this.extractRawValue(element, prop)

        const property: CSSProperty = {
          name: prop,
          value: computedValue || "0px",
          rawValue: rawValue || computedValue,
          computedValue
        }

        // Extract color values for color properties
        if (prop.includes("color") || prop === "border") {
          property.color = this.extractColor(computedValue)
        }

        return property
      })
      .filter(
        (prop) => prop.value && prop.value !== "" && prop.value !== "none"
      )

    return {
      selector,
      properties
    }
  }

  private static generateSelector(element: HTMLElement): string {
    // Generate a simple selector
    let selector = element.tagName.toLowerCase()

    if (element.id) {
      selector += `#${element.id}`
    }

    if (element.className) {
      // Handle both string className and SVGAnimatedString
      let classNameStr = ""

      if (typeof element.className === "string") {
        classNameStr = element.className
      } else if (
        element.className &&
        typeof (element.className as any).baseVal === "string"
      ) {
        // SVG elements have className as SVGAnimatedString
        classNameStr = (element.className as any).baseVal
      } else {
        // Fallback to toString if available
        try {
          classNameStr = String(element.className)
        } catch (e) {
          classNameStr = ""
        }
      }

      const classes = classNameStr.split(" ").filter((c) => c.length > 0)
      if (classes.length > 0) {
        selector += `.${classes[0]}` // Use first class only
      }
    }

    return selector
  }

  private static extractColor(value: string): string | undefined {
    // Extract RGB/RGBA values
    const rgbMatch = value.match(/rgba?\(([^)]+)\)/)
    if (rgbMatch) {
      return rgbMatch[0]
    }

    // Extract hex values
    const hexMatch = value.match(/#[0-9a-fA-F]{3,6}/)
    if (hexMatch) {
      return hexMatch[0]
    }

    // Named colors
    const namedColors = [
      "transparent",
      "black",
      "white",
      "red",
      "green",
      "blue"
    ]
    if (namedColors.includes(value.toLowerCase())) {
      return value
    }

    return undefined
  }

  private static extractRawValue(
    element: HTMLElement,
    property: string
  ): string | undefined {
    // Try to get the raw value from inline styles first
    const inlineValue = element.style.getPropertyValue(property)
    if (inlineValue) {
      return inlineValue
    }

    // Collect all matching rules from stylesheets
    const matchingRules: { specificity: number; value: string }[] = []
    const sheets = Array.from(document.styleSheets)

    for (const sheet of sheets) {
      try {
        const rules = Array.from(sheet.cssRules || [])
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule) {
            try {
              if (element.matches(rule.selectorText)) {
                const ruleValue = rule.style.getPropertyValue(property)
                if (ruleValue) {
                  // Calculate specificity (rough approximation)
                  const specificity = this.calculateSpecificity(rule.selectorText)
                  matchingRules.push({ specificity, value: ruleValue })
                }
              }
            } catch (e) {
              // Invalid selector or element not matchable - skip
              continue
            }
          }
        }
      } catch (e) {
        // CORS or other access issues - skip this stylesheet
        continue
      }
    }

    // Return the value from the rule with highest specificity
    if (matchingRules.length > 0) {
      matchingRules.sort((a, b) => b.specificity - a.specificity)
      return matchingRules[0].value
    }

    return undefined
  }

  private static calculateSpecificity(selector: string): number {
    // Simple specificity calculation
    // IDs = 100, classes/attributes/pseudo-classes = 10, elements/pseudo-elements = 1
    let specificity = 0

    // Count IDs
    const idMatches = selector.match(/#/g)
    if (idMatches) specificity += idMatches.length * 100

    // Count classes, attributes, and pseudo-classes
    const classMatches = selector.match(/\.|(\[.*?\])|:/g)
    if (classMatches) specificity += classMatches.length * 10

    // Count elements
    const elementMatches = selector.match(/[a-zA-Z]+/g)
    if (elementMatches) specificity += elementMatches.length * 1

    return specificity
  }

  static formatValue(
    property: CSSProperty,
    mode: "raw" | "absolute" = "absolute"
  ): string {
    const value =
      mode === "raw" ? property.rawValue || property.value : property.value

    // Format values for display
    if (property.name === "margin" || property.name === "padding") {
      return value.replace(/\s+/g, " ").trim()
    }

    if (property.name === "font-family") {
      return value.replace(/"/g, '"')
    }

    // Convert rem to px for absolute mode
    if (mode === "absolute" && value.includes("rem")) {
      return this.convertRemToPx(value)
    }

    // Normalize colors for consistent display
    if (property.name.includes("color") || property.name === "border") {
      return this.normalizeColorForDisplay(value, mode)
    }

    return value
  }

  /**
   * Normalize color values for consistent display across modes
   */
  private static normalizeColorForDisplay(
    value: string,
    mode: "raw" | "absolute"
  ): string {
    if (!value) return value

    // For absolute mode, ensure colors are in consistent format
    if (mode === "absolute") {
      // Parse and normalize RGB colors
      const rgbMatch = value.match(
        /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/
      )
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10)
        const g = parseInt(rgbMatch[2], 10)
        const b = parseInt(rgbMatch[3], 10)
        const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1

        // Always return rgba format for consistency
        return `rgba(${r}, ${g}, ${b}, ${a})`
      }

      // Convert hex to rgba for consistency
      const hexMatch = value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
      if (hexMatch) {
        const hex = hexMatch[1]
        let r: number, g: number, b: number

        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16)
          g = parseInt(hex[1] + hex[1], 16)
          b = parseInt(hex[2] + hex[2], 16)
        } else {
          r = parseInt(hex.substr(0, 2), 16)
          g = parseInt(hex.substr(2, 2), 16)
          b = parseInt(hex.substr(4, 2), 16)
        }

        return `rgba(${r}, ${g}, ${b}, 1)`
      }
    }

    return value
  }

  private static convertRemToPx(value: string): string {
    const remRegex = /([\d.]+)rem/g
    const rootFontSize =
      parseFloat(window.getComputedStyle(document.documentElement).fontSize) ||
      16

    return value.replace(remRegex, (match, remValue) => {
      const pxValue = parseFloat(remValue) * rootFontSize
      return `${pxValue}px`
    })
  }

  static getRawValue(property: CSSProperty): string {
    return property.rawValue || property.value
  }

  static getAbsoluteValue(property: CSSProperty): string {
    return this.formatValue(property, "absolute")
  }

  static getColorStyle(property: CSSProperty): React.CSSProperties | undefined {
    if (!property.color) return undefined

    return {
      backgroundColor:
        property.color === "transparent" ? "transparent" : property.color
    }
  }
}
