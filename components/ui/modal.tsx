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

    // Prevent body scroll when modal is open (only if this is the primary modal)
    useEffect(() => {
      if (isOpen && zIndex <= 2147483648) {
        document.body.style.overflow = "hidden"
      } else if (!isOpen && zIndex <= 2147483648) {
        document.body.style.overflow = ""
      }

      return () => {
        if (zIndex <= 2147483648) {
          document.body.style.overflow = ""
        }
      }
    }, [isOpen, zIndex])

    if (!isOpen) return null

    const handleOverlayClick = (e: React.MouseEvent): void => {
      if (e.target === e.currentTarget && closeOnOverlayClick) {
        onClose()
      }
    }

    console.log("🎯 Modal rendering inline (not portal)")

    // Render inline - this stays within Plasmo's shadow root automatically
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
          pointerEvents: "auto"
        }}
        onClick={handleOverlayClick}
        data-pixzlo-ui="figma-modal">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          style={{ zIndex: 1 }}
        />

        {/* Modal Content */}
        <div
          className={`relative h-full w-full overflow-auto rounded-lg bg-white shadow-2xl ring-1 ring-black/5 ${className}`}
          style={{ zIndex: 10, minWidth: "400px" }}
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
