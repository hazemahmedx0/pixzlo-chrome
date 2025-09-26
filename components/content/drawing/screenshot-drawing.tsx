import type { DrawingElement, DrawingTool } from "@/types/drawing"
import { memo, useCallback, useRef, useState } from "react"

import DrawingCanvas from "./drawing-canvas"
import DrawingToolbar from "./drawing-toolbar"

interface ScreenshotDrawingProps {
  imageUrl: string
  width?: number
  height?: number
  onSave?: (elements: DrawingElement[], dataUrl: string) => void
  className?: string
}

const ScreenshotDrawing = memo(
  ({
    imageUrl,
    width = 800,
    height = 600,
    onSave,
    className = ""
  }: ScreenshotDrawingProps) => {
    const [activeTool, setActiveTool] = useState<DrawingTool>("select")
    const [color, setColor] = useState("#ef4444")
    const [strokeWidth, setStrokeWidth] = useState(2)
    const [fontSize, setFontSize] = useState(16)
    const [elements, setElements] = useState<DrawingElement[]>([])
    const [history, setHistory] = useState<DrawingElement[][]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)

    const canvasRef = useRef<any>(null)

    const handleToolChange = useCallback((tool: DrawingTool) => {
      setActiveTool(tool)
      // Update canvas tool
      if (canvasRef.current?.updateDrawingState) {
        canvasRef.current.updateDrawingState({ tool })
      }
    }, [])

    const handleColorChange = useCallback((newColor: string) => {
      setColor(newColor)
      if (canvasRef.current?.updateDrawingState) {
        canvasRef.current.updateDrawingState({ color: newColor })
      }
    }, [])

    const handleStrokeWidthChange = useCallback((width: number) => {
      setStrokeWidth(width)
      if (canvasRef.current?.updateDrawingState) {
        canvasRef.current.updateDrawingState({ strokeWidth: width })
      }
    }, [])

    const handleFontSizeChange = useCallback((size: number) => {
      setFontSize(size)
      if (canvasRef.current?.updateDrawingState) {
        canvasRef.current.updateDrawingState({ fontSize: size })
      }
    }, [])

    const handleElementsChange = useCallback(
      (newElements: DrawingElement[]) => {
        setElements(newElements)

        // Update history when elements change
        if (newElements.length !== elements.length) {
          const newHistory = history.slice(0, historyIndex + 1)
          newHistory.push([...newElements])
          setHistory(newHistory)
          setHistoryIndex(newHistory.length - 1)
        }
      },
      [elements, history, historyIndex]
    )

    const handleUndo = useCallback(() => {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        const previousElements = history[newIndex]
        setElements(previousElements)
        setHistoryIndex(newIndex)

        if (canvasRef.current?.updateDrawingState) {
          canvasRef.current.updateDrawingState({ elements: previousElements })
        }
      }
    }, [history, historyIndex])

    const handleRedo = useCallback(() => {
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1
        const nextElements = history[newIndex]
        setElements(nextElements)
        setHistoryIndex(newIndex)

        if (canvasRef.current?.updateDrawingState) {
          canvasRef.current.updateDrawingState({ elements: nextElements })
        }
      }
    }, [history, historyIndex])

    const handleClear = useCallback(() => {
      const emptyElements: DrawingElement[] = []
      setElements(emptyElements)

      // Add to history
      const newHistory = [...history, emptyElements]
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)

      if (canvasRef.current?.updateDrawingState) {
        canvasRef.current.updateDrawingState({ elements: emptyElements })
      }
    }, [history])

    const handleSave = useCallback(() => {
      if (onSave && canvasRef.current) {
        try {
          // Get the stage from canvas ref
          const stage = canvasRef.current.getStage()
          if (stage) {
            const dataUrl = stage.toDataURL({
              mimeType: "image/png",
              quality: 1
            })
            onSave(elements, dataUrl)
          }
        } catch (error) {
          console.error("Error saving drawing:", error)
          // Fallback: just call onSave with empty dataUrl
          onSave(elements, "")
        }
      }
    }, [elements, onSave])

    return (
      <div className={`flex flex-col gap-4 ${className}`}>
        {/* Drawing Toolbar */}
        <div className="relative z-10">
          <DrawingToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
            color={color}
            onColorChange={handleColorChange}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={handleStrokeWidthChange}
            fontSize={fontSize}
            onFontSizeChange={handleFontSizeChange}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
          />
        </div>

        {/* Drawing Canvas */}
        <div className="overflow-hidden rounded-lg border border-gray-300 bg-gray-150">
          <DrawingCanvas
            ref={canvasRef}
            imageUrl={imageUrl}
            width={width}
            height={height}
            onElementsChange={handleElementsChange}
            initialElements={elements}
          />
        </div>

        {/* Save Button */}
        {onSave && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
              Save Drawing
            </button>
          </div>
        )}
      </div>
    )
  }
)

ScreenshotDrawing.displayName = "ScreenshotDrawing"

export default ScreenshotDrawing
