import { useDrawingStore } from "@/stores/drawing-store"
import type { TextElement as TextElementType } from "@/types/drawing"
import { memo } from "react"
import { Text } from "react-konva"

interface TextElementProps {
  element: TextElementType
}

export const TextElement = memo(
  ({ element }: TextElementProps): JSX.Element => {
    const { textEditing } = useDrawingStore()

    const isCurrentlyEditing = textEditing.isEditing === element.id
    const isPlaceholder = element.text === "Type here"

    return (
      <Text
        id={element.id}
        key={element.id}
        stroke={element.color}
        strokeWidth={0}
        visible={element.visible}
        x={element.x}
        y={element.y}
        text={element.text}
        fontSize={element.fontSize}
        fontFamily={element.fontFamily}
        fill={isPlaceholder ? "#999999" : element.fill}
        draggable={false}
        opacity={isPlaceholder ? 0.7 : 1}
        fontStyle={isPlaceholder ? "italic" : "normal"}
      />
    )
  }
)

TextElement.displayName = "TextElement"
