"use client"

import { useDrawingStore } from "@/stores/drawing-store"
import type { DrawingTool } from "@/types/drawing"
import {
  ArrowRight,
  Circle,
  Minus,
  MousePointer,
  Pen,
  Plus,
  Redo,
  Square,
  Trash2,
  Type,
  Undo
} from "lucide-react"
import { memo } from "react"

import ColorPicker from "./color-picker"
import { clamp, DRAWING_CONSTANTS } from "./drawing-utils"

interface DrawingToolbarProps {
  className?: string
  // New interface (React-based history)
  undo?: () => boolean
  redo?: () => boolean
  resetDrawing?: () => void
  // Old interface (backwards compatibility)
  activeTool?: DrawingTool
  onToolChange?: (tool: DrawingTool) => void
  color?: string
  onColorChange?: (color: string) => void
  strokeWidth?: number
  onStrokeWidthChange?: (width: number) => void
  fontSize?: number
  onFontSizeChange?: (size: number) => void
  onUndo?: () => void
  onRedo?: () => void
  onClear?: () => void
  // Can be either boolean (old interface) or function (new interface)
  canUndo?: boolean | (() => boolean)
  canRedo?: boolean | (() => boolean)
}

const TOOLS: {
  tool: DrawingTool
  icon: React.ComponentType<{ size?: string | number }>
  label: string
}[] = [
  { tool: "select", icon: MousePointer, label: "Select" },
  { tool: "arrow", icon: ArrowRight, label: "Arrow" },
  // { tool: "text", icon: Type, label: "Text" },
  { tool: "pen", icon: Pen, label: "Pen" },
  { tool: "rectangle", icon: Square, label: "Rectangle" },
  { tool: "circle", icon: Circle, label: "Circle" }
]

const DrawingToolbar = memo(
  ({
    className = "",
    // New interface
    undo,
    redo,
    resetDrawing,
    // Old interface
    activeTool,
    onToolChange,
    color,
    onColorChange,
    strokeWidth,
    onStrokeWidthChange,
    fontSize,
    onFontSizeChange,
    onUndo,
    onRedo,
    onClear,
    canUndo,
    canRedo
  }: DrawingToolbarProps) => {
    // Get drawing settings from Zustand store
    const drawingState = useDrawingStore((state) => state.drawingState)
    const setTool = useDrawingStore((state) => state.setTool)
    const setColor = useDrawingStore((state) => state.setColor)
    const setStrokeWidth = useDrawingStore((state) => state.setStrokeWidth)
    const setFontSize = useDrawingStore((state) => state.setFontSize)

    // Use Zustand fallbacks if no props provided
    const zustandUndo = useDrawingStore((state) => state.undo)
    const zustandRedo = useDrawingStore((state) => state.redo)
    const zustandCanUndo = useDrawingStore((state) => state.canUndo)
    const zustandCanRedo = useDrawingStore((state) => state.canRedo)
    const zustandResetDrawing = useDrawingStore((state) => state.resetDrawing)

    // Handle backwards compatibility - support both old and new interfaces
    const currentTool = activeTool ?? drawingState.tool
    const currentColor = color ?? drawingState.color
    const currentStrokeWidth = strokeWidth ?? drawingState.strokeWidth
    const currentFontSize = fontSize ?? drawingState.fontSize

    const handleToolChange = onToolChange || setTool
    const handleColorChange = onColorChange || setColor

    const handleUndo = onUndo || undo || zustandUndo
    const handleRedo = onRedo || redo || zustandRedo
    const handleResetDrawing = onClear || resetDrawing || zustandResetDrawing

    // Handle canUndo/canRedo - can be boolean or function
    const handleCanUndo =
      typeof canUndo === "function"
        ? canUndo
        : typeof canUndo === "boolean"
          ? () => canUndo
          : () => zustandCanUndo
    const handleCanRedo =
      typeof canRedo === "function"
        ? canRedo
        : typeof canRedo === "boolean"
          ? () => canRedo
          : () => zustandCanRedo

    const handleStrokeWidthChange =
      onStrokeWidthChange ||
      ((delta: number) => {
        const newWidth = clamp(
          currentStrokeWidth + delta,
          DRAWING_CONSTANTS.MIN_STROKE_WIDTH,
          DRAWING_CONSTANTS.MAX_STROKE_WIDTH
        )
        setStrokeWidth(newWidth)
      })

    const handleFontSizeChange =
      onFontSizeChange ||
      ((delta: number) => {
        const newSize = Math.max(8, Math.min(72, currentFontSize + delta))
        setFontSize(newSize)
      })

    // For old interface compatibility - convert width change to delta
    const handleStrokeWidthDelta = (delta: number) => {
      if (onStrokeWidthChange) {
        onStrokeWidthChange(currentStrokeWidth + delta)
      } else {
        const newWidth = clamp(
          currentStrokeWidth + delta,
          DRAWING_CONSTANTS.MIN_STROKE_WIDTH,
          DRAWING_CONSTANTS.MAX_STROKE_WIDTH
        )
        setStrokeWidth(newWidth)
      }
    }

    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm ${className}`}>
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
          {TOOLS.map(({ tool, icon: Icon, label }) => (
            <button
              key={tool}
              onClick={() => handleToolChange(tool)}
              className={`rounded-md p-2 transition-colors hover:bg-gray-100 ${
                currentTool === tool
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-600"
              }`}
              title={label}>
              <Icon size={18} />
            </button>
          ))}
        </div>

        {/* Color Picker */}
        <div className="border-r border-gray-200 px-2">
          <ColorPicker color={currentColor} onColorChange={handleColorChange} />
        </div>

        {/* Stroke Width */}
        <div
          className={`flex items-center gap-1 border-r border-gray-200 px-2 ${
            currentTool === "text" ? "opacity-50" : ""
          }`}>
          <button
            onClick={() => handleStrokeWidthDelta(-1)}
            disabled={currentStrokeWidth <= DRAWING_CONSTANTS.MIN_STROKE_WIDTH}
            className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
            title="Decrease stroke width">
            <Minus size={14} />
          </button>
          <span className="w-6 text-center text-sm font-medium">
            {currentStrokeWidth}
          </span>
          <button
            onClick={() => handleStrokeWidthDelta(1)}
            disabled={currentStrokeWidth >= DRAWING_CONSTANTS.MAX_STROKE_WIDTH}
            className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
            title="Increase stroke width">
            <Plus size={14} />
          </button>
        </div>

        {/* History Controls */}
        <div className="flex items-center gap-1 border-r border-gray-200 px-2">
          <button
            onClick={handleUndo}
            disabled={!handleCanUndo()}
            className="rounded-md p-2 transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
            title="Undo (Ctrl+Z)">
            <Undo size={18} />
          </button>
          <button
            onClick={handleRedo}
            disabled={!handleCanRedo()}
            className="rounded-md p-2 transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
            title="Redo (Ctrl+Y)">
            <Redo size={18} />
          </button>
        </div>

        {/* Clear All */}
        <div className="px-2">
          <button
            onClick={handleResetDrawing}
            className="rounded-md p-2 text-red-600 transition-colors hover:bg-red-50"
            title="Clear all drawings">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    )
  }
)

DrawingToolbar.displayName = "DrawingToolbar"

export default DrawingToolbar
