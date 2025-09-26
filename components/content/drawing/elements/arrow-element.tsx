import type { ArrowElement as ArrowElementType } from "@/types/drawing"
import { memo } from "react"
import { Arrow } from "react-konva"

interface ArrowElementProps {
  element: ArrowElementType
}

export const ArrowElement = memo(
  ({ element }: ArrowElementProps): JSX.Element => (
    <Arrow
      key={element.id}
      stroke={element.color}
      strokeWidth={element.strokeWidth}
      visible={element.visible}
      points={element.points}
      pointerLength={10}
      pointerWidth={10}
    />
  )
)

ArrowElement.displayName = "ArrowElement"
