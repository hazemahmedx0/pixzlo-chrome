import type { DrawingElement, DrawingTool } from "@/types/drawing"

/**
 * Drawing tool constants and utilities
 */
export const DRAWING_CONSTANTS = {
  DEFAULT_COLOR: "#f24822", // red
  DEFAULT_STROKE_WIDTH: 2,
  DEFAULT_FONT_SIZE: 16,
  DEFAULT_FONT_FAMILY: "Arial",
  MIN_STROKE_WIDTH: 1,
  MAX_STROKE_WIDTH: 10,
  HISTORY_LIMIT: 50,
  TEXT_PLACEHOLDER: "Type here"
} as const

/**
 * Available drawing tools with their display information
 */
export const DRAWING_TOOLS = [
  { tool: "select" as DrawingTool, label: "Select" },
  { tool: "arrow" as DrawingTool, label: "Arrow" },
  { tool: "text" as DrawingTool, label: "Text" },
  { tool: "pen" as DrawingTool, label: "Pen" },
  { tool: "rectangle" as DrawingTool, label: "Rectangle" },
  { tool: "circle" as DrawingTool, label: "Circle" }
] as const

/**
 * Drawing color palette (4×2 grid)
 */
export const PALETTE_COLORS = [
  "#1e1e1e", // dark
  "#f24822", // red
  "#ff9e42", // orange
  "#ffc943", // yellow
  "#66d575", // green
  "#3dadff", // blue
  "#874fff", // purple
  "#ffffff" // white
] as const

/**
 * Generates a unique ID for drawing elements
 */
export const generateElementId = (): string => {
  return `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validates if a color string is a valid hex color
 */
export const isValidHexColor = (color: string): boolean => {
  return /^#[0-9A-F]{6}$/i.test(color)
}

/**
 * Checks if an element is considered empty or placeholder
 */
export const isEmptyElement = (element: DrawingElement): boolean => {
  switch (element.type) {
    case "text":
      return (
        !element.text ||
        element.text.trim() === "" ||
        element.text === DRAWING_CONSTANTS.TEXT_PLACEHOLDER
      )
    case "pen":
      return element.points.length < 4 // Less than 2 points
    case "rectangle":
      return Math.abs(element.width) < 5 || Math.abs(element.height) < 5
    case "circle":
      return element.radius < 5
    case "arrow":
      const [x1, y1, x2, y2] = element.points
      const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
      return distance < 10
    default:
      return false
  }
}

/**
 * Clamps a number between min and max values
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max)
}

/**
 * Calculates the distance between two points
 */
export const calculateDistance = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

/**
 * Deep clones a drawing element
 */
export const cloneElement = <T extends DrawingElement>(element: T): T => {
  return JSON.parse(JSON.stringify(element))
}

/**
 * Checks if two drawing element arrays are equal
 */
export const areElementsEqual = (
  elements1: DrawingElement[],
  elements2: DrawingElement[]
): boolean => {
  if (elements1.length !== elements2.length) return false
  return JSON.stringify(elements1) === JSON.stringify(elements2)
}
