import type React from "react"

export interface CSSProperty {
  name: string
  value: string
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

    // Key CSS properties to extract
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
      "opacity",
      "z-index"
    ]

    const properties: CSSProperty[] = propertiesToExtract
      .map((prop) => {
        const value = computedStyle.getPropertyValue(prop)
        const property: CSSProperty = {
          name: prop,
          value: value || "0px",
          computedValue: value
        }

        // Extract color values for color properties
        if (prop.includes("color") || prop === "border") {
          property.color = this.extractColor(value)
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

  static formatValue(property: CSSProperty): string {
    // Format values for display
    if (property.name === "margin" || property.name === "padding") {
      return property.value.replace(/\s+/g, " ").trim()
    }

    if (property.name === "font-family") {
      return property.value.replace(/"/g, '"')
    }

    return property.value
  }

  static getColorStyle(property: CSSProperty): React.CSSProperties | undefined {
    if (!property.color) return undefined

    return {
      backgroundColor:
        property.color === "transparent" ? "transparent" : property.color
    }
  }
}
