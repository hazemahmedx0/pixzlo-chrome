"use client"

import { useDrawingStore } from "@/stores/drawing-store"
import { useCallback, useEffect } from "react"

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
  undo: () => boolean
  redo: () => boolean
  canUndo: () => boolean
  canRedo: () => boolean
  resetDrawing: () => void
}

/**
 * Custom hook to handle keyboard shortcuts for drawing operations
 */
export const useKeyboardShortcuts = (
  options: UseKeyboardShortcutsOptions
): void => {
  const { enabled = true, undo, redo, canUndo, canRedo, resetDrawing } = options

  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (!enabled) return

      // Prevent shortcuts when typing in input fields
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return
      }

      const isCtrlPressed = event.ctrlKey || event.metaKey
      const isShiftPressed = event.shiftKey

      if (isCtrlPressed && !isShiftPressed) {
        switch (event.key.toLowerCase()) {
          case "z": {
            event.preventDefault()
            if (canUndo()) {
              undo()
            }
            break
          }
          case "y": {
            event.preventDefault()
            if (canRedo()) {
              redo()
            }
            break
          }
          default:
            break
        }
      }

      // Handle Ctrl+Shift+Z as alternative redo shortcut (common in many apps)
      if (isCtrlPressed && isShiftPressed && event.key.toLowerCase() === "z") {
        event.preventDefault()
        if (canRedo()) {
          redo()
        }
      }

      // Handle Delete key for clearing (optional - might want to remove this)
      if (event.key === "Delete" && isCtrlPressed && isShiftPressed) {
        event.preventDefault()
        const confirmClear = window.confirm(
          "Are you sure you want to clear all drawings? This action cannot be undone."
        )
        if (confirmClear) {
          resetDrawing()
        }
      }
    },
    [enabled, undo, redo, canUndo, canRedo, resetDrawing]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener("keydown", handleKeyDown)

    return (): void => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}
