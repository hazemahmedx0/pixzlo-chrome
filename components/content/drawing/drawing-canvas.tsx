"use client"

import { useDrawingCanvas } from "@/hooks/use-drawing-canvas"
import { useDrawingHistory } from "@/hooks/use-drawing-history"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { IMAGE_OUTPUT_MIME, IMAGE_OUTPUT_QUALITY } from "@/lib/image-format"
import { useDrawingStore } from "@/stores/drawing-store"
import type { DrawingCanvasProps, DrawingElement } from "@/types/drawing"
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo
} from "react"
import { Layer, Stage } from "react-konva"

import {
  ArrowElement,
  CircleElement,
  PenElement,
  RectangleElement,
  TextElement
} from "./elements"

interface ExportDrawingOptions {
  pixelRatio?: number
  mimeType?: string
  quality?: number
}

const DrawingCanvas = forwardRef<any, DrawingCanvasProps>(
  (
    {
      imageUrl,
      width,
      height,
      scaleX: propScaleX,
      scaleY: propScaleY,
      onElementsChange,
      initialElements = [],
      className = ""
    },
    ref
  ) => {
    const stageScaleX = propScaleX ?? 1
    const stageScaleY = propScaleY ?? 1

    // Use React-based history following Konva best practices (optional)
    const historyHook = useDrawingHistory(initialElements)
    const {
      elements,
      undo,
      redo,
      canUndo,
      canRedo,
      resetHistory,
      addElement,
      updateElement,
      removeElement,
      setElements,
      getHistoryInfo,
      renderCounter
    } = historyHook

    // Fallback to Zustand store elements if React history not used
    const zustandElements = useDrawingStore(
      (state) => state.drawingState.elements
    )
    // Use React history if available (including empty arrays), otherwise Zustand
    const renderElements = elements !== undefined ? elements : zustandElements

    // Get drawing settings from Zustand store
    const drawingTool = useDrawingStore((state) => state.drawingState.tool)
    const drawingColor = useDrawingStore((state) => state.drawingState.color)
    const strokeWidth = useDrawingStore(
      (state) => state.drawingState.strokeWidth
    )
    const fontSize = useDrawingStore((state) => state.drawingState.fontSize)
    const isInteractiveLayer =
      drawingTool === "text" || drawingTool === "select"

    // Force Konva stage to redraw when elements change
    useEffect(() => {
      if (stageRef.current) {
        stageRef.current.batchDraw()
      }
    }, [
      renderElements,
      getHistoryInfo,
      renderCounter,
      drawingTool,
      drawingColor
    ])

    const {
      tempElement,
      stageRef,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleStageClick
    } = useDrawingCanvas(
      // Only pass props if we have the React-based history functions
      typeof addElement === "function"
        ? {
            addElement,
            currentTool: drawingTool,
            currentColor: drawingColor,
            currentStrokeWidth: strokeWidth,
            currentFontSize: fontSize
          }
        : undefined
    )

    // Enable keyboard shortcuts - use React-based history if available, otherwise fall back to Zustand
    useKeyboardShortcuts(
      typeof undo === "function"
        ? {
            enabled: true,
            undo,
            redo,
            canUndo,
            canRedo,
            resetDrawing: resetHistory
          }
        : {
            enabled: false,
            undo: () => false,
            redo: () => false,
            canUndo: () => false,
            canRedo: () => false,
            resetDrawing: () => {}
          }
    )

    // Report elements changes to parent
    useEffect(() => {
      if (onElementsChange) {
        onElementsChange(renderElements)
      }
    }, [renderElements, onElementsChange])

    // Render individual elements
    const renderElement = useCallback(
      (element: DrawingElement, index: number) => {
        // Ensure each element has a unique key that changes when content changes
        const elementKey = `${element.type}-${element.id}-${index}`

        switch (element.type) {
          case "arrow":
            return <ArrowElement key={elementKey} element={element} />
          case "pen":
            return <PenElement key={elementKey} element={element} />
          case "rectangle":
            return <RectangleElement key={elementKey} element={element} />
          case "circle":
            return <CircleElement key={elementKey} element={element} />
          case "text":
            return <TextElement key={elementKey} element={element} />
          default:
            // TypeScript exhaustiveness check - this should never happen
            const _exhaustiveCheck: never = element
            return null
        }
      },
      []
    )

    const renderedElements = useMemo(
      () =>
        renderElements.map((element, index) => renderElement(element, index)),
      [renderElements, renderElement]
    )

    const renderedTempElement = useMemo(
      () => (tempElement ? renderElement(tempElement, -1) : null),
      [tempElement, renderElement]
    )

    // Export drawing functionality – temporarily reset scale so the
    // exported overlay always matches the natural-image coordinate space.
    const exportDrawing = useCallback((options?: ExportDrawingOptions) => {
      if (!stageRef.current) return null

      const stage = stageRef.current
      const prevScale = stage.scale()
      const prevSize = stage.size()

      const scaleX = prevScale.x || 1
      const scaleY = prevScale.y || 1
      const baseW = Math.max(1, Math.round(prevSize.width / scaleX))
      const baseH = Math.max(1, Math.round(prevSize.height / scaleY))

      try {
        // Temporarily set scale to 1 and size to base dimensions
        stage.scale({ x: 1, y: 1 })
        stage.size({ width: baseW, height: baseH })
        stage.batchDraw()

        const requestedPixelRatio = options?.pixelRatio ?? 1
        const exportPixelRatio = Number.isFinite(requestedPixelRatio)
          ? Math.max(requestedPixelRatio, 1)
          : 1

        return stage.toDataURL({
          mimeType: options?.mimeType ?? IMAGE_OUTPUT_MIME,
          quality: options?.quality ?? IMAGE_OUTPUT_QUALITY,
          backgroundColor: "transparent",
          pixelRatio: exportPixelRatio
        })
      } catch {
        return null
      } finally {
        // Always restore the stage so failed exports never affect drawing.
        stage.scale(prevScale)
        stage.size(prevSize)
        stage.batchDraw()
      }
    }, [])

    // Update drawing state method for external control
    const updateDrawingState = useCallback(
      (updates: { elements?: DrawingElement[] }) => {
        if (updates.elements) {
          setElements(updates.elements)
        }
      },
      [setElements]
    )

    // Expose methods to parent component via ref
    useImperativeHandle(
      ref,
      () => ({
        updateDrawingState,
        getDrawingState: () => ({ elements: renderElements }),
        getStage: () => stageRef.current,
        exportDrawing,
        undo: undo || (() => false),
        redo: redo || (() => false),
        canUndo: canUndo || (() => false),
        canRedo: canRedo || (() => false),
        resetHistory: resetHistory || (() => {}),
        getHistoryInfo:
          getHistoryInfo ||
          (() => ({
            currentStep: 0,
            totalSteps: 1,
            canUndo: false,
            canRedo: false
          }))
      }),
      [
        updateDrawingState,
        renderElements,
        exportDrawing,
        undo,
        redo,
        canUndo,
        canRedo,
        resetHistory,
        getHistoryInfo
      ]
    )

    // If dimensions are not ready, don't render Stage to avoid 0x0 canvases
    if (!width || !height) {
      return (
        <div
          className={`relative ${className}`}
          style={{ width: 0, height: 0 }}
        />
      )
    }

    // Stable key so zoom/resize doesn't destroy the stage and lose drawings
    const stageKey = useMemo(() => `stage-${imageUrl}`, [imageUrl])

    return (
      <div className={`relative ${className}`} style={{ width, height }}>
        <Stage
          key={stageKey}
          ref={stageRef}
          width={width}
          height={height}
          scaleX={stageScaleX}
          scaleY={stageScaleY}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onMouseleave={handleMouseUp}
          onContextMenu={(e) => e.evt?.preventDefault?.()}
          onClick={isInteractiveLayer ? handleStageClick : undefined}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 10,
            background: "transparent"
          }}
          fill="transparent"
          listening={true}
          perfectDrawEnabled={false}
          hitGraphEnabled={true}
          imageSmoothingEnabled={false}
          preventDefault={false}
          stopPropagation={false}>
          {/* Main drawing layer */}
          <Layer
            key="main-layer"
            listening={isInteractiveLayer}
            perfectDrawEnabled={false}
            hitGraphEnabled={isInteractiveLayer}
            imageSmoothingEnabled={false}>
            {/* Render all finished elements */}
            {renderedElements}
          </Layer>

          {/* Temporary element layer for live drawing – always mounted to
              avoid expensive Konva Layer + Canvas allocation on each stroke */}
          <Layer
            listening={false}
            perfectDrawEnabled={false}
            hitGraphEnabled={false}
            imageSmoothingEnabled={false}
            clearBeforeDraw={true}>
            {renderedTempElement}
          </Layer>
        </Stage>
      </div>
    )
  }
)

DrawingCanvas.displayName = "DrawingCanvas"

export default DrawingCanvas
