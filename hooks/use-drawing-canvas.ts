import {
  DRAWING_CONSTANTS,
  generateElementId,
  isEmptyElement
} from "@/components/content/drawing/drawing-utils"
import { useDrawingStore } from "@/stores/drawing-store"
import type { DrawingElement, TextElement } from "@/types/drawing"
import { useCallback, useEffect, useRef } from "react"

import { useTextEditing } from "./use-text-editing"

const SIMPLIFY_PEN_MIN_DISTANCE_SQ = 16

const simplifyPenPoints = (
  points: number[],
  minDistanceSq = SIMPLIFY_PEN_MIN_DISTANCE_SQ
): number[] => {
  if (points.length <= 4) {
    return points
  }

  const simplified: number[] = [points[0], points[1]]
  let lastX = points[0]
  let lastY = points[1]

  for (let i = 2; i < points.length - 2; i += 2) {
    const x = points[i]
    const y = points[i + 1]
    const dx = x - lastX
    const dy = y - lastY

    if (dx * dx + dy * dy < minDistanceSq) {
      continue
    }

    simplified.push(x, y)
    lastX = x
    lastY = y
  }

  const endX = points[points.length - 2]
  const endY = points[points.length - 1]
  const lastSimplifiedX = simplified[simplified.length - 2]
  const lastSimplifiedY = simplified[simplified.length - 1]

  if (lastSimplifiedX !== endX || lastSimplifiedY !== endY) {
    simplified.push(endX, endY)
  }

  return simplified.length >= 4 ? simplified : points
}

interface UseDrawingCanvasProps {
  addElement?: (element: DrawingElement) => void
  currentTool?: string
  currentColor?: string
  currentStrokeWidth?: number
  currentFontSize?: number
}

export const useDrawingCanvas = (props?: UseDrawingCanvasProps) => {
  // Get values from props or fallback to Zustand store
  const fallbackTool = useDrawingStore((state) => state.drawingState.tool)
  const fallbackColor = useDrawingStore((state) => state.drawingState.color)
  const fallbackStrokeWidth = useDrawingStore(
    (state) => state.drawingState.strokeWidth
  )
  const fallbackFontSize = useDrawingStore(
    (state) => state.drawingState.fontSize
  )
  const zustandAddElement = useDrawingStore((state) => state.addElement)

  const addElement = props?.addElement || zustandAddElement
  const currentTool = props?.currentTool || fallbackTool
  const currentColor = props?.currentColor || fallbackColor
  const currentStrokeWidth = props?.currentStrokeWidth || fallbackStrokeWidth
  const currentFontSize = props?.currentFontSize || fallbackFontSize
  // Use Zustand store for temporary drawing state and operations
  const tempElement = useDrawingStore((state) => state.tempElement)
  const isDrawing = useDrawingStore((state) => state.isDrawing)
  const updateTempElement = useDrawingStore((state) => state.updateTempElement)

  const { handleTextElementClick, startRealTimeEdit } = useTextEditing()

  // Refs for tracking drawing session
  const stageRef = useRef<any>(null)
  const isActivelyDrawing = useRef(false)
  const drawingSessionId = useRef<string | null>(null)
  const activeElementId = useRef<string | null>(null)

  // rAF batching refs for pen tool – accumulate points between frames
  const pendingPenPointsRef = useRef<number[]>([])
  const rafIdRef = useRef<number>(0)
  // First pen move renders synchronously for instant visual feedback
  const isFirstPenMoveRef = useRef(true)

  // rAF batching for non-pen shape previews (arrow/rectangle/circle)
  const pendingShapePointRef = useRef<{ x: number; y: number } | null>(null)
  const shapeRafIdRef = useRef<number>(0)
  const isFirstShapeMoveRef = useRef(true)
  const textEditTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      // Use getRelativePointerPosition so coordinates are in the base
      // (natural-image) coordinate system when the stage has scaleX/Y.
      const pos = stage?.getRelativePointerPosition()
      if (!pos || !stage) return

      // Start new drawing session
      const sessionId = `session_${Date.now()}_${Math.random()}`
      drawingSessionId.current = sessionId
      isActivelyDrawing.current = true
      isFirstPenMoveRef.current = true
      isFirstShapeMoveRef.current = true
      pendingPenPointsRef.current = []
      pendingShapePointRef.current = null

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = 0
      }

      if (shapeRafIdRef.current) {
        cancelAnimationFrame(shapeRafIdRef.current)
        shapeRafIdRef.current = 0
      }

      const newElement = createNewElement(currentTool, pos)
      if (newElement) {
        activeElementId.current = newElement.id
        // Single set() = single React re-render instead of two
        useDrawingStore.setState({ isDrawing: true, tempElement: newElement })
      }
    },
    [currentTool, createNewElement]
  )

  // Flush accumulated pen points in a single Zustand update per animation frame
  const flushPenPoints = useCallback(() => {
    rafIdRef.current = 0
    const pending = pendingPenPointsRef.current
    if (pending.length === 0) return

    const current = useDrawingStore.getState().tempElement
    if (!current || current.type !== "pen") {
      pendingPenPointsRef.current = []
      return
    }

    updateTempElement({ points: [...current.points, ...pending] })
    pendingPenPointsRef.current = []
  }, [updateTempElement])

  // Flush latest shape pointer position once per animation frame
  const flushShapePreview = useCallback(() => {
    shapeRafIdRef.current = 0

    const point = pendingShapePointRef.current
    if (!point) return

    const current = useDrawingStore.getState().tempElement
    if (!current || current.type === "pen") {
      pendingShapePointRef.current = null
      return
    }

    const updates = updateElementDuringDraw(current, point)
    updateTempElement(updates)
    pendingShapePointRef.current = null
  }, [updateElementDuringDraw, updateTempElement])

  const handleMouseMove = useCallback(
    (e: any) => {
      if (!isActivelyDrawing.current || !drawingSessionId.current) return

      // Read tempElement from store directly so this callback stays stable
      const current = useDrawingStore.getState().tempElement
      if (!current) return

      const stage = e.target.getStage()
      const point = stage.getRelativePointerPosition()
      if (!point) return

      // --- Pen tool: batch points via rAF ---
      if (current.type === "pen") {
        // First move after mouseDown: render synchronously for instant feedback
        if (isFirstPenMoveRef.current) {
          isFirstPenMoveRef.current = false
          updateTempElement({ points: [...current.points, point.x, point.y] })
          return
        }

        // Distance threshold against the last known point (pending buffer OR store)
        const pending = pendingPenPointsRef.current
        const lastX =
          pending.length >= 2
            ? pending[pending.length - 2]
            : current.points[current.points.length - 2]
        const lastY =
          pending.length >= 2
            ? pending[pending.length - 1]
            : current.points[current.points.length - 1]

        if (lastX !== undefined && lastY !== undefined) {
          const dx = point.x - lastX
          const dy = point.y - lastY
          if (dx * dx + dy * dy < 12.25) return // distance < 3.5
        }

        // O(1) push into the buffer – no array copy, no Zustand set
        pending.push(point.x, point.y)

        // Schedule a single flush per frame
        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(flushPenPoints)
        }
        return
      }

      // --- Other tools: preview at most once per frame ---
      if (isFirstShapeMoveRef.current) {
        isFirstShapeMoveRef.current = false
        const firstUpdates = updateElementDuringDraw(current, point)
        updateTempElement(firstUpdates)
        return
      }

      pendingShapePointRef.current = point

      if (!shapeRafIdRef.current) {
        shapeRafIdRef.current = requestAnimationFrame(flushShapePreview)
      }
    },
    [
      flushPenPoints,
      flushShapePreview,
      updateElementDuringDraw,
      updateTempElement
    ]
  )

  const handleMouseUp = useCallback(() => {
    if (!isActivelyDrawing.current || !drawingSessionId.current) return

    // Cancel any pending rAF
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = 0
    }

    if (shapeRafIdRef.current) {
      cancelAnimationFrame(shapeRafIdRef.current)
      shapeRafIdRef.current = 0
    }

    // Build the final element locally – no intermediate Zustand update needed
    let finalElement = useDrawingStore.getState().tempElement

    const pendingShapePoint = pendingShapePointRef.current
    if (finalElement && pendingShapePoint && finalElement.type !== "pen") {
      const finalShapeUpdates = updateElementDuringDraw(
        finalElement,
        pendingShapePoint
      )
      finalElement = {
        ...finalElement,
        ...finalShapeUpdates
      } as DrawingElement
    }
    pendingShapePointRef.current = null

    const pending = pendingPenPointsRef.current
    if (finalElement && pending.length > 0 && finalElement.type === "pen") {
      finalElement = {
        ...finalElement,
        points: [...finalElement.points, ...pending]
      }
    }

    if (finalElement?.type === "pen") {
      finalElement = {
        ...finalElement,
        points: simplifyPenPoints(finalElement.points)
      }
    }
    pendingPenPointsRef.current = []

    // Finalize the element if it's valid
    if (finalElement && !isEmptyElement(finalElement)) {
      addElement(finalElement)
    }

    // Single Zustand update to clear temp + drawing flag (1 re-render instead of 2)
    useDrawingStore.setState({ tempElement: null, isDrawing: false })

    // Clean up drawing session refs
    isActivelyDrawing.current = false
    drawingSessionId.current = null
    activeElementId.current = null
    isFirstPenMoveRef.current = true
    isFirstShapeMoveRef.current = true
  }, [addElement, updateElementDuringDraw])

  const handleStageClick = useCallback(
    (e: any) => {
      // Check if clicked on an existing text element
      const target = e.target
      if (target.attrs && target.attrs.id) {
        const element = useDrawingStore
          .getState()
          .drawingState.elements.find((el) => el.id === target.attrs.id)
        if (element && element.type === "text") {
          handleTextElementClick(element as TextElement, stageRef.current)
          return
        }
      }

      // Handle text tool - create new text
      if (currentTool === "text" && target === target.getStage()) {
        const stage = e.target.getStage()
        const pos = stage.getRelativePointerPosition()
        if (!pos) return

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
        if (textEditTimeoutRef.current) {
          clearTimeout(textEditTimeoutRef.current)
        }

        textEditTimeoutRef.current = setTimeout(() => {
          textEditTimeoutRef.current = null
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

  // Cancel pending rAF on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      if (shapeRafIdRef.current) cancelAnimationFrame(shapeRafIdRef.current)
      if (textEditTimeoutRef.current) clearTimeout(textEditTimeoutRef.current)
    }
  }, [])

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
