import type { Position, SelectionArea } from "@/types/ui"
import { useCallback, useEffect, useRef, useState } from "react"

const TOOLBAR_SELECTOR = "[data-pixzlo-ui='floating-toolbar']"

/**
 * Find the toolbar element, checking both document and shadow DOM
 */
const findToolbarElement = (): HTMLElement | null => {
  // First try document (in case it's not in shadow DOM)
  const toolbar = document.querySelector(TOOLBAR_SELECTOR) as HTMLElement | null
  if (toolbar) return toolbar

  // Check inside shadow DOM (plasmo-csui)
  const shadowHosts = document.querySelectorAll("plasmo-csui")
  for (const host of shadowHosts) {
    const shadowRoot = host.shadowRoot
    if (shadowRoot) {
      const shadowToolbar = shadowRoot.querySelector(TOOLBAR_SELECTOR) as HTMLElement | null
      if (shadowToolbar) return shadowToolbar
    }
  }

  return null
}

/**
 * Check if coordinates are within the toolbar bounds
 */
const isWithinToolbar = (clientX: number, clientY: number): boolean => {
  const toolbar = findToolbarElement()
  if (!toolbar) return false

  const rect = toolbar.getBoundingClientRect()
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  )
}

const isToolbarEvent = (event: Event): boolean => {
  const target = event.target as HTMLElement | null
  if (target?.closest?.(TOOLBAR_SELECTOR)) return true

  // Check composed path for shadow DOM traversal
  const path =
    typeof (event as MouseEvent).composedPath === "function"
      ? (event as MouseEvent).composedPath()
      : []

  const pathContainsToolbar = path.some((node) => {
    if (!(node instanceof HTMLElement)) return false
    return (
      node.dataset?.pixzloUi === "floating-toolbar" ||
      !!node.closest?.(TOOLBAR_SELECTOR)
    )
  })

  if (pathContainsToolbar) return true

  // Fallback: coordinate-based check for shadow DOM
  const mouseEvent = event as MouseEvent
  if (mouseEvent.clientX !== undefined && mouseEvent.clientY !== undefined) {
    return isWithinToolbar(mouseEvent.clientX, mouseEvent.clientY)
  }

  return false
}

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

  useEffect(() => {
    if (!isActive) return
    const previousCursor = document.body.style.cursor
    document.body.style.cursor = "crosshair"
    return () => {
      document.body.style.cursor = previousCursor
    }
  }, [isActive])

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

      // Coordinate-based check - most reliable for Shadow DOM
      const isWithinToolbarBounds = isWithinToolbar(e.clientX, e.clientY)

      const isToolbarClick =
        isToolbarEvent(e) ||
        isDirectToolbarElement ||
        isButtonElement ||
        isIconElement ||
        isWithinToolbarBounds

      if (isToolbarClick) {
        // Allow toolbar clicks to pass through (don't prevent default)
        return
      }

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
      if (ignoreToolbarClick.current) {
        return
      }

      if (!isActive || !selection.isSelecting) {
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

      // Check if the right-click is on the toolbar
      const target = e.target as HTMLElement
      const isDirectToolbarElement = target.closest(
        "[data-pixzlo-ui='floating-toolbar']"
      )
      const isToolbarClick = isToolbarEvent(e) || !!isDirectToolbarElement

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
        pointerEvents: "none",
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
