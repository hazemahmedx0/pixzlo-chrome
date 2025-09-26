export type DrawingTool =
  | "select"
  | "arrow"
  | "text"
  | "pen"
  | "rectangle"
  | "circle"

export interface DrawingPoint {
  x: number
  y: number
}

export interface BaseDrawingElement {
  id: string
  type: DrawingTool
  color: string
  strokeWidth: number
  visible: boolean
}

export interface ArrowElement extends BaseDrawingElement {
  type: "arrow"
  points: [number, number, number, number] // [x1, y1, x2, y2]
}

export interface TextElement extends BaseDrawingElement {
  type: "text"
  x: number
  y: number
  text: string
  fontSize: number
  fontFamily: string
  fill: string
}

export interface PenElement extends BaseDrawingElement {
  type: "pen"
  points: number[] // [x1, y1, x2, y2, ...]
}

export interface RectangleElement extends BaseDrawingElement {
  type: "rectangle"
  x: number
  y: number
  width: number
  height: number
  fill?: string
}

export interface CircleElement extends BaseDrawingElement {
  type: "circle"
  x: number
  y: number
  radius: number
  fill?: string
}

export type DrawingElement =
  | ArrowElement
  | TextElement
  | PenElement
  | RectangleElement
  | CircleElement

export interface DrawingState {
  tool: DrawingTool
  color: string
  strokeWidth: number
  fontSize: number
  elements: DrawingElement[]
  selectedElementId: string | null
  isDrawing: boolean
}

export interface DrawingCanvasProps {
  imageUrl: string
  width: number
  height: number
  onElementsChange?: (elements: DrawingElement[]) => void
  initialElements?: DrawingElement[]
  className?: string
}
