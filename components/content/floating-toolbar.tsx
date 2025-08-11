import type { FloatingToolbarProps } from "@/types/ui"
import { Bug, Camera, Cursor, Monitor, X } from "phosphor-react"
import { memo } from "react"

const FloatingToolbar = memo(
  ({ onClose, onCapture, activeMode }: FloatingToolbarProps) => {
    return (
      <div
        className="pointer-events-auto fixed bottom-6 left-1/2 z-[2147483647] -translate-x-1/2 rounded-full bg-white/90 shadow-lg ring-1 ring-black/5 backdrop-blur-sm"
        data-pixzlo-ui="floating-toolbar"
        style={{
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
        }}>
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            className="rounded-full p-2 transition-colors hover:bg-black/5"
            title="Pointer"
            aria-label="Pointer mode">
            <Cursor size={18} />
          </button>

          <button
            type="button"
            className={`rounded-full p-2 transition-colors ${
              activeMode === "element"
                ? "bg-blue-600 text-white shadow hover:bg-blue-600/90"
                : "hover:bg-black/5"
            }`}
            title="Element Selection"
            aria-label={
              activeMode === "element" ? "Element mode active" : "Element mode"
            }>
            <Bug
              size={18}
              weight={activeMode === "element" ? "fill" : "regular"}
            />
          </button>

          <button
            type="button"
            className={`rounded-full p-2 transition-colors ${
              activeMode === "area"
                ? "bg-green-600 text-white shadow hover:bg-green-600/90"
                : "hover:bg-black/5"
            }`}
            title="Capture Area"
            aria-label={
              activeMode === "area" ? "Area mode active" : "Area mode"
            }
            onClick={() => onCapture()}>
            <Camera
              size={18}
              weight={activeMode === "area" ? "fill" : "regular"}
            />
          </button>

          <button
            type="button"
            className={`rounded-full p-2 transition-colors ${
              activeMode === "fullscreen"
                ? "bg-purple-600 text-white shadow hover:bg-purple-600/90"
                : "hover:bg-black/5"
            }`}
            title="Capture Full Screen"
            aria-label={
              activeMode === "fullscreen"
                ? "Fullscreen mode active"
                : "Fullscreen mode"
            }
            onClick={() => onCapture()}>
            <Monitor
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
            onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </div>
    )
  }
)

FloatingToolbar.displayName = "FloatingToolbar"

export default FloatingToolbar
