import type { FloatingToolbarProps } from "@/types/ui"
import {
  BugIcon,
  CameraIcon,
  CursorIcon,
  MonitorIcon,
  XIcon
} from "@phosphor-icons/react"
import { memo, useRef } from "react"

const FloatingToolbar = memo(
  ({ onClose, onCapture, onModeChange, activeMode }: FloatingToolbarProps) => {
    const toolbarRef = useRef<HTMLDivElement>(null)

    /**
     * Stop all pointer events from propagating to prevent ElementHighlighter
     * and SelectionOverlay from capturing them. This ensures toolbar buttons
     * remain clickable during selection mode.
     */
    const stopEventPropagation = (e: React.SyntheticEvent): void => {
      e.stopPropagation()
    }

    return (
      <div
        ref={toolbarRef}
        className="pointer-events-auto fixed bottom-6 left-1/2 z-[2147483648] -translate-x-1/2 rounded-[13px] bg-white"
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
          // Ensure icon order is stable even on RTL pages
          direction: "ltr",
          pointerEvents: "auto",
          boxShadow:
            "0 3px 5.9px -1.5px rgba(0, 0, 0, 0.05), 0 1px 2.1px 0 rgba(0, 0, 0, 0.05), 0 0 0 0.5px rgba(0, 0, 0, 0.18)"
        }}>
        <div
          className="flex items-center gap-1 p-2"
          style={{ pointerEvents: "auto" }}>
          {/* Cursor/Pointer mode */}
          <button
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              activeMode === "pointer"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:bg-gray-100"
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
              size={20}
              weight={activeMode === "pointer" ? "fill" : "regular"}
            />
          </button>

          {/* Element Selection mode */}
          <button
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              activeMode === "element"
                ? "bg-blue-100 text-blue-600"
                : "text-gray-600 hover:bg-gray-100"
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
              size={20}
              weight={activeMode === "element" ? "fill" : "regular"}
            />
          </button>

          {/* Capture Area mode */}
          <button
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              activeMode === "area"
                ? "bg-blue-100 text-blue-600"
                : "text-gray-600 hover:bg-gray-100"
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
              size={20}
              weight={activeMode === "area" ? "fill" : "regular"}
            />
          </button>

          {/* Fullscreen capture mode */}
          <button
            type="button"
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              activeMode === "fullscreen"
                ? "bg-blue-100 text-blue-600"
                : "text-gray-600 hover:bg-gray-100"
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
              size={20}
              weight={activeMode === "fullscreen" ? "fill" : "regular"}
            />
          </button>

          <div className="mx-1 h-6 w-px bg-gray-200" aria-hidden="true" />

          {/* Close button */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Close"
            aria-label="Close"
            onClick={(e) => {
              e.stopPropagation()
              window.dispatchEvent(new Event("pixzlo-toolbar-click"))
              onClose()
            }}>
            <XIcon size={20} />
          </button>
        </div>
      </div>
    )
  }
)

FloatingToolbar.displayName = "FloatingToolbar"

export default FloatingToolbar
