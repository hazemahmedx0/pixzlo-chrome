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

  const hitTestAndHighlight = useCallback(
    (clientX: number, clientY: number) => {
      const overlay = overlayRef.current
      const highlight = highlightRef.current
      if (!overlay || !highlight) return

      // Temporarily disable hit testing for both the overlay and its host element
      overlay.style.pointerEvents = "none"
      const rootNode = overlay.getRootNode()
      const hostEl = (
        rootNode instanceof ShadowRoot ? rootNode.host : null
      ) as HTMLElement | null
      const hostPrevPointer = hostEl?.style.pointerEvents
      if (hostEl) hostEl.style.pointerEvents = "none"

      const el = document.elementFromPoint(
        clientX,
        clientY
      ) as HTMLElement | null

      // Restore pointer events immediately after hit test
      overlay.style.pointerEvents = "auto"
      if (hostEl) hostEl.style.pointerEvents = hostPrevPointer ?? ""

      if (!el || el === overlay) {
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

      console.log("🖱️ Element clicked, calling onElementSelect with:", element)
      onElementSelect(element, rect)
    },
    [isActive, onElementSelect]
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
        className="pointer-events-none absolute border-2 border-blue-500 bg-blue-500/20"
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
