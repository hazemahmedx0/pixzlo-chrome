"use client"

import { useDrawingCanvas } from "@/hooks/use-drawing-canvas"
import { useDrawingHistory } from "@/hooks/use-drawing-history"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
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
import useImage from "use-image"

import {
  ArrowElement,
  CircleElement,
  PenElement,
  RectangleElement,
  TextElement
} from "./elements"

const DrawingCanvas = forwardRef<any, DrawingCanvasProps>(
  (
    {
      imageUrl,
      width,
      height,
      onElementsChange,
      initialElements = [],
      className = ""
    },
    ref
  ) => {
    const [image] = useImage(imageUrl)

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

    // Export drawing functionality
    const exportDrawing = useCallback(() => {
      if (!stageRef.current) return null

      try {
        const pixelRatio = window.devicePixelRatio || 1
        const exportPixelRatio = Math.max(pixelRatio, 2)

        return stageRef.current.toDataURL({
          mimeType: "image/png",
          quality: 1,
          backgroundColor: "transparent",
          pixelRatio: exportPixelRatio
        })
      } catch {
        return null
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

    const stageKey = useMemo(
      () => `${Math.round(width)}x${Math.round(height)}`,
      [width, height]
    )

    useEffect(() => {
      if (stageRef.current) {
        stageRef.current.size({ width, height })
        stageRef.current.batchDraw()
      }
    }, [width, height])

    return (
      <div className={`relative ${className}`} style={{ width, height }}>
        <Stage
          key={stageKey}
          ref={stageRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onMouseleave={handleMouseUp}
          onContextMenu={(e) => e.evt?.preventDefault?.()}
          onClick={handleStageClick}
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
            key={`elements-${renderElements.length}-${renderCounter}-${JSON.stringify(renderElements.map((el) => el.id)).slice(0, 50)}`}
            listening={true}
            perfectDrawEnabled={false}
            hitGraphEnabled={true}
            imageSmoothingEnabled={false}
            clearBeforeDraw={false}>
            {/* Render all finished elements */}
            {renderElements.map((element, index) =>
              renderElement(element, index)
            )}
          </Layer>

          {/* Temporary element layer for live drawing */}
          {tempElement && (
            <Layer
              listening={false}
              perfectDrawEnabled={false}
              hitGraphEnabled={false}
              imageSmoothingEnabled={false}
              clearBeforeDraw={true}>
              {renderElement(tempElement, -1)}
            </Layer>
          )}
        </Stage>
      </div>
    )
  }
)

DrawingCanvas.displayName = "DrawingCanvas"

export default DrawingCanvas
