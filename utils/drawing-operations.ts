import type { DrawingElement } from "@/types/drawing"

/**
 * Renders a drawing element based on its type
 */
export const renderDrawingElement = (element: DrawingElement) => {
  switch (element.type) {
    case "arrow":
      return "arrow"
    case "pen":
      return "pen"
    case "rectangle":
      return "rectangle"
    case "circle":
      return "circle"
    case "text":
      return "text"
    default:
      return null
  }
}

/**
 * Calculates the bounding box of a drawing element
 */
export const getElementBounds = (element: DrawingElement) => {
  switch (element.type) {
    case "arrow":
      const [x1, y1, x2, y2] = element.points
      return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1)
      }

    case "pen":
      if (element.points.length < 2) {
        return { x: 0, y: 0, width: 0, height: 0 }
      }
      let minX = element.points[0]
      let maxX = element.points[0]
      let minY = element.points[1]
      let maxY = element.points[1]

      for (let i = 0; i < element.points.length; i += 2) {
        const x = element.points[i]
        const y = element.points[i + 1]
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      }

    case "rectangle":
      return {
        x: element.width < 0 ? element.x + element.width : element.x,
        y: element.height < 0 ? element.y + element.height : element.y,
        width: Math.abs(element.width),
        height: Math.abs(element.height)
      }

    case "circle":
      return {
        x: element.x - element.radius,
        y: element.y - element.radius,
        width: element.radius * 2,
        height: element.radius * 2
      }

    case "text":
      // Approximate text bounds based on font size and text length
      const charWidth = element.fontSize * 0.6
      const textWidth = (element.text?.length || 0) * charWidth
      return {
        x: element.x,
        y: element.y,
        width: textWidth,
        height: element.fontSize * 1.2
      }

    default:
      return { x: 0, y: 0, width: 0, height: 0 }
  }
}

/**
 * Checks if a point is inside an element's bounds
 */
export const isPointInElement = (
  point: { x: number; y: number },
  element: DrawingElement,
  tolerance: number = 5
): boolean => {
  const bounds = getElementBounds(element)

  return (
    point.x >= bounds.x - tolerance &&
    point.x <= bounds.x + bounds.width + tolerance &&
    point.y >= bounds.y - tolerance &&
    point.y <= bounds.y + bounds.height + tolerance
  )
}

/**
 * Transforms drawing elements coordinates (for scaling, translating, etc.)
 */
export const transformElement = (
  element: DrawingElement,
  transform: {
    scaleX?: number
    scaleY?: number
    translateX?: number
    translateY?: number
  }
): DrawingElement => {
  const { scaleX = 1, scaleY = 1, translateX = 0, translateY = 0 } = transform

  switch (element.type) {
    case "arrow":
      return {
        ...element,
        points: [
          element.points[0] * scaleX + translateX,
          element.points[1] * scaleY + translateY,
          element.points[2] * scaleX + translateX,
          element.points[3] * scaleY + translateY
        ] as [number, number, number, number]
      }

    case "pen":
      return {
        ...element,
        points: element.points.map((coord, index) =>
          index % 2 === 0
            ? coord * scaleX + translateX
            : coord * scaleY + translateY
        )
      }

    case "rectangle":
      return {
        ...element,
        x: element.x * scaleX + translateX,
        y: element.y * scaleY + translateY,
        width: element.width * scaleX,
        height: element.height * scaleY
      }

    case "circle":
      return {
        ...element,
        x: element.x * scaleX + translateX,
        y: element.y * scaleY + translateY,
        radius: element.radius * Math.min(scaleX, scaleY)
      }

    case "text":
      return {
        ...element,
        x: element.x * scaleX + translateX,
        y: element.y * scaleY + translateY,
        fontSize: element.fontSize * Math.min(scaleX, scaleY)
      }

    default:
      return element
  }
}
