import type { FloatingToolbarProps } from "@/types/ui"
import {
  BugIcon,
  CameraIcon,
  CursorIcon,
  MonitorIcon,
  XIcon
} from "@phosphor-icons/react"
import { memo, useEffect, useRef } from "react"

const FloatingToolbar = memo(
  ({ onClose, onCapture, onModeChange, activeMode }: FloatingToolbarProps) => {
    const toolbarRef = useRef<HTMLDivElement>(null)

    /**
     * Use native event listeners with capture: true to intercept events
     * BEFORE the document-level listeners in ElementHighlighter/SelectionOverlay.
     * This ensures toolbar clicks are not blocked by the selection overlays.
     */
    useEffect(() => {
      const toolbar = toolbarRef.current
      if (!toolbar) return

      const stopPropagation = (e: Event): void => {
        e.stopPropagation()
        e.stopImmediatePropagation()
      }

      // Add listeners in capture phase to intercept before document-level handlers
      toolbar.addEventListener("mousedown", stopPropagation, { capture: true })
      toolbar.addEventListener("mouseup", stopPropagation, { capture: true })
      toolbar.addEventListener("click", stopPropagation, { capture: true })
      toolbar.addEventListener("pointerdown", stopPropagation, {
        capture: true
      })
      toolbar.addEventListener("pointerup", stopPropagation, { capture: true })

      return () => {
        toolbar.removeEventListener("mousedown", stopPropagation, {
          capture: true
        })
        toolbar.removeEventListener("mouseup", stopPropagation, {
          capture: true
        })
        toolbar.removeEventListener("click", stopPropagation, { capture: true })
        toolbar.removeEventListener("pointerdown", stopPropagation, {
          capture: true
        })
        toolbar.removeEventListener("pointerup", stopPropagation, {
          capture: true
        })
      }
    }, [])

    /**
     * Stop all pointer events from propagating to prevent ElementHighlighter
     * and SelectionOverlay from capturing them. This ensures toolbar buttons
     * remain clickable during selection mode.
     */
    const stopEventPropagation = (e: React.SyntheticEvent): void => {
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
    }

    return (
      <div
        className="pointer-events-auto fixed bottom-6 left-1/2 z-[2147483648] -translate-x-1/2 rounded-full bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur-sm"
        data-pixzlo-ui="floating-toolbar"
        // Prevent selection overlays from capturing toolbar events
        onMouseDown={stopEventPropagation}
        onMouseUp={stopEventPropagation}
        onPointerDown={stopEventPropagation}
        onPointerUp={stopEventPropagation}
        onClick={stopEventPropagation}
        style={{
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
          pointerEvents: "auto"
        }}>
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ pointerEvents: "auto" }}>
          <button
            type="button"
            className={`rounded-full p-2 transition-colors ${
              activeMode === "pointer"
                ? "hover:bg-gray-600/90 bg-gray-600 text-white shadow"
                : "hover:bg-black/5"
            }`}
            title="Pointer"
            aria-label={
              activeMode === "pointer" ? "Pointer mode active" : "Pointer mode"
            }
            onClick={(e) => {
              e.stopPropagation()
              window.dispatchEvent(new Event("pixzlo-toolbar-click"))
              onModeChange("pointer")
            }}>
            <CursorIcon
              size={18}
              weight={activeMode === "pointer" ? "fill" : "regular"}
            />
          </button>

          <button
            type="button"
            className={`rounded-full p-2 transition-colors ${
              activeMode === "element"
                ? "hover:bg-blue-600/90 bg-blue-600 text-white shadow"
                : "hover:bg-black/5"
            }`}
            title="Element Selection"
            aria-label={
              activeMode === "element" ? "Element mode active" : "Element mode"
            }
            onClick={(e) => {
              e.stopPropagation()
              window.dispatchEvent(new Event("pixzlo-toolbar-click"))
              onModeChange("element")
            }}>
            <BugIcon
              size={18}
              weight={activeMode === "element" ? "fill" : "regular"}
            />
          </button>

          <button
            type="button"
            className={`rounded-full p-2 transition-colors ${
              activeMode === "area"
                ? "hover:bg-green-600/90 bg-green-600 text-white shadow"
                : "hover:bg-black/5"
            }`}
            title="Capture Area"
            aria-label={
              activeMode === "area" ? "Area mode active" : "Area mode"
            }
            onClick={(e) => {
              e.stopPropagation()
              window.dispatchEvent(new Event("pixzlo-toolbar-click"))
              if (activeMode === "area") {
                onCapture()
              } else {
                onModeChange("area")
              }
            }}>
            <CameraIcon
              size={18}
              weight={activeMode === "area" ? "fill" : "regular"}
            />
          </button>

          <button
            type="button"
            className={`rounded-full p-2 transition-colors ${
              activeMode === "fullscreen"
                ? "hover:bg-purple-600/90 bg-purple-600 text-white shadow"
                : "hover:bg-black/5"
            }`}
            title="Capture Full Screen"
            aria-label={
              activeMode === "fullscreen"
                ? "Fullscreen mode active"
                : "Fullscreen mode"
            }
            onClick={(e) => {
              e.stopPropagation()
              window.dispatchEvent(new Event("pixzlo-toolbar-click"))
              if (activeMode === "fullscreen") {
                onCapture()
              } else {
                onModeChange("fullscreen")
              }
            }}>
            <MonitorIcon
              size={18}
              weight={activeMode === "fullscreen" ? "fill" : "regular"}
            />
          </button>

          <div className="mx-1 h-6 w-px bg-gray-300" />

          <button
            type="button"
            className="rounded-full p-2 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Close"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation()
              window.dispatchEvent(new Event("pixzlo-toolbar-click"))
              onClose()
            }}>
            <XIcon size={18} />
          </button>
        </div>
      </div>
    )
  }
)

FloatingToolbar.displayName = "FloatingToolbar"

export default FloatingToolbar
