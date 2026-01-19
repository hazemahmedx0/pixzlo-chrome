"use client"

import { useDrawingHistory } from "@/hooks/use-drawing-history"
import type { DrawingElement } from "@/types/drawing"
import { memo, useCallback } from "react"

/**
 * Test component following the official Konva React undo/redo pattern
 * Based on: https://konvajs.org/docs/react/Undo-Redo.html
 */
const DrawingTest = memo(() => {
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
    getHistoryInfo
  } = useDrawingHistory([])

  const createTestElement = useCallback((): DrawingElement => {
    const id = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      id,
      type: "rectangle",
      x: Math.random() * 200,
      y: Math.random() * 200,
      width: 50 + Math.random() * 50,
      height: 50 + Math.random() * 50,
      color: "#ef4444",
      strokeWidth: 2,
      visible: true
    }
  }, [])

  const testAddElement = useCallback(() => {
    const element = createTestElement()
    addElement(element)
  }, [addElement, createTestElement])

  const testUpdateElement = useCallback(() => {
    if (elements.length === 0) {
      return
    }
    const element = elements[0]
    updateElement(element.id, {
      color: element.color === "#ef4444" ? "#3b82f6" : "#ef4444"
    })
  }, [elements, updateElement])

  const testRemoveElement = useCallback(() => {
    if (elements.length === 0) {
      return
    }
    const element = elements[elements.length - 1]
    removeElement(element.id)
  }, [elements, removeElement])

  const testUndo = useCallback(() => {
    undo()
  }, [undo])

  const testRedo = useCallback(() => {
    redo()
  }, [redo])

  const testClear = useCallback(() => {
    resetHistory()
  }, [resetHistory])

  const historyInfo = getHistoryInfo()

  return (
    <div className="fixed right-4 top-4 z-50 max-w-xs rounded-lg border border-green-300 bg-green-50 p-4 shadow-lg">
      <h3 className="mb-3 text-sm font-bold text-green-800">
        Drawing Test Panel
      </h3>

      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={testAddElement}
            className="rounded bg-green-500 px-2 py-1 text-xs text-white hover:bg-green-600">
            Add Element
          </button>
          <button
            onClick={testUpdateElement}
            className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600">
            Update Element
          </button>
          <button
            onClick={testRemoveElement}
            className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600">
            Remove Element
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={testUndo}
            disabled={!canUndo()}
            className="rounded bg-yellow-500 px-2 py-1 text-xs text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50">
            Undo ({canUndo() ? "✓" : "✗"})
          </button>
          <button
            onClick={testRedo}
            disabled={!canRedo()}
            className="rounded bg-orange-500 px-2 py-1 text-xs text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
            Redo ({canRedo() ? "✓" : "✗"})
          </button>
        </div>

        <button
          onClick={testClear}
          className="w-full rounded bg-gray-800 px-2 py-1 text-xs text-white hover:bg-gray-900">
          Clear All
        </button>
      </div>

      <div className="mt-3 border-t border-green-200 pt-2 text-xs text-green-700">
        <div>Elements: {elements.length}</div>
        <div>
          History: {historyInfo.currentStep + 1}/{historyInfo.totalSteps}
        </div>
        <div>Can Undo: {historyInfo.canUndo ? "YES" : "NO"}</div>
        <div>Can Redo: {historyInfo.canRedo ? "YES" : "NO"}</div>
        <div className="mt-1 text-xs text-green-600">
          React-based history
        </div>
      </div>
    </div>
  )
})

DrawingTest.displayName = "DrawingTest"

export default DrawingTest
