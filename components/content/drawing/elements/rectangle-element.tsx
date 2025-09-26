import type { RectangleElement as RectangleElementType } from "@/types/drawing"
import { memo } from "react"
import { Rect } from "react-konva"

interface RectangleElementProps {
  element: RectangleElementType
}

export const RectangleElement = memo(
  ({ element }: RectangleElementProps): JSX.Element => (
    <Rect
      key={element.id}
      stroke={element.color}
      strokeWidth={element.strokeWidth}
      visible={element.visible}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      fill={element.fill}
    />
  )
)

RectangleElement.displayName = "RectangleElement"
