import { useDrawingStore } from "@/stores/drawing-store"
import type { TextElement } from "@/types/drawing"
import { useCallback, useRef } from "react"

export const useTextEditing = () => {
  const {
    textEditing,
    startTextEdit,
    updateTextLive,
    finishTextEdit,
    cancelTextEdit
  } = useDrawingStore()

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const createTextArea = useCallback(
    (element: TextElement, stage: any, pos?: { x: number; y: number }) => {
      const textarea = document.createElement("textarea")

      // Set initial value and placeholder
      textarea.value = element.text === "Type here" ? "" : element.text
      textarea.placeholder = "Type here"

      // Position and size
      const position = pos || { x: element.x, y: element.y }
      textarea.style.position = "absolute"
      textarea.style.top = position.y + stage.container().offsetTop + "px"
      textarea.style.left = position.x + stage.container().offsetLeft + "px"
      textarea.style.minWidth = "150px"
      textarea.style.minHeight = "40px"
      textarea.style.width = "200px"
      textarea.style.height = "60px"

      // Styling
      textarea.style.fontSize = element.fontSize + "px"
      textarea.style.fontFamily = element.fontFamily
      textarea.style.color = element.fill
      textarea.style.border = "1px solid #E5E7EB"
      textarea.style.borderRadius = "6px"
      textarea.style.padding = "8px 12px"
      textarea.style.backgroundColor = "rgba(255, 255, 255, 0.98)"
      textarea.style.boxShadow = "0 4px 12px rgba(0,123,255,0.15)"
      textarea.style.outline = "none"
      textarea.style.resize = "both"
      textarea.style.zIndex = "1000"
      textarea.style.overflow = "auto"
      textarea.style.lineHeight = "1.4"

      return textarea
    },
    []
  )

  const handleTextAreaInput = useCallback(
    (elementId: string, textarea: HTMLTextAreaElement) => {
      const newText = textarea.value
      updateTextLive(elementId, newText || "Type here")

      // Auto-resize textarea
      textarea.style.height = "auto"
      textarea.style.height = textarea.scrollHeight + "px"
      textarea.style.width = "auto"
      textarea.style.width = textarea.scrollWidth + "px"
    },
    [updateTextLive]
  )

  const removeTextArea = useCallback((textarea: HTMLTextAreaElement) => {
    if (textarea.parentNode) {
      textarea.parentNode.removeChild(textarea)
    }
    textareaRef.current = null
  }, [])

  const startRealTimeEdit = useCallback(
    (element: TextElement, stage: any, pos?: { x: number; y: number }) => {
      if (!stage) return

      // Create and setup textarea
      const textarea = createTextArea(element, stage, pos)
      document.body.appendChild(textarea)
      textarea.focus()
      textareaRef.current = textarea

      // Select existing text if not placeholder
      if (element.text && element.text !== "Type here") {
        textarea.select()
      }

      // Input handler for live updates
      const handleInput = () => handleTextAreaInput(element.id, textarea)
      textarea.addEventListener("input", handleInput)

      // Blur handler - finish editing
      const handleBlur = () => {
        const finalText = textarea.value.trim()
        finishTextEdit(element.id, finalText)
        removeTextArea(textarea)
      }
      textarea.addEventListener("blur", handleBlur)

      // Key handlers
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault()
          const finalText = textarea.value.trim()
          finishTextEdit(element.id, finalText)
          removeTextArea(textarea)
        } else if (e.key === "Escape") {
          cancelTextEdit(element.id)
          removeTextArea(textarea)
        }
      }
      textarea.addEventListener("keydown", handleKeyDown)

      // Cleanup function
      return () => {
        textarea.removeEventListener("input", handleInput)
        textarea.removeEventListener("blur", handleBlur)
        textarea.removeEventListener("keydown", handleKeyDown)
        removeTextArea(textarea)
      }
    },
    [
      createTextArea,
      handleTextAreaInput,
      finishTextEdit,
      cancelTextEdit,
      removeTextArea
    ]
  )

  const handleTextElementClick = useCallback(
    (element: TextElement, stage: any) => {
      if (textEditing.isEditing === element.id) return

      startTextEdit(element.id, element.text)
      startRealTimeEdit(element, stage)
    },
    [textEditing.isEditing, startTextEdit, startRealTimeEdit]
  )

  return {
    textEditing,
    startRealTimeEdit,
    handleTextElementClick,
    isEditing: textEditing.isEditing,
    hasActiveEdit: textEditing.hasActiveEdit
  }
}
