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
  const ignoreToolbarClick = useRef<boolean>(false)

  useEffect(() => {
    const handler = () => {
      ignoreToolbarClick.current = true
      setTimeout(() => {
        ignoreToolbarClick.current = false
      }, 250)
    }
    window.addEventListener("pixzlo-toolbar-click", handler as EventListener)
    return () => {
      window.removeEventListener(
        "pixzlo-toolbar-click",
        handler as EventListener
      )
    }
  }, [])

  const getMousePosition = useCallback((e: MouseEvent): Position => {
    // For rendering, we use clientX/Y which are viewport-relative.
    return {
      x: e.clientX,
      y: e.clientY
    }
  }, [])

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!isActive) return
      if (ignoreToolbarClick.current) {
        console.log(
          "🎯 SelectionOverlay: Ignoring mousedown due to toolbar interaction (global handshake)"
        )
        return
      }

      // Check if the click is on the floating toolbar
      const target = e.target as HTMLElement

      // Multi-level detection for toolbar clicks
      const isDirectToolbarElement = target.closest(
        "[data-pixzlo-ui='floating-toolbar']"
      )
      const isButtonElement =
        target.tagName === "BUTTON" && isDirectToolbarElement
      const isIconElement = target.tagName === "svg" && isDirectToolbarElement

      // Additional coordinate-based check - this is the most reliable
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY)
      const toolbarAtPoint = elementAtPoint?.closest(
        "[data-pixzlo-ui='floating-toolbar']"
      )

      // For PLASMO-CSUI elements, check if the click coordinates are within toolbar bounds
      let isWithinToolbarBounds = false
      if (target.tagName === "PLASMO-CSUI") {
        const toolbar = document.querySelector(
          "[data-pixzlo-ui='floating-toolbar']"
        )
        if (toolbar) {
          const rect = toolbar.getBoundingClientRect()
          isWithinToolbarBounds =
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
        }
      }

      const isToolbarClick =
        isDirectToolbarElement ||
        isButtonElement ||
        isIconElement ||
        toolbarAtPoint ||
        isWithinToolbarBounds

      console.log("🖱️ SelectionOverlay: Mouse down on:", {
        target: target.tagName,
        className: target.className,
        isDirectToolbarElement: !!isDirectToolbarElement,
        isButtonElement: !!isButtonElement,
        isIconElement: !!isIconElement,
        toolbarAtPoint: !!toolbarAtPoint,
        isWithinToolbarBounds: !!isWithinToolbarBounds,
        isToolbarClick: !!isToolbarClick,
        coordinates: { x: e.clientX, y: e.clientY }
      })

      if (isToolbarClick) {
        // Allow toolbar clicks to pass through (don't prevent default)
        console.log(
          "🎯 SelectionOverlay: Allowing toolbar click to pass through"
        )
        return
      }

      e.preventDefault()
      e.stopPropagation()

      const position = getMousePosition(e)
      console.log("🖱️ SelectionOverlay: Starting selection at:", position)
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
      console.log("🖱️ SelectionOverlay: Mouse up event:", {
        isActive,
        isSelecting: selection.isSelecting,
        coordinates: { x: e.clientX, y: e.clientY }
      })
      if (ignoreToolbarClick.current) {
        console.log(
          "🎯 SelectionOverlay: Ignoring mouseup due to toolbar interaction (global handshake)"
        )
        return
      }

      if (!isActive || !selection.isSelecting) {
        console.log(
          "❌ SelectionOverlay: Mouse up ignored - not active or not selecting"
        )
        return
      }

      e.preventDefault()
      e.stopPropagation()

      // Final position is viewport-relative, so add scroll offsets for capture
      const finalStartPosition = {
        x: selection.startPosition.x + window.scrollX,
        y: selection.startPosition.y + window.scrollY
      }
      const finalEndPosition = {
        x: selection.endPosition.x + window.scrollX,
        y: selection.endPosition.y + window.scrollY
      }

      const startX = Math.min(finalStartPosition.x, finalEndPosition.x)
      const startY = Math.min(finalStartPosition.y, finalEndPosition.y)
      const width = Math.abs(finalEndPosition.x - finalStartPosition.x)
      const height = Math.abs(finalEndPosition.y - finalStartPosition.y)

      console.log("🔍 SelectionOverlay: Selection completed:", {
        width,
        height,
        startX,
        startY,
        meetsMinimumSize: width > 10 && height > 10
      })

      if (width > 10 && height > 10) {
        // Minimum selection size
        console.log(
          "✅ SelectionOverlay: Calling onSelectionComplete with area:",
          { startX, startY, width, height }
        )
        onSelectionComplete({ startX, startY, width, height })
      } else {
        console.log(
          "❌ SelectionOverlay: Selection too small, not triggering capture"
        )
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

      // Check if the right-click is on the toolbar
      const target = e.target as HTMLElement
      const isDirectToolbarElement = target.closest(
        "[data-pixzlo-ui='floating-toolbar']"
      )
      const isToolbarClick = !!isDirectToolbarElement

      if (isToolbarClick) {
        // Allow toolbar right-clicks to pass through
        return
      }

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
