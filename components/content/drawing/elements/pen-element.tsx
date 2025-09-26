import type { PenElement as PenElementType } from "@/types/drawing"
import { memo } from "react"
import { Line } from "react-konva"

interface PenElementProps {
  element: PenElementType
}

export const PenElement = memo(
  ({ element }: PenElementProps): JSX.Element => (
    <Line
      key={element.id}
      stroke={element.color}
      strokeWidth={element.strokeWidth}
      visible={element.visible}
      points={element.points}
      tension={0.5}
      lineCap="round"
      lineJoin="round"
    />
  )
)

PenElement.displayName = "PenElement"
