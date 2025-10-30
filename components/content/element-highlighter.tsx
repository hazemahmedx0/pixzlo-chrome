import { useCallback, useEffect, useRef, useState } from "react"

interface ElementHighlighterProps {
  isActive: boolean
  onElementSelect: (element: HTMLElement, rect: DOMRect) => void
  onCancel: () => void
}

interface ElementBoxModel {
  content: DOMRect
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  }
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

const ElementHighlighter = ({
  isActive,
  onElementSelect,
  onCancel
}: ElementHighlighterProps) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const paddingRef = useRef<HTMLDivElement>(null)
  const marginRef = useRef<HTMLDivElement>(null)
  const currentRect = useRef<DOMRect | null>(null)
  const currentElement = useRef<HTMLElement | null>(null)
  const currentBoxModel = useRef<ElementBoxModel | null>(null)

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
      const paddingBox = paddingRef.current
      const marginBox = marginRef.current
      if (!overlay || !highlight || !paddingBox || !marginBox) return

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
        paddingBox.style.display = "none"
        marginBox.style.display = "none"
        currentRect.current = null
        currentElement.current = null
        currentBoxModel.current = null
        return
      }

      const rect = el.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(el)

      // Get padding values
      const padding = {
        top: parseFloat(computedStyle.paddingTop) || 0,
        right: parseFloat(computedStyle.paddingRight) || 0,
        bottom: parseFloat(computedStyle.paddingBottom) || 0,
        left: parseFloat(computedStyle.paddingLeft) || 0
      }

      // Get margin values
      const margin = {
        top: parseFloat(computedStyle.marginTop) || 0,
        right: parseFloat(computedStyle.marginRight) || 0,
        bottom: parseFloat(computedStyle.marginBottom) || 0,
        left: parseFloat(computedStyle.marginLeft) || 0
      }

      const boxModel: ElementBoxModel = {
        content: rect,
        padding,
        margin
      }

      currentRect.current = rect
      currentElement.current = el
      currentBoxModel.current = boxModel

      // Content box with blue overlay and thin border
      highlight.style.display = "block"
      highlight.style.left = `${rect.left}px`
      highlight.style.top = `${rect.top}px`
      highlight.style.width = `${rect.width}px`
      highlight.style.height = `${rect.height}px`

      // Padding box (if element has padding)
      const hasPadding =
        padding.top > 0 ||
        padding.right > 0 ||
        padding.bottom > 0 ||
        padding.left > 0
      if (hasPadding) {
        paddingBox.style.display = "block"
        paddingBox.style.left = `${rect.left - padding.left}px`
        paddingBox.style.top = `${rect.top - padding.top}px`
        paddingBox.style.width = `${rect.width + padding.left + padding.right}px`
        paddingBox.style.height = `${rect.height + padding.top + padding.bottom}px`
      } else {
        paddingBox.style.display = "none"
      }

      // Margin box (if element has margin)
      const hasMargin =
        margin.top > 0 ||
        margin.right > 0 ||
        margin.bottom > 0 ||
        margin.left > 0
      if (hasMargin) {
        marginBox.style.display = "block"
        marginBox.style.left = `${rect.left - padding.left - margin.left}px`
        marginBox.style.top = `${rect.top - padding.top - margin.top}px`
        marginBox.style.width = `${rect.width + padding.left + padding.right + margin.left + margin.right}px`
        marginBox.style.height = `${rect.height + padding.top + padding.bottom + margin.top + margin.bottom}px`
      } else {
        marginBox.style.display = "none"
      }
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
      const paddingBox = paddingRef.current
      const marginBox = marginRef.current
      if (highlightBox) {
        highlightBox.style.display = "none"
      }
      if (paddingBox) {
        paddingBox.style.display = "none"
      }
      if (marginBox) {
        marginBox.style.display = "none"
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
      {/* Margin box - outermost, orange/amber color */}
      <div
        ref={marginRef}
        className="pointer-events-none absolute"
        style={{
          display: "none",
          backgroundColor: "rgba(251, 146, 60, 0.15)",
          border: "0.5px solid rgba(251, 146, 60, 0.6)"
        }}
      />

      {/* Padding box - middle layer, green color */}
      <div
        ref={paddingRef}
        className="pointer-events-none absolute"
        style={{
          display: "none",
          backgroundColor: "rgba(34, 197, 94, 0.15)",
          border: "0.5px solid rgba(34, 197, 94, 0.6)"
        }}
      />

      {/* Content box - innermost, blue overlay with thin border */}
      <div
        ref={highlightRef}
        className="pointer-events-none absolute"
        style={{
          display: "none",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          border: "0.5px solid rgba(59, 130, 246, 0.8)"
        }}
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
