"use client"

import { useDrawingStore } from "@/stores/drawing-store"
import type { DrawingTool } from "@/types/drawing"
import {
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  ArrowUpRightIcon,
  CircleIcon,
  MinusIcon,
  NavigationArrowIcon,
  PlusIcon,
  SquareIcon,
  TrashIcon
} from "@phosphor-icons/react"
import {
  ArrowRight,
  Circle,
  Minus,
  MousePointer,
  Plus,
  Redo,
  Square,
  Trash2,
  Type,
  Undo
} from "lucide-react"
import { memo, useId } from "react"

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
  icon: React.ComponentType<{ size?: string | number; color?: string }>
  label: string
}[] = [
  { tool: "select", icon: NavigationArrowIcon, label: "Select" },
  { tool: "arrow", icon: ArrowUpRightIcon, label: "Arrow" },
  // { tool: "text", icon: Type, label: "Text" },
  { tool: "pen", icon: PenToolIcon, label: "Pen" },
  { tool: "rectangle", icon: SquareIcon, label: "Rectangle" },
  { tool: "circle", icon: CircleIcon, label: "Circle" }
]

function PenToolIcon({
  size = 20,
  color = "#282828"
}: {
  size?: string | number
  color?: string
}) {
  const uid = useId()
  const clipPathId = `clip0_${uid}`
  const maskId = `mask0_${uid}`
  const filter0Id = `filter0_${uid}`
  const filter1Id = `filter1_${uid}`
  const paint0Id = `paint0_${uid}`
  const paint1Id = `paint1_${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <g clipPath={`url(#${clipPathId})`}>
        <mask
          id={maskId}
          style={{ maskType: "luminance" }}
          maskUnits="userSpaceOnUse"
          x="4"
          y="4"
          width="17"
          height="34">
          <path d="M20.125 4H4.125V38H20.125V4Z" fill="white" />
        </mask>
        <g mask={`url(#${maskId})`}>
          <path
            d="M8.12056 11.498C8.32478 10.9953 8.81326 10.6665 9.35585 10.6665H14.8942C15.4368 10.6665 15.9253 10.9953 16.1295 11.498L19.3407 19.4024C19.8587 20.6775 20.1251 22.0408 20.1251 23.4172V46.6666H4.125V23.4172C4.125 22.0408 4.39135 20.6775 4.90936 19.4024L8.12056 11.498Z"
            fill="white"
          />
          <path
            d="M8.12056 11.498C8.32478 10.9953 8.81326 10.6665 9.35585 10.6665H14.8942C15.4368 10.6665 15.9253 10.9953 16.1295 11.498L19.3407 19.4024C19.8587 20.6775 20.1251 22.0408 20.1251 23.4172V46.6666H4.125V23.4172C4.125 22.0408 4.39135 20.6775 4.90936 19.4024L8.12056 11.498Z"
            fill={`url(#${paint0Id})`}
            fillOpacity="0.6"
          />
          <path
            d="M9.35547 10.9165H14.8945C15.2802 10.9166 15.6321 11.1211 15.8252 11.4458L15.8975 11.5923L19.1094 19.4965C19.6152 20.7417 19.875 22.0734 19.875 23.4174V46.4165H4.375V23.4174C4.375 22.0734 4.63479 20.7417 5.14062 19.4965L8.35254 11.5923C8.51842 11.184 8.91476 10.9167 9.35547 10.9165Z"
            stroke="black"
            strokeOpacity="0.3"
            strokeWidth="1"
          />
          <g opacity="0.2" filter={`url(#${filter0Id})`}>
            <path
              d="M18.7884 22.0892V45.7559H12.455V11.7558L14.7883 11.6665L18.7884 22.0892Z"
              fill={`url(#${paint1Id})`}
            />
          </g>
          <g filter={`url(#${filter1Id})`}>
            <path
              d="M11.508 5.17499C11.734 4.62266 12.5162 4.62266 12.7421 5.17498L15.1251 11.0001H9.12506L11.508 5.17499Z"
              fill={color}
            />
          </g>
        </g>
      </g>
      <defs>
        <filter
          id={filter0Id}
          x="10.455"
          y="9.66648"
          width="10.3335"
          height="38.0894"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="1.00001"
            result="effect1_foregroundBlur"
          />
        </filter>
        <filter
          id={filter1Id}
          x="7.68505"
          y="4.76074"
          width="7.44006"
          height="6.95926"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="-1.44001" dy="0.720004" />
          <feGaussianBlur stdDeviation="1.08001" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"
          />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
        </filter>
        <linearGradient
          id={paint0Id}
          x1="4.125"
          y1="39.6666"
          x2="20.1251"
          y2="39.6666"
          gradientUnits="userSpaceOnUse">
          <stop stopOpacity="0.1" />
          <stop offset="0.4" stopOpacity="0" />
          <stop offset="1" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient
          id={paint1Id}
          x1="12.455"
          y1="2.99979"
          x2="17.2922"
          y2="37.6618"
          gradientUnits="userSpaceOnUse">
          <stop stopOpacity="0.2" />
          <stop offset="1" stopOpacity="0.4" />
        </linearGradient>
        <clipPath id={clipPathId}>
          <rect width="24" height="24" rx="5" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

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
        className={`flex items-center gap-2 rounded-[13px] bg-[var(--color-white-solid,#FFF)] p-2 ${className}`}
        style={{
          boxShadow:
            "0 3px 5.9px -1.5px rgba(0, 0, 0, 0.05), 0 1px 2.1px 0 rgba(0, 0, 0, 0.05), 0 0 0 0.5px rgba(0, 0, 0, 0.18)"
        }}>
        {/* Drawing Tools */}
        <div className="flex items-center gap-2">
          {TOOLS.map(({ tool, icon: Icon, label }) => (
            <button
              key={tool}
              onClick={() => handleToolChange(tool)}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-100 ${
                currentTool === tool
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-600"
              }`}
              title={label}>
              <Icon
                size={20}
                color={tool === "pen" ? currentColor : undefined}
              />
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-200" aria-hidden="true" />

        {/* Color Picker */}
        <ColorPicker color={currentColor} onColorChange={handleColorChange} />

        <div className="h-6 w-px bg-gray-200" aria-hidden="true" />

        {/* Stroke Width */}
        <div
          className={`flex items-center gap-2 ${
            currentTool === "text" ? "opacity-50" : ""
          }`}>
          <button
            onClick={() => handleStrokeWidthDelta(-1)}
            disabled={currentStrokeWidth <= DRAWING_CONSTANTS.MIN_STROKE_WIDTH}
            className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
            title="Decrease stroke width">
            <MinusIcon size={14} />
          </button>
          <span className="w-6 text-center text-sm font-medium">
            {currentStrokeWidth}
          </span>
          <button
            onClick={() => handleStrokeWidthDelta(1)}
            disabled={currentStrokeWidth >= DRAWING_CONSTANTS.MAX_STROKE_WIDTH}
            className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
            title="Increase stroke width">
            <PlusIcon size={14} />
          </button>
        </div>

        <div className="h-6 w-px bg-gray-200" aria-hidden="true" />

        {/* History Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={!handleCanUndo()}
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
            title="Undo (Ctrl+Z)">
            <ArrowArcLeftIcon size={20} />
          </button>
          <button
            onClick={handleRedo}
            disabled={!handleCanRedo()}
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
            title="Redo (Ctrl+Y)">
            <ArrowArcRightIcon size={20} />
          </button>
        </div>

        <div className="h-6 w-px bg-gray-200" aria-hidden="true" />

        {/* Clear All */}
        <button
          onClick={handleResetDrawing}
          className="flex h-8 w-8 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50"
          title="Clear all drawings">
          <TrashIcon size={20} />
        </button>
      </div>
    )
  }
)

DrawingToolbar.displayName = "DrawingToolbar"

export default DrawingToolbar
