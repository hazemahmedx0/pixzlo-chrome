"use client"

import { CheckCircle, X, XCircle } from "lucide-react"
import * as React from "react"
import { create } from "zustand"

// Font family matching the extension's design system
const FONT_FAMILY =
  'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'

// Toast store for managing toasts within shadow root
interface Toast {
  id: string
  type: "success" | "error" | "info"
  title: string
  description?: string
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: `toast-${Date.now()}-${Math.random()}` }
      ]
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
}))

// Custom toast function to use instead of sonner's toast
export const toast = {
  success: (title: string, options?: { description?: string }): void => {
    useToastStore.getState().addToast({
      type: "success",
      title,
      description: options?.description
    })
  },
  error: (title: string, options?: { description?: string }): void => {
    useToastStore.getState().addToast({
      type: "error",
      title,
      description: options?.description
    })
  },
  info: (title: string, options?: { description?: string }): void => {
    useToastStore.getState().addToast({
      type: "info",
      title,
      description: options?.description
    })
  }
}

// Toast component that renders within shadow root
const ToastItem = ({
  toast: t,
  onClose
}: {
  toast: Toast
  onClose: () => void
}): JSX.Element => {
  const [isExiting, setIsExiting] = React.useState(false)

  const handleClose = React.useCallback(() => {
    setIsExiting(true)
    // Wait for animation to complete before removing
    setTimeout(() => {
      onClose()
    }, 200)
  }, [onClose])

  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [handleClose])

  const borderColor =
    t.type === "success"
      ? "rgb(1, 202, 69)" // --color-green-500
      : t.type === "error"
        ? "rgb(253, 43, 56)" // --color-red-500
        : "rgb(220, 220, 220)" // --color-gray-150

  const iconColor =
    t.type === "success"
      ? "rgb(1, 202, 69)"
      : t.type === "error"
        ? "rgb(253, 43, 56)"
        : "rgb(115, 115, 115)"

  return (
    <div
      style={{
        fontFamily: FONT_FAMILY,
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 16px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderRadius: "12px",
        border: `1px solid ${borderColor}`,
        boxShadow:
          "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.06) 0px 0px 0px 1px, rgba(0, 0, 0, 0.06) 0px 1px 1px -0.5px, rgba(0, 0, 0, 0.06) 0px 3px 3px -1.5px, rgba(0, 0, 0, 0.06) 0px 6px 6px -3px",
        maxWidth: "360px",
        width: "100%",
        pointerEvents: "auto",
        animation: isExiting
          ? "toast-slide-out 0.2s ease-in forwards"
          : "toast-slide-in 0.3s ease-out"
      }}>
      {t.type === "success" && (
        <CheckCircle
          style={{
            width: "20px",
            height: "20px",
            flexShrink: 0,
            color: iconColor
          }}
        />
      )}
      {t.type === "error" && (
        <XCircle
          style={{
            width: "20px",
            height: "20px",
            flexShrink: 0,
            color: iconColor
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: 500,
            lineHeight: 1.4,
            letterSpacing: "-0.006em",
            color: "rgb(34, 34, 34)" // --color-gray-850
          }}>
          {t.title}
        </p>
        {t.description && (
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: "13px",
              fontWeight: 400,
              lineHeight: 1.5,
              color: "rgb(115, 115, 115)" // --color-gray-500
            }}>
            {t.description}
          </p>
        )}
      </div>
      <button
        onClick={handleClose}
        style={{
          flexShrink: 0,
          padding: "4px",
          borderRadius: "6px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "rgb(145, 145, 145)", // --color-gray-400
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background-color 0.15s, color 0.15s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgb(235, 235, 235)"
          e.currentTarget.style.color = "rgb(69, 69, 69)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
          e.currentTarget.style.color = "rgb(145, 145, 145)"
        }}>
        <X style={{ width: "16px", height: "16px" }} />
      </button>
      <style>{`
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes toast-slide-out {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
        }
      `}</style>
    </div>
  )
}

const Toaster = (): JSX.Element | null => {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: "fixed",
        top: "24px",
        left: 0,
        right: 0,
        zIndex: 2147483650,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "0 16px",
        pointerEvents: "none",
        fontFamily: FONT_FAMILY
      }}
      data-pixzlo-ui="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  )
}

export { Toaster }
