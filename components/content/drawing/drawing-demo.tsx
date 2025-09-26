"use client"

import { useDrawingHistory } from "@/hooks/use-drawing-history"
import { memo } from "react"

import DrawingCanvas from "./drawing-canvas"
import DrawingTest from "./drawing-test"
import DrawingToolbar from "./drawing-toolbar"

/**
 * Complete drawing demo with proper React-based undo/redo implementation
 * Following official Konva React pattern: https://konvajs.org/docs/react/Undo-Redo.html
 */
const DrawingDemo = memo(() => {
  // Use React-based history hook
  const { undo, redo, canUndo, canRedo, resetHistory } = useDrawingHistory([])

  return (
    <div className="relative h-screen w-full">
      {/* Toolbar with React-based history methods */}
      <DrawingToolbar
        className="absolute left-4 top-4 z-10"
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        resetDrawing={resetHistory}
      />

      {/* Test panel for verification */}
      <DrawingTest />

      {/* Canvas with proper React state integration */}
      <DrawingCanvas
        imageUrl="/api/placeholder/800/600"
        width={window.innerWidth}
        height={window.innerHeight}
        onElementsChange={(elements) => {
          console.log("Canvas elements changed:", elements.length)
        }}
      />

      {/* Usage instructions */}
      <div className="absolute bottom-4 left-4 z-10 max-w-sm rounded-lg border border-blue-300 bg-blue-50 p-3">
        <h4 className="mb-2 text-sm font-bold text-blue-800">
          ✅ Working Implementation
        </h4>
        <div className="space-y-1 text-xs text-blue-700">
          <div>• Uses React state for visual elements</div>
          <div>• Uses useRef for history (no re-renders)</div>
          <div>• Direct state updates trigger canvas updates</div>
          <div>• Follows official Konva React pattern</div>
          <div className="mt-2 font-semibold">
            Try: Draw → Undo (Ctrl+Z) → Redo (Ctrl+Y)
          </div>
        </div>
      </div>
    </div>
  )
})

DrawingDemo.displayName = "DrawingDemo"

export default DrawingDemo
