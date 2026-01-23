import { X } from "lucide-react"
import { memo, useEffect } from "react"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  overlayClassName?: string
  closeOnOverlayClick?: boolean
  showCloseButton?: boolean
  zIndex?: number
}

/**
 * Modal component that renders inline within Plasmo's shadow root context
 * This ensures proper layering above the main dialog without DOM issues
 */
const Modal = memo(
  ({
    isOpen,
    onClose,
    children,
    className = "",
    overlayClassName = "",
    closeOnOverlayClick = true,
    showCloseButton = true,
    zIndex = 2147483648 // Higher than main dialog
  }: ModalProps): JSX.Element | null => {
    // Handle escape key
    useEffect(() => {
      if (!isOpen) return

      const handleEscape = (e: KeyboardEvent): void => {
        if (e.key === "Escape") {
          onClose()
        }
      }

      document.addEventListener("keydown", handleEscape)
      return () => document.removeEventListener("keydown", handleEscape)
    }, [isOpen, onClose])

    // NOTE: We intentionally do NOT prevent body scroll here.
    // This extension runs in a shadow DOM and should not manipulate the host page's styles.
    // Blocking body scroll would interfere with the user's ability to interact with the host page
    // (e.g., scrolling, clicking inputs in dialogs on the page).

    if (!isOpen) return null

    const handleOverlayClick = (e: React.MouseEvent): void => {
      if (e.target === e.currentTarget && closeOnOverlayClick) {
        onClose()
      }
    }

    // Render inline - this stays within Plasmo's shadow root automatically
    // Use pointer-events: none on the overlay to allow clicks to pass through to the host page,
    // but pointer-events: auto on the modal content so users can interact with the modal itself.
    return (
      <div
        className={`fixed inset-0 flex h-screen w-screen items-center justify-center p-4 ${overlayClassName}`}
        style={{
          zIndex,
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: "none" // Allow clicks to pass through to the host page
        }}
        data-pixzlo-ui="figma-modal">
        {/* Backdrop - also pointer-events: none to let clicks pass through */}
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          style={{ zIndex: 1, pointerEvents: "none" }}
        />

        {/* Modal Content - enable pointer-events for modal interactions */}
        <div
          className={`relative h-full w-full overflow-auto rounded-lg bg-white shadow-2xl ring-1 ring-black/5 ${className}`}
          style={{ zIndex: 10, minWidth: "400px", pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-gray-500 shadow-sm transition-colors hover:bg-white hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          )}
          {children}
        </div>
      </div>
    )
  }
)

Modal.displayName = "Modal"

export default Modal
