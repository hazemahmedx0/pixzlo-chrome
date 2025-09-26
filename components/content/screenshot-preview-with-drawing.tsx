import { useDrawingStore } from "@/stores/drawing-store"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import type { DrawingElement, DrawingTool } from "@/types/drawing"
import type { FigmaDesignLink } from "@/types/figma"
import { Edit3, Plus, Save, X } from "lucide-react"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import type { RefObject, SyntheticEvent } from "react"

import DrawingToolbar from "./drawing/drawing-toolbar"
import { DRAWING_CONSTANTS } from "./drawing/drawing-utils"
import FigmaDesignManager from "./pixzlo-dialog/figma-design-manager"
import ImagePreviewContainer from "./pixzlo-dialog/image-preview-container"

interface FigmaDesignData {
  imageUrl: string
  designName: string
  figmaUrl: string
}

interface ScreenshotPreviewWithDrawingProps {
  currentImage: string
  hasHighlightedVersion?: boolean
  onAddFigmaDesign?: () => void
  showHighlighted?: boolean
  highlightedImage?: string
  onDrawingSave?: (
    imageUrl: string,
    elements: DrawingElement[],
    originalImage: string
  ) => void
  onFigmaDesignSelected?: (designData: {
    imageUrl: string
    designName: string
    figmaUrl: string
  }) => void
  drawingCanvasRef?: RefObject<any>
  className?: string
  figmaDesign?: FigmaDesignData | null
  figmaDesigns?: FigmaDesignLink[]
  isLoadingFigmaDesigns?: boolean
}

const ScreenshotPreviewWithDrawing = memo(
  ({
    currentImage,
    hasHighlightedVersion = false,
    onAddFigmaDesign,
    showHighlighted = false,
    highlightedImage,
    onDrawingSave,
    onFigmaDesignSelected,
    drawingCanvasRef,
    className = "",
    figmaDesign,
    figmaDesigns = [],
    isLoadingFigmaDesigns = false
  }: ScreenshotPreviewWithDrawingProps) => {
    const setIsFigmaPopupOpen = usePixzloDialogStore(
      (state) => state.setIsFigmaPopupOpen
    )

    console.log("🖼️ ScreenshotPreviewWithDrawing props:", {
      hasHighlightedVersion,
      showHighlighted,
      figmaDesign: figmaDesign
        ? {
            designName: figmaDesign.designName,
            hasImageUrl: !!figmaDesign.imageUrl,
            figmaUrl: figmaDesign.figmaUrl
          }
        : null
    })

    const [isDrawingMode, setIsDrawingMode] = useState(false)
    const [drawingImageUrl, setDrawingImageUrl] = useState<string | null>(null)
    const [activeTool, setActiveTool] = useState<DrawingTool>("pen") // Start with pen tool active
    const [color, setColor] = useState<string>(DRAWING_CONSTANTS.DEFAULT_COLOR)
    const [strokeWidth, setStrokeWidth] = useState<number>(
      DRAWING_CONSTANTS.DEFAULT_STROKE_WIDTH
    )
    const [fontSize, setFontSize] = useState<number>(
      DRAWING_CONSTANTS.DEFAULT_FONT_SIZE
    )

    // Get Zustand store actions
    const setZustandTool = useDrawingStore((state) => state.setTool)
    const setZustandColor = useDrawingStore((state) => state.setColor)
    const setZustandStrokeWidth = useDrawingStore(
      (state) => state.setStrokeWidth
    )
    const setZustandFontSize = useDrawingStore((state) => state.setFontSize)

    // Handle color change with immediate canvas update
    const handleColorChange = useCallback(
      (newColor: string) => {
        console.log("Color changed to:", newColor)
        setColor(newColor)

        // ✅ Update Zustand store so canvas can read it
        setZustandColor(newColor)

        const canvas = drawingCanvasRef?.current || canvasRef.current
        if (canvas?.updateDrawingState) {
          canvas.updateDrawingState({ color: newColor })
        }
      },
      [drawingCanvasRef, setZustandColor]
    )

    // Handle stroke width change with immediate canvas update
    const handleStrokeWidthChange = useCallback(
      (width: number) => {
        console.log("Stroke width changed to:", width)
        setStrokeWidth(width)

        // ✅ Update Zustand store so canvas can read it
        setZustandStrokeWidth(width)

        const canvas = drawingCanvasRef?.current || canvasRef.current
        if (canvas?.updateDrawingState) {
          canvas.updateDrawingState({ strokeWidth: width })
        }
      },
      [drawingCanvasRef, setZustandStrokeWidth]
    )

    // Handle font size change with immediate canvas update
    const handleFontSizeChange = useCallback(
      (size: number) => {
        console.log("Font size changed to:", size)
        setFontSize(size)

        // ✅ Update Zustand store so canvas can read it
        setZustandFontSize(size)

        const canvas = drawingCanvasRef?.current || canvasRef.current
        if (canvas?.updateDrawingState) {
          canvas.updateDrawingState({ fontSize: size })
        }
      },
      [drawingCanvasRef, setZustandFontSize]
    )
    const [elements, setElements] = useState<DrawingElement[]>([])
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

    const isComparisonView = hasHighlightedVersion

    // History is now managed by the canvas itself
    // const [history, setHistory] = useState<DrawingElement[][]>([[]])
    // const [historyIndex, setHistoryIndex] = useState(0)
    const canvasRef = useRef<any>(null)
    const isUndoRedoOperation = useRef(false)
    const lastSavedElementsRef = useRef<string>("")

    const handleToolChange = useCallback(
      (tool: DrawingTool) => {
        console.log("Tool changed to:", tool)
        setActiveTool(tool)

        // ✅ Update Zustand store so canvas can read it
        setZustandTool(tool)

        // Clear any ongoing drawing operations when switching tools
        const canvas = drawingCanvasRef?.current || canvasRef.current
        if (canvas?.updateDrawingState) {
          // Force reset drawing state and then update tool
          canvas.updateDrawingState({
            tool,
            isDrawing: false,
            selectedElementId: null
          })
        }
      },
      [drawingCanvasRef, setZustandTool]
    )

    // Initialize canvas state when canvas becomes available
    useEffect(() => {
      // ✅ Sync Zustand store with initial local state
      setZustandTool(activeTool)
      setZustandColor(color)
      setZustandStrokeWidth(strokeWidth)
      setZustandFontSize(fontSize)

      const canvas = drawingCanvasRef?.current || canvasRef.current
      if (canvas?.updateDrawingState) {
        console.log("Initializing canvas state")
        canvas.updateDrawingState({
          tool: activeTool,
          color,
          strokeWidth,
          fontSize
          // Removed elements - canvas manages its own elements through React state
        })
      }
    }, [
      drawingCanvasRef?.current,
      canvasRef.current,
      activeTool,
      color,
      strokeWidth,
      fontSize,
      setZustandTool,
      setZustandColor,
      setZustandStrokeWidth,
      setZustandFontSize
    ])

    // Canvas manages its own elements through React state - no external syncing needed
    // useEffect(() => {
    //   if (!isUndoRedoOperation.current) {
    //     const canvas = drawingCanvasRef?.current || canvasRef.current
    //     if (canvas?.updateDrawingState) {
    //       canvas.updateDrawingState({ elements })
    //     }
    //   }
    // }, [elements, drawingCanvasRef])

    // Refs to prevent flashing during rapid updates
    const elementsLengthRef = useRef(elements.length)
    const lastProcessedElementsRef = useRef<string>("")
    const saveTimeoutRef = useRef<NodeJS.Timeout>()

    const handleElementsChange = useCallback(
      (newElements: DrawingElement[]) => {
        const newElementsStr = JSON.stringify(newElements)

        // Fast path for no change - check both length and content
        if (
          newElements.length === elementsLengthRef.current &&
          newElementsStr === lastProcessedElementsRef.current
        ) {
          console.log("Elements change ignored - no actual change detected")
          return
        }

        console.log("Elements changed:", {
          oldLength: elements.length,
          newLength: newElements.length,
          isUndoRedo: isUndoRedoOperation.current,
          timestamp: Date.now()
        })

        // Update elements state immediately but batch other operations
        setElements(newElements)
        elementsLengthRef.current = newElements.length
        lastProcessedElementsRef.current = newElementsStr

        // Canvas handles its own history - no need for parent history management

        // Debounce save operations to prevent rapid calls
        if (onDrawingSave) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
          }
          saveTimeoutRef.current = setTimeout(() => {
            if (lastSavedElementsRef.current !== newElementsStr) {
              console.log("Saving elements:", newElements.length, "items")
              lastSavedElementsRef.current = newElementsStr
              onDrawingSave(currentImage, newElements, currentImage)
            }
          }, 500) // Much longer debounce - 500ms to prevent rapid saves
        }
      },
      [onDrawingSave, elements, currentImage]
    )

    // Cleanup timeouts on unmount
    useEffect(() => {
      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
      }
    }, [])

    const handleUndo = useCallback(() => {
      console.log("Undo requested - delegating to canvas")
      const canvas = drawingCanvasRef?.current || canvasRef.current
      if (canvas?.undo) {
        const success = canvas.undo()
        console.log("Canvas undo result:", success)
        return success
      }
      return false
    }, [drawingCanvasRef, canvasRef])

    const handleRedo = useCallback(() => {
      console.log("Redo requested - delegating to canvas")
      const canvas = drawingCanvasRef?.current || canvasRef.current
      if (canvas?.redo) {
        const success = canvas.redo()
        console.log("Canvas redo result:", success)
        return success
      }
      return false
    }, [drawingCanvasRef, canvasRef])

    const handleClear = useCallback(() => {
      console.log("Clear requested - delegating to canvas")
      const canvas = drawingCanvasRef?.current || canvasRef.current
      if (canvas?.resetHistory) {
        canvas.resetHistory()
        console.log("Canvas cleared")
      }
    }, [drawingCanvasRef, canvasRef])

    const handleImageLoad = useCallback(
      (event: SyntheticEvent<HTMLImageElement>) => {
        const img = event.currentTarget
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          setImageSize({
            width: img.naturalWidth,
            height: img.naturalHeight
          })
        }
      },
      []
    )

    const displayImage = drawingImageUrl || currentImage

    const implementationContainerClass = isComparisonView
      ? "relative w-full overflow-hidden rounded-sm border border-solid border-gray-300"
      : "relative h-full w-full overflow-hidden rounded-sm border border-solid border-gray-300"

    const comparisonPanelWidth = isComparisonView
      ? imageSize.width > 0
        ? imageSize.width
        : 640
      : undefined

    const implementationWrapperClass = isComparisonView ? "" : "max-w-full"

    const implementationPane = (
      <div className="group relative flex flex-col gap-1">
        <div
          className={`${isComparisonView ? "aspect-[16/9] w-full overflow-hidden rounded-sm border border-solid border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800" : implementationContainerClass}`}>
          <ImagePreviewContainer
            imageUrl={currentImage}
            imageSize={imageSize}
            canvasRef={drawingCanvasRef || canvasRef}
            elements={elements}
            onElementsChange={handleElementsChange}
            onImageLoad={handleImageLoad}
            altText="Original Screenshot"
            isScreenshot={!isComparisonView}
          />
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Implementation
        </div>
      </div>
    )

    const comparisonContainerClass =
      "relative w-full overflow-hidden rounded-sm border border-solid border-gray-300"

    const comparisonPane = !hasHighlightedVersion ? null : (
      <div className="group relative flex flex-col gap-1">
        <div className="flex aspect-[16/9] w-full select-none items-center justify-center overflow-hidden rounded-sm border border-solid border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          {showHighlighted && highlightedImage ? (
            <ImagePreviewContainer
              imageUrl={highlightedImage}
              imageSize={{ width: 0, height: 0 }}
              canvasRef={{ current: null }}
              elements={[]}
              onElementsChange={() => {}}
              onImageLoad={() => {}}
              altText="Highlighted Screenshot"
              isHighlighted={true}
              isScreenshot={false}
            />
          ) : figmaDesign ? (
            <div
              className="group relative flex h-full w-full cursor-pointer items-center justify-center"
              onClick={() => setIsFigmaPopupOpen(true)}>
              <img
                src={figmaDesign.imageUrl}
                alt={figmaDesign.designName}
                className="max-h-full max-w-full object-contain"
                onLoad={() =>
                  console.log("🎨 Figma design image loaded successfully")
                }
                onError={(e) =>
                  console.error("🚨 Figma design image failed to load:", e)
                }
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Edit3 className="h-8 w-8" />
                  <span className="text-sm font-medium">Change Design</span>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 right-2 rounded-md bg-black/70 px-3 py-2 text-white">
                <p className="truncate text-sm font-medium">
                  {figmaDesign.designName}
                </p>
                <p className="truncate text-xs text-gray-300">
                  {figmaDesign.figmaUrl}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="group flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 bg-gray-200 text-gray-600 transition-colors hover:bg-gray-300 group-hover:text-gray-800 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:group-hover:text-gray-200"
              onClick={() => setIsFigmaPopupOpen(true)}>
              <Plus size={16} />
              <div className="text-center font-medium">
                Add design reference
              </div>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {figmaDesign ? "Design Reference" : ""}
        </div>
      </div>
    )

    return (
      <div className={`flex h-full flex-col ${className}`}>
        {/* Drawing Toolbar - Fixed position at top */}
        <div className="relative z-10 flex flex-shrink-0 justify-center px-4 py-2">
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
            canUndo={() => {
              const canvas = drawingCanvasRef?.current || canvasRef.current
              return canvas?.canUndo ? canvas.canUndo() : false
            }}
            canRedo={() => {
              const canvas = drawingCanvasRef?.current || canvasRef.current
              return canvas?.canRedo ? canvas.canRedo() : false
            }}
          />
        </div>

        {/* Image Display Area */}
        {isComparisonView ? (
          <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-hidden">
            <div className="grid grid-cols-2 gap-3">
              {implementationPane}
              {comparisonPane}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-hidden px-6 py-4">
            <div className="flex h-full w-full max-w-[1200px] items-center justify-center">
              {implementationPane}
            </div>
          </div>
        )}
      </div>
    )
  }
)

ScreenshotPreviewWithDrawing.displayName = "ScreenshotPreviewWithDrawing"

export default ScreenshotPreviewWithDrawing
