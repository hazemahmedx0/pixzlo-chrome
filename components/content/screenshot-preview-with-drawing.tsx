import { useDrawingStore } from "@/stores/drawing-store"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import type { DrawingElement, DrawingTool } from "@/types/drawing"
import type { FigmaDesignLink } from "@/types/figma"
import { Edit3, Plus } from "lucide-react"
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

    const [activeTool, setActiveTool] = useState<DrawingTool>("pen") // Start with pen tool active
    const [color, setColor] = useState<string>(DRAWING_CONSTANTS.DEFAULT_COLOR)
    const [strokeWidth, setStrokeWidth] = useState<number>(
      DRAWING_CONSTANTS.DEFAULT_STROKE_WIDTH
    )
    const [fontSize, setFontSize] = useState<number>(
      DRAWING_CONSTANTS.DEFAULT_FONT_SIZE
    )

    // ───────── Zoom state (screenshot mode only) ─────────
    const ZOOM_STEP = 0.25
    const ZOOM_MIN = 0.25
    const ZOOM_MAX = 4.0

    const [zoomLevel, setZoomLevel] = useState(1.0)

    const handleZoomIn = useCallback(() => {
      setZoomLevel((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX))
    }, [])

    const handleZoomOut = useCallback(() => {
      setZoomLevel((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN))
    }, [])

    const handleZoomFit = useCallback(() => {
      setZoomLevel(1.0)
    }, [])

    // Ref for the standalone image area – used for wheel zoom
    const imageAreaRef = useRef<HTMLDivElement | null>(null)

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
        setColor(newColor)
        setZustandColor(newColor)
      },
      [setZustandColor]
    )

    // Handle stroke width change with immediate canvas update
    const handleStrokeWidthChange = useCallback(
      (width: number) => {
        setStrokeWidth(width)
        setZustandStrokeWidth(width)
      },
      [setZustandStrokeWidth]
    )

    // Handle font size change with immediate canvas update
    const handleFontSizeChange = useCallback(
      (size: number) => {
        setFontSize(size)
        setZustandFontSize(size)
      },
      [setZustandFontSize]
    )
    const [elements, setElements] = useState<DrawingElement[]>([])
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

    const isComparisonView = hasHighlightedVersion

    // History is now managed by the canvas itself
    const canvasRef = useRef<any>(null)

    const handleToolChange = useCallback(
      (tool: DrawingTool) => {
        setActiveTool(tool)
        setZustandTool(tool)
      },
      [setZustandTool]
    )

    // Initialize drawing store values once for this preview instance.
    useEffect(() => {
      setZustandTool(activeTool)
      setZustandColor(color)
      setZustandStrokeWidth(strokeWidth)
      setZustandFontSize(fontSize)
      // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time initialization
    }, [
      setZustandTool,
      setZustandColor,
      setZustandStrokeWidth,
      setZustandFontSize
    ])

    // Refs to prevent flashing during rapid updates
    const elementsLengthRef = useRef(elements.length)
    const latestElementsRef = useRef<DrawingElement[]>(elements)
    const saveRevisionRef = useRef(0)
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleElementsChange = useCallback(
      (newElements: DrawingElement[]) => {
        if (
          newElements.length === elementsLengthRef.current &&
          newElements === latestElementsRef.current
        ) {
          return
        }

        // Update visual state immediately.
        setElements(newElements)
        elementsLengthRef.current = newElements.length
        latestElementsRef.current = newElements

        if (!onDrawingSave) return

        // Debounce persistence work and keep only the latest snapshot.
        saveRevisionRef.current += 1
        const revision = saveRevisionRef.current

        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }

        const persistLatestElements = (): void => {
          if (revision !== saveRevisionRef.current) {
            return
          }

          if (useDrawingStore.getState().isDrawing) {
            saveTimeoutRef.current = setTimeout(persistLatestElements, 120)
            return
          }

          onDrawingSave(currentImage, latestElementsRef.current, currentImage)
        }

        saveTimeoutRef.current = setTimeout(persistLatestElements, 300)
      },
      [currentImage, onDrawingSave]
    )

    // Cleanup timeouts on unmount
    useEffect(() => {
      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
          saveTimeoutRef.current = null
        }
      }
    }, [])

    // Cancel in-flight autosave when switching screenshots.
    useEffect(() => {
      saveRevisionRef.current += 1
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }, [currentImage])

    // Ctrl/Cmd + mouse wheel zoom on the image area
    useEffect(() => {
      const el = imageAreaRef.current
      if (!el) return

      const onWheel = (e: WheelEvent): void => {
        if (!e.ctrlKey && !e.metaKey) return
        e.preventDefault()
        setZoomLevel((z) => {
          const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
          return Math.min(Math.max(z + delta, ZOOM_MIN), ZOOM_MAX)
        })
      }

      el.addEventListener("wheel", onWheel, { passive: false })
      return () => el.removeEventListener("wheel", onWheel)
    }, [])

    const handleUndo = useCallback(() => {
      const canvas = drawingCanvasRef?.current || canvasRef.current
      if (canvas?.undo) {
        return canvas.undo()
      }
      return false
    }, [drawingCanvasRef, canvasRef])

    const handleRedo = useCallback(() => {
      const canvas = drawingCanvasRef?.current || canvasRef.current
      if (canvas?.redo) {
        return canvas.redo()
      }
      return false
    }, [drawingCanvasRef, canvasRef])

    const handleClear = useCallback(() => {
      const canvas = drawingCanvasRef?.current || canvasRef.current
      if (canvas?.resetHistory) {
        canvas.resetHistory()
      }
    }, [drawingCanvasRef, canvasRef])

    const canUndoValue = (() => {
      const canvas = drawingCanvasRef?.current || canvasRef.current
      return canvas?.canUndo ? canvas.canUndo() : false
    })()

    const canRedoValue = (() => {
      const canvas = drawingCanvasRef?.current || canvasRef.current
      return canvas?.canRedo ? canvas.canRedo() : false
    })()

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
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Edit3 className="h-8 w-8" />
                  <span className="text-sm font-medium">Change Design</span>
                </div>
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
            canUndo={canUndoValue}
            canRedo={canRedoValue}
            {...(!isComparisonView && {
              zoom: zoomLevel,
              onZoomIn: handleZoomIn,
              onZoomOut: handleZoomOut,
              onZoomFit: handleZoomFit
            })}
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
          <div ref={imageAreaRef} className="relative min-h-0 flex-1 px-6 py-4">
            <div className="mx-auto flex h-full w-full max-w-[1200px] items-center justify-center">
              <ImagePreviewContainer
                imageUrl={currentImage}
                imageSize={imageSize}
                canvasRef={drawingCanvasRef || canvasRef}
                elements={elements}
                onElementsChange={handleElementsChange}
                onImageLoad={handleImageLoad}
                altText="Original Screenshot"
                isScreenshot={true}
                zoom={zoomLevel}
              />
            </div>
          </div>
        )}
      </div>
    )
  }
)

ScreenshotPreviewWithDrawing.displayName = "ScreenshotPreviewWithDrawing"

export default ScreenshotPreviewWithDrawing
