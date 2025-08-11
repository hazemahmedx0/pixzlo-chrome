import type { Position, SelectionArea } from "@/types/ui"
import { useCallback, useEffect, useRef, useState } from "react"

interface SelectionOverlayProps {
  isActive: boolean
  onSelectionComplete: (area: {
    startX: number
    startY: number
    width: number
    height: number
  }) => void
  onCancel: () => void
}

const SelectionOverlay = ({
  isActive,
  onSelectionComplete,
  onCancel
}: SelectionOverlayProps) => {
  const [selection, setSelection] = useState<SelectionArea>({
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 0, y: 0 },
    isSelecting: false
  })

  const overlayRef = useRef<HTMLDivElement>(null)

  const getMousePosition = useCallback((e: MouseEvent): Position => {
    return {
      x: e.clientX + window.scrollX,
      y: e.clientY + window.scrollY
    }
  }, [])

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!isActive) return
      e.preventDefault()
      e.stopPropagation()

      const position = getMousePosition(e)
      setSelection({
        startPosition: position,
        endPosition: position,
        isSelecting: true
      })
    },
    [isActive, getMousePosition]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isActive || !selection.isSelecting) return
      e.preventDefault()

      const position = getMousePosition(e)
      setSelection((prev) => ({
        ...prev,
        endPosition: position
      }))
    },
    [isActive, selection.isSelecting, getMousePosition]
  )

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isActive || !selection.isSelecting) return
      e.preventDefault()
      e.stopPropagation()

      const { startPosition, endPosition } = selection
      const startX = Math.min(startPosition.x, endPosition.x)
      const startY = Math.min(startPosition.y, endPosition.y)
      const width = Math.abs(endPosition.x - startPosition.x)
      const height = Math.abs(endPosition.y - startPosition.y)

      if (width > 10 && height > 10) {
        // Minimum selection size
        onSelectionComplete({ startX, startY, width, height })
      }

      setSelection({
        startPosition: { x: 0, y: 0 },
        endPosition: { x: 0, y: 0 },
        isSelecting: false
      })
    },
    [isActive, selection, onSelectionComplete]
  )

  const handleContextMenu = useCallback(
    (e: Event) => {
      if (!isActive) return
      e.preventDefault()
      onCancel()
    },
    [isActive, onCancel]
  )

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive) return
      if (e.key === "Escape") {
        e.preventDefault()
        onCancel()
      }
    },
    [isActive, onCancel]
  )

  useEffect(() => {
    if (!isActive) return

    document.addEventListener("mousedown", handleMouseDown, { capture: true })
    document.addEventListener("mousemove", handleMouseMove, { passive: false })
    document.addEventListener("mouseup", handleMouseUp, { capture: true })
    document.addEventListener("contextmenu", handleContextMenu, {
      capture: true
    })
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handleMouseDown, {
        capture: true
      } as EventListenerOptions)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp, {
        capture: true
      } as EventListenerOptions)
      document.removeEventListener("contextmenu", handleContextMenu, {
        capture: true
      } as EventListenerOptions)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [
    isActive,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleEscape
  ])

  if (!isActive) return null

  const { startPosition, endPosition, isSelecting } = selection
  const startX = Math.min(startPosition.x, endPosition.x)
  const startY = Math.min(startPosition.y, endPosition.y)
  const width = Math.abs(endPosition.x - startPosition.x)
  const height = Math.abs(endPosition.y - startPosition.y)

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[2147483646] cursor-crosshair"
      data-pixzlo-ui="selection-overlay"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.05)",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
      }}>
      {/* Instruction text */}
      <div className="fixed left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 shadow-lg backdrop-blur-sm">
        <p className="text-sm font-medium text-gray-700">
          Click and drag to select an area • Right-click or press Escape to
          cancel
        </p>
      </div>

      {/* Selection rectangle */}
      {isSelecting && width > 0 && height > 0 && (
        <>
          {/* Clear selected area */}
          <div
            className="absolute border-2 border-blue-500 bg-transparent"
            style={{
              left: startX,
              top: startY,
              width,
              height,
              backgroundColor: "transparent"
            }}
          />

          {/* Selection info */}
          <div
            className="absolute rounded bg-blue-600 px-2 py-1 font-mono text-xs text-white"
            style={{
              left: startX,
              top: startY - 24,
              transform: startY < 30 ? "translateY(calc(100% + 24px))" : "none"
            }}>
            {Math.round(width)} × {Math.round(height)}
          </div>
        </>
      )}
    </div>
  )
}

export default SelectionOverlay
