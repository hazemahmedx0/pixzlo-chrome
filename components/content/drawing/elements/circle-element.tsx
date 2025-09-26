import type { CircleElement as CircleElementType } from "@/types/drawing"
import { memo } from "react"
import { Circle } from "react-konva"

interface CircleElementProps {
  element: CircleElementType
}

export const CircleElement = memo(
  ({ element }: CircleElementProps): JSX.Element => (
    <Circle
      key={element.id}
      stroke={element.color}
      strokeWidth={element.strokeWidth}
      visible={element.visible}
      x={element.x}
      y={element.y}
      radius={element.radius}
      fill={element.fill}
    />
  )
)

CircleElement.displayName = "CircleElement"
