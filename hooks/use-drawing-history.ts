"use client"

import type { DrawingElement } from "@/types/drawing"
import { useCallback, useRef, useState } from "react"

interface DrawingHistory {
  elements: DrawingElement[]
}

/**
 * Hook for managing drawing history following Konva React best practices
 * Uses React state for visual elements and useRef for history to avoid unnecessary re-renders
 * Based on: https://konvajs.org/docs/react/Undo-Redo.html
 */
export const useDrawingHistory = (initialElements: DrawingElement[] = []) => {
  // React state for visual elements - this triggers re-renders
  const [elements, setElements] = useState<DrawingElement[]>(initialElements)
  // Render counter to force updates on undo/redo
  const [renderCounter, setRenderCounter] = useState(0)

  // Use refs to keep history to avoid unnecessary re-renders
  const history = useRef<DrawingHistory[]>([{ elements: initialElements }])
  const historyStep = useRef(0)

  const saveToHistory = useCallback((newElements: DrawingElement[]) => {
    console.log("Saving to history:", newElements.length, "elements")

    // Remove all states after current step
    history.current = history.current.slice(0, historyStep.current + 1)

    // Push the new state
    const newHistoryEntry = { elements: [...newElements] }
    history.current = history.current.concat([newHistoryEntry])
    historyStep.current += 1

    console.log(
      "History now has",
      history.current.length,
      "states, at step",
      historyStep.current
    )

    // Update visual state
    setElements(newElements)
  }, [])

  const undo = useCallback(() => {
    console.log("Undo called - current step:", historyStep.current)

    if (historyStep.current === 0) {
      console.log("Cannot undo - at beginning")
      return false
    }

    historyStep.current -= 1
    const previous = history.current[historyStep.current]

    console.log(
      "Undoing to step",
      historyStep.current,
      "with",
      previous.elements.length,
      "elements"
    )

    // Update visual state - this triggers React re-render
    setElements([...previous.elements])
    setRenderCounter((prev) => prev + 1) // Force re-render
    return true
  }, [])

  const redo = useCallback(() => {
    console.log(
      "Redo called - current step:",
      historyStep.current,
      "max:",
      history.current.length - 1
    )

    if (historyStep.current === history.current.length - 1) {
      console.log("Cannot redo - at end")
      return false
    }

    historyStep.current += 1
    const next = history.current[historyStep.current]

    console.log(
      "Redoing to step",
      historyStep.current,
      "with",
      next.elements.length,
      "elements"
    )

    // Update visual state - this triggers React re-render
    setElements([...next.elements])
    setRenderCounter((prev) => prev + 1) // Force re-render
    return true
  }, [])

  const canUndo = useCallback(() => {
    return historyStep.current > 0
  }, [])

  const canRedo = useCallback(() => {
    return historyStep.current < history.current.length - 1
  }, [])

  const resetHistory = useCallback(() => {
    console.log("Resetting history")
    const emptyElements: DrawingElement[] = []
    history.current = [{ elements: emptyElements }]
    historyStep.current = 0
    setElements(emptyElements)
    setRenderCounter((prev) => prev + 1) // Force re-render
  }, [])

  const addElement = useCallback(
    (element: DrawingElement) => {
      console.log("Adding element:", element.type, element.id)
      const newElements = [...elements, element]
      saveToHistory(newElements)
    },
    [elements, saveToHistory]
  )

  const updateElement = useCallback(
    (id: string, updates: Partial<DrawingElement>) => {
      console.log("Updating element:", id)
      const newElements = elements.map((el) =>
        el.id === id ? ({ ...el, ...updates } as DrawingElement) : el
      )
      saveToHistory(newElements)
    },
    [elements, saveToHistory]
  )

  const removeElement = useCallback(
    (id: string) => {
      console.log("Removing element:", id)
      const newElements = elements.filter((el) => el.id !== id)
      saveToHistory(newElements)
    },
    [elements, saveToHistory]
  )

  // Get current history info for debugging
  const getHistoryInfo = useCallback(() => {
    return {
      currentStep: historyStep.current,
      totalSteps: history.current.length,
      canUndo: canUndo(),
      canRedo: canRedo()
    }
  }, [canUndo, canRedo])

  return {
    // Current visual state
    elements,

    // History operations
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,

    // Element operations
    addElement,
    updateElement,
    removeElement,
    saveToHistory,

    // Direct state control
    setElements,

    // Debug info
    getHistoryInfo,
    renderCounter
  }
}
