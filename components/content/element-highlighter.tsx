import { useCallback, useEffect, useRef, useState } from "react"

interface ElementHighlighterProps {
  isActive: boolean
  onElementSelect: (element: HTMLElement, rect: DOMRect) => void
  onCancel: () => void
}

const ElementHighlighter = ({
  isActive,
  onElementSelect,
  onCancel
}: ElementHighlighterProps) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const currentRect = useRef<DOMRect | null>(null)
  const currentElement = useRef<HTMLElement | null>(null)

  // RAF-throttled mouse move to reduce layout thrash on heavy pages
  const rafId = useRef<number | null>(null)
  const lastEvent = useRef<MouseEvent | null>(null)
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

  const hitTestAndHighlight = useCallback(
    (clientX: number, clientY: number) => {
      const overlay = overlayRef.current
      const highlight = highlightRef.current
      if (!overlay || !highlight) return

      // Temporarily hide the overlay to perform an accurate hit test
      overlay.style.display = "none"

      const el = document.elementFromPoint(
        clientX,
        clientY
      ) as HTMLElement | null

      // Restore the overlay's visibility immediately after
      overlay.style.display = "block"

      // Check if the element is the body or the overlay's host, and ignore
      const rootNode = overlay.getRootNode()
      const hostEl = rootNode instanceof ShadowRoot ? rootNode.host : null

      if (!el || el === document.body || el === hostEl) {
        highlight.style.display = "none"
        currentRect.current = null
        currentElement.current = null
        return
      }

      const rect = el.getBoundingClientRect()
      currentRect.current = rect
      currentElement.current = el

      highlight.style.display = "block"
      highlight.style.left = `${rect.left}px`
      highlight.style.top = `${rect.top}px`
      highlight.style.width = `${rect.width}px`
      highlight.style.height = `${rect.height}px`
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isActive) return

      lastEvent.current = e
      if (rafId.current !== null) return

      rafId.current = requestAnimationFrame(() => {
        rafId.current = null
        if (lastEvent.current) {
          hitTestAndHighlight(
            lastEvent.current.clientX,
            lastEvent.current.clientY
          )
          lastEvent.current = null
        }
      })
    },
    [isActive, hitTestAndHighlight]
  )

  const handleClick = useCallback(
    async (e: MouseEvent) => {
      if (!isActive) return
      if (ignoreToolbarClick.current) {
        console.log(
          "🎯 Allowing click due to toolbar interaction (global handshake)"
        )
        return
      }

      // Check if the click is on the floating toolbar
      const target = e.target as HTMLElement
      const overlayElement = overlayRef.current

      // Use the composed path to safely traverse through shadow DOM boundaries
      const composedPath =
        typeof e.composedPath === "function" ? e.composedPath() : []
      const pathContainsToolbar = composedPath.some((node) => {
        if (!(node instanceof HTMLElement)) return false
        if (node.dataset?.pixzloUi === "floating-toolbar") return true
        return !!node.closest?.("[data-pixzlo-ui='floating-toolbar']")
      })

      // Multi-level detection for toolbar clicks
      const isDirectToolbarElement = target.closest(
        "[data-pixzlo-ui='floating-toolbar']"
      )
      const isButtonElement =
        target.tagName === "BUTTON" && isDirectToolbarElement
      const isIconElement = target.tagName === "svg" && isDirectToolbarElement

      // Additional coordinate-based check - this is the most reliable
      if (overlayElement) overlayElement.style.display = "none"
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY)
      if (overlayElement) overlayElement.style.display = "block"
      const toolbarAtPoint = elementAtPoint?.closest(
        "[data-pixzlo-ui='floating-toolbar']"
      )

      // Check if PLASMO-CSUI contains toolbar by looking at its children
      const isPlasmoUIWithToolbar =
        target.tagName === "PLASMO-CSUI" &&
        (target.querySelector("[data-pixzlo-ui='floating-toolbar']") ||
          document.querySelector("[data-pixzlo-ui='floating-toolbar']"))

      // For PLASMO-CSUI elements, also check if the click coordinates are within toolbar bounds
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
        isWithinToolbarBounds ||
        pathContainsToolbar

      console.log("🔍 ElementHighlighter click detected:", {
        target: target.tagName,
        className: target.className,
        isDirectToolbarElement: !!isDirectToolbarElement,
        isButtonElement: !!isButtonElement,
        isIconElement: !!isIconElement,
        isPlasmoUIWithToolbar: !!isPlasmoUIWithToolbar,
        toolbarAtPoint: !!toolbarAtPoint,
        isWithinToolbarBounds: !!isWithinToolbarBounds,
        isToolbarClick: !!isToolbarClick,
        coordinates: { x: e.clientX, y: e.clientY }
      })

      if (isToolbarClick) {
        // Allow toolbar clicks to pass through (don't prevent default)
        console.log("🎯 Allowing toolbar click to pass through")
        return
      }

      console.log("🚫 ElementHighlighter blocking click and selecting element")
      e.preventDefault()
      e.stopPropagation()

      // Ignore clicks inside our overlay UI
      const overlay = overlayRef.current
      if (!overlay || overlay.contains(e.target as Node)) {
        return
      }

      const rect = currentRect.current
      const element = currentElement.current
      if (!rect || !element) return

      // Clear the hover highlight immediately but preserve element state
      const highlightBox = highlightRef.current
      if (highlightBox) {
        highlightBox.style.display = "none"
      }

      onElementSelect(element, rect)
    },
    [isActive, onElementSelect]
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

  // Handle viewport changes (scroll, resize)
  const handleViewportChange = useCallback(() => {
    if (!isActive || !lastEvent.current) return
    hitTestAndHighlight(lastEvent.current.clientX, lastEvent.current.clientY)
  }, [isActive, hitTestAndHighlight])

  useEffect(() => {
    if (!isActive) return

    // Use document-level listeners so scrolling works naturally while selecting
    document.addEventListener("mousemove", handleMouseMove, { passive: true })
    document.addEventListener("click", handleClick as EventListener, {
      capture: true
    })
    document.addEventListener("contextmenu", handleContextMenu, {
      capture: true
    })
    document.addEventListener("keydown", handleEscape)

    // When the page scrolls or resizes, recompute the highlight based on last mouse position
    window.addEventListener("scroll", handleViewportChange, true)
    window.addEventListener("resize", handleViewportChange)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener(
        "click",
        handleClick as EventListener,
        { capture: true } as EventListenerOptions
      )
      document.removeEventListener("contextmenu", handleContextMenu, {
        capture: true
      } as EventListenerOptions)
      document.removeEventListener("keydown", handleEscape)
      window.removeEventListener("scroll", handleViewportChange, true)
      window.removeEventListener("resize", handleViewportChange)

      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
    }
  }, [
    isActive,
    handleMouseMove,
    handleClick,
    handleContextMenu,
    handleEscape,
    handleViewportChange
  ])

  if (!isActive) return null

  return (
    <div
      ref={overlayRef}
      className="pointer-events-none fixed inset-0 z-[2147483647] cursor-crosshair"
      data-pixzlo-ui="element-highlighter"
      style={{
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
      }}>
      <div
        ref={highlightRef}
        className="bg-blue-500/20 pointer-events-none absolute border-2 border-blue-500"
        style={{ display: "none" }}
      />

      {/* Instruction text */}
      <div className="pointer-events-none fixed left-1/2 top-4 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 shadow-lg backdrop-blur-sm">
        <p className="text-sm font-medium text-gray-700">
          Hover over elements and click to select • Right-click or press Escape
          to cancel
        </p>
      </div>
    </div>
  )
}

export default ElementHighlighter
