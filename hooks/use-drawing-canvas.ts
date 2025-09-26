import {
  DRAWING_CONSTANTS,
  generateElementId,
  isEmptyElement
} from "@/components/content/drawing/drawing-utils"
import { useDrawingStore } from "@/stores/drawing-store"
import type { DrawingElement, DrawingState, TextElement } from "@/types/drawing"
import { useCallback, useRef } from "react"

import { useTextEditing } from "./use-text-editing"

interface UseDrawingCanvasProps {
  addElement?: (element: DrawingElement) => void
  currentTool?: string
  currentColor?: string
  currentStrokeWidth?: number
  currentFontSize?: number
}

export const useDrawingCanvas = (props?: UseDrawingCanvasProps) => {
  // Get values from props or fallback to Zustand store
  const drawingState = useDrawingStore((state) => state.drawingState)
  const zustandAddElement = useDrawingStore((state) => state.addElement)

  const addElement = props?.addElement || zustandAddElement
  const currentTool = props?.currentTool || drawingState.tool
  const currentColor = props?.currentColor || drawingState.color
  const currentStrokeWidth =
    props?.currentStrokeWidth || drawingState.strokeWidth
  const currentFontSize = props?.currentFontSize || drawingState.fontSize
  // Use Zustand store for temporary drawing state and operations
  const tempElement = useDrawingStore((state) => state.tempElement)
  const isDrawing = useDrawingStore((state) => state.isDrawing)
  const setTempElement = useDrawingStore((state) => state.setTempElement)
  const updateTempElement = useDrawingStore((state) => state.updateTempElement)
  const startDrawing = useDrawingStore((state) => state.startDrawing)
  const stopDrawing = useDrawingStore((state) => state.stopDrawing)

  const { handleTextElementClick, startRealTimeEdit } = useTextEditing()

  // Refs for tracking drawing session
  const stageRef = useRef<any>(null)
  const isActivelyDrawing = useRef(false)
  const drawingSessionId = useRef<string | null>(null)
  const activeElementId = useRef<string | null>(null)

  const createNewElement = useCallback(
    (tool: string, pos: { x: number; y: number }): DrawingElement | null => {
      const baseProps = {
        id: generateElementId(),
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        visible: true
      }

      switch (tool) {
        case "arrow":
          return {
            ...baseProps,
            type: "arrow",
            points: [pos.x, pos.y, pos.x, pos.y]
          }

        case "pen":
          return {
            ...baseProps,
            type: "pen",
            points: [pos.x, pos.y]
          }

        case "rectangle":
          return {
            ...baseProps,
            type: "rectangle",
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0
          }

        case "circle":
          return {
            ...baseProps,
            type: "circle",
            x: pos.x,
            y: pos.y,
            radius: 0
          }

        default:
          return null
      }
    },
    [currentColor, currentStrokeWidth]
  )

  const updateElementDuringDraw = useCallback(
    (
      element: DrawingElement,
      point: { x: number; y: number }
    ): Partial<DrawingElement> => {
      switch (element.type) {
        case "arrow":
          return {
            points: [element.points[0], element.points[1], point.x, point.y]
          }

        case "pen":
          return {
            points: [...element.points, point.x, point.y]
          }

        case "rectangle":
          return {
            width: point.x - element.x,
            height: point.y - element.y
          }

        case "circle":
          const radius = Math.sqrt(
            Math.pow(point.x - element.x, 2) + Math.pow(point.y - element.y, 2)
          )
          return { radius }

        default:
          return {}
      }
    },
    []
  )

  const handleMouseDown = useCallback(
    (e: any) => {
      if (isActivelyDrawing.current || drawingSessionId.current) return

      if (currentTool === "select") return

      const stage = e.target.getStage()
      const pos = stage?.getPointerPosition()
      if (!pos || !stage) return

      // Start new drawing session
      const sessionId = `session_${Date.now()}_${Math.random()}`
      drawingSessionId.current = sessionId
      isActivelyDrawing.current = true
      startDrawing()

      const newElement = createNewElement(currentTool, pos)
      if (newElement) {
        activeElementId.current = newElement.id
        setTempElement(newElement)
      }
    },
    [currentTool, createNewElement, setTempElement, startDrawing]
  )

  const handleMouseMove = useCallback(
    (e: any) => {
      if (
        !isActivelyDrawing.current ||
        !tempElement ||
        !drawingSessionId.current
      )
        return

      const stage = e.target.getStage()
      const point = stage.getPointerPosition()
      if (!point) return

      // Throttle for pen tool to avoid too many points
      if (tempElement.type === "pen") {
        const lastPoint = tempElement.points[tempElement.points.length - 2]
        const lastPointY = tempElement.points[tempElement.points.length - 1]
        if (lastPoint !== undefined && lastPointY !== undefined) {
          const distance = Math.sqrt(
            Math.pow(point.x - lastPoint, 2) + Math.pow(point.y - lastPointY, 2)
          )
          if (distance < 2) return
        }
      }

      const updates = updateElementDuringDraw(tempElement, point)
      updateTempElement(updates)
    },
    [tempElement, updateElementDuringDraw, updateTempElement]
  )

  const handleMouseUp = useCallback(() => {
    if (!isActivelyDrawing.current || !drawingSessionId.current) return

    // Finalize the element if it's valid
    if (tempElement && !isEmptyElement(tempElement)) {
      addElement(tempElement)
    }

    // Always clear temp element
    setTempElement(null)

    // Clean up drawing session
    isActivelyDrawing.current = false
    drawingSessionId.current = null
    activeElementId.current = null
    stopDrawing()
  }, [tempElement, addElement, setTempElement, stopDrawing])

  const handleStageClick = useCallback(
    (e: any) => {
      // Check if clicked on an existing text element
      const target = e.target
      if (target.attrs && target.attrs.id) {
        const element = drawingState.elements.find(
          (el) => el.id === target.attrs.id
        )
        if (element && element.type === "text") {
          handleTextElementClick(element as TextElement, stageRef.current)
          return
        }
      }

      // Handle text tool - create new text
      if (currentTool === "text" && target === target.getStage()) {
        const stage = e.target.getStage()
        const pos = stage.getPointerPosition()

        const textElement: TextElement = {
          id: generateElementId(),
          type: "text",
          x: pos.x,
          y: pos.y,
          text: "Type here",
          color: currentColor,
          strokeWidth: currentStrokeWidth,
          fontSize: currentFontSize,
          fontFamily: DRAWING_CONSTANTS.DEFAULT_FONT_FAMILY,
          fill: currentColor,
          visible: true
        }

        addElement(textElement)

        // Start editing immediately
        setTimeout(() => {
          startRealTimeEdit(textElement, stageRef.current, pos)
        }, 50)
      }
    },
    [
      currentTool,
      currentColor,
      currentStrokeWidth,
      currentFontSize,
      handleTextElementClick,
      addElement,
      startRealTimeEdit
    ]
  )

  return {
    // State
    tempElement,
    isDrawing,

    // Refs
    stageRef,

    // Event handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleStageClick
  }
}
