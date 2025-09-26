/**
 * Comprehensive value comparison utilities for CSS and Figma properties
 */

export interface ComparisonResult {
  isMatch: boolean
  normalizedCssValue: string
  normalizedFigmaValue: string
  confidence: number // 0-1, how confident we are in the match
}

export class ValueComparison {
  /**
   * Compare CSS and Figma values with intelligent normalization
   */
  static compareValues(cssValue: string, figmaValue: string): ComparisonResult {
    if (!cssValue || !figmaValue) {
      return {
        isMatch: false,
        normalizedCssValue: cssValue || "",
        normalizedFigmaValue: figmaValue || "",
        confidence: 0
      }
    }

    // Normalize both values
    const normalizedCss = this.normalizeValue(cssValue)
    const normalizedFigma = this.normalizeValue(figmaValue)

    // Check for exact match first
    if (normalizedCss === normalizedFigma) {
      return {
        isMatch: true,
        normalizedCssValue: normalizedCss,
        normalizedFigmaValue: normalizedFigma,
        confidence: 1.0
      }
    }

    // Check for color matches
    if (this.isColor(cssValue) && this.isColor(figmaValue)) {
      return this.compareColors(cssValue, figmaValue)
    }

    // Check for numeric matches (with tolerance)
    if (this.isNumeric(cssValue) && this.isNumeric(figmaValue)) {
      return this.compareNumericValues(cssValue, figmaValue)
    }

    // Check for font family matches
    if (this.isFontFamily(cssValue) && this.isFontFamily(figmaValue)) {
      return this.compareFontFamilies(cssValue, figmaValue)
    }

    return {
      isMatch: false,
      normalizedCssValue: normalizedCss,
      normalizedFigmaValue: normalizedFigma,
      confidence: 0
    }
  }

  /**
   * Normalize a value for comparison
   */
  private static normalizeValue(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/"/g, '"') // Normalize quotes
      .replace(/'/g, "'") // Normalize quotes
  }

  /**
   * Check if a value represents a color
   */
  private static isColor(value: string): boolean {
    const colorPatterns = [
      /^#[0-9a-fA-F]{3,8}$/, // hex
      /^rgba?\(/, // rgb/rgba
      /^hsla?\(/, // hsl/hsla
      /^(transparent|black|white|red|green|blue|yellow|orange|purple|pink|gray|grey)$/i // named colors
    ]
    return colorPatterns.some((pattern) => pattern.test(value.trim()))
  }

  /**
   * Check if a value is numeric (with units)
   */
  private static isNumeric(value: string): boolean {
    const numericPattern =
      /^-?\d*\.?\d+(px|em|rem|%|vh|vw|pt|pc|in|mm|cm|ex|ch|vmin|vmax)?$/
    return numericPattern.test(value.trim())
  }

  /**
   * Check if a value is a font family
   */
  private static isFontFamily(value: string): boolean {
    // Font families typically contain font names, possibly quoted, and may include fallbacks
    return (
      /[a-zA-Z]/.test(value) && !this.isColor(value) && !this.isNumeric(value)
    )
  }

  /**
   * Compare two color values
   */
  private static compareColors(
    cssColor: string,
    figmaColor: string
  ): ComparisonResult {
    const cssRgba = this.parseColor(cssColor)
    const figmaRgba = this.parseColor(figmaColor)

    if (!cssRgba || !figmaRgba) {
      return {
        isMatch: false,
        normalizedCssValue: cssColor,
        normalizedFigmaValue: figmaColor,
        confidence: 0
      }
    }

    // Compare RGBA values with tolerance
    const tolerance = 2 // Allow 2 unit difference in RGB values
    const isMatch =
      Math.abs(cssRgba.r - figmaRgba.r) <= tolerance &&
      Math.abs(cssRgba.g - figmaRgba.g) <= tolerance &&
      Math.abs(cssRgba.b - figmaRgba.b) <= tolerance &&
      Math.abs(cssRgba.a - figmaRgba.a) <= 0.01 // Alpha tolerance

    const normalizedCss = `rgba(${cssRgba.r}, ${cssRgba.g}, ${cssRgba.b}, ${cssRgba.a})`
    const normalizedFigma = `rgba(${figmaRgba.r}, ${figmaRgba.g}, ${figmaRgba.b}, ${figmaRgba.a})`

    return {
      isMatch,
      normalizedCssValue: normalizedCss,
      normalizedFigmaValue: normalizedFigma,
      confidence: isMatch ? 0.95 : 0
    }
  }

  /**
   * Parse a color string to RGBA values
   */
  private static parseColor(
    color: string
  ): { r: number; g: number; b: number; a: number } | null {
    const normalizedColor = color.trim().toLowerCase()

    // Parse rgba() format
    const rgbaMatch = normalizedColor.match(
      /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/
    )
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1], 10),
        g: parseInt(rgbaMatch[2], 10),
        b: parseInt(rgbaMatch[3], 10),
        a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
      }
    }

    // Parse hex format
    const hexMatch = normalizedColor.match(
      /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/
    )
    if (hexMatch) {
      const hex = hexMatch[1]
      let r: number,
        g: number,
        b: number,
        a = 1

      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16)
        g = parseInt(hex[1] + hex[1], 16)
        b = parseInt(hex[2] + hex[2], 16)
      } else if (hex.length === 6) {
        r = parseInt(hex.substr(0, 2), 16)
        g = parseInt(hex.substr(2, 2), 16)
        b = parseInt(hex.substr(4, 2), 16)
      } else if (hex.length === 8) {
        r = parseInt(hex.substr(0, 2), 16)
        g = parseInt(hex.substr(2, 2), 16)
        b = parseInt(hex.substr(4, 2), 16)
        a = parseInt(hex.substr(6, 2), 16) / 255
      } else {
        return null
      }

      return { r, g, b, a }
    }

    // Named colors
    const namedColors: Record<
      string,
      { r: number; g: number; b: number; a: number }
    > = {
      transparent: { r: 0, g: 0, b: 0, a: 0 },
      black: { r: 0, g: 0, b: 0, a: 1 },
      white: { r: 255, g: 255, b: 255, a: 1 },
      red: { r: 255, g: 0, b: 0, a: 1 },
      green: { r: 0, g: 128, b: 0, a: 1 },
      blue: { r: 0, g: 0, b: 255, a: 1 }
    }

    return namedColors[normalizedColor] || null
  }

  /**
   * Compare two numeric values with tolerance
   */
  private static compareNumericValues(
    cssValue: string,
    figmaValue: string
  ): ComparisonResult {
    const cssNum = this.extractNumericValue(cssValue)
    const figmaNum = this.extractNumericValue(figmaValue)

    if (cssNum === null || figmaNum === null) {
      return {
        isMatch: false,
        normalizedCssValue: cssValue,
        normalizedFigmaValue: figmaValue,
        confidence: 0
      }
    }

    // Different tolerance based on value magnitude
    const tolerance = Math.max(1, Math.abs(cssNum.value) * 0.02) // 2% tolerance, minimum 1 unit

    const isMatch = Math.abs(cssNum.value - figmaNum.value) <= tolerance

    return {
      isMatch,
      normalizedCssValue: `${Math.round(cssNum.value * 100) / 100}${cssNum.unit}`,
      normalizedFigmaValue: `${Math.round(figmaNum.value * 100) / 100}${figmaNum.unit}`,
      confidence: isMatch ? 0.9 : 0
    }
  }

  /**
   * Extract numeric value and unit from a string
   */
  private static extractNumericValue(
    value: string
  ): { value: number; unit: string } | null {
    const match = value
      .trim()
      .match(
        /^(-?\d*\.?\d+)(px|em|rem|%|vh|vw|pt|pc|in|mm|cm|ex|ch|vmin|vmax)?$/
      )
    if (!match) return null

    return {
      value: parseFloat(match[1]),
      unit: match[2] || ""
    }
  }

  /**
   * Compare font family values
   */
  private static compareFontFamilies(
    cssValue: string,
    figmaValue: string
  ): ComparisonResult {
    // Extract primary font family names
    const cssFonts = this.extractFontNames(cssValue)
    const figmaFonts = this.extractFontNames(figmaValue)

    // Check if any font names match
    const hasMatch = cssFonts.some((cssFont) =>
      figmaFonts.some(
        (figmaFont) => cssFont.toLowerCase() === figmaFont.toLowerCase()
      )
    )

    return {
      isMatch: hasMatch,
      normalizedCssValue: cssFonts.join(", "),
      normalizedFigmaValue: figmaFonts.join(", "),
      confidence: hasMatch ? 0.8 : 0
    }
  }

  /**
   * Extract font names from font-family string
   */
  private static extractFontNames(fontFamily: string): string[] {
    return fontFamily
      .split(",")
      .map((font) => font.trim().replace(/['"]/g, ""))
      .filter((font) => font.length > 0)
  }

  /**
   * Format color for consistent display
   */
  static formatColorForDisplay(
    color: string,
    mode: "raw" | "absolute" = "absolute"
  ): string {
    if (!this.isColor(color)) return color

    if (mode === "absolute") {
      const parsed = this.parseColor(color)
      if (parsed) {
        // Always return rgba format for consistency
        return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${parsed.a})`
      }
    }

    return color
  }

  /**
   * Round numeric values to reasonable precision
   */
  static formatNumericForDisplay(value: string, precision = 2): string {
    const parsed = this.extractNumericValue(value)
    if (!parsed) return value

    const roundedValue =
      Math.round(parsed.value * Math.pow(10, precision)) /
      Math.pow(10, precision)
    return `${roundedValue}${parsed.unit}`
  }
}
