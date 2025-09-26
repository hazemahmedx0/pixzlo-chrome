import { FigmaService } from "@/lib/figma-service"
import type { FigmaAuthError, FigmaAuthStatus } from "@/types/figma"
import { useCallback, useEffect, useState } from "react"

interface UseFigmaAuthReturn {
  authStatus: FigmaAuthStatus | null
  isLoading: boolean
  error: FigmaAuthError | null
  checkAuth: () => Promise<void>
  initiateAuth: () => Promise<void>
  isAuthenticated: boolean
}

/**
 * Hook for managing Figma authentication state
 */
export function useFigmaAuth(): UseFigmaAuthReturn {
  const [authStatus, setAuthStatus] = useState<FigmaAuthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<FigmaAuthError | null>(null)

  const figmaService = FigmaService.getInstance()

  const checkAuth = useCallback(async (): Promise<void> => {
    console.log("🔐 Checking Figma auth status...")
    setIsLoading(true)
    setError(null)

    try {
      const response = await figmaService.checkAuthStatus()
      console.log("🔐 Auth response:", response)

      if (response.success && response.data) {
        console.log(
          "🔐 Auth result:",
          response.data.connected ? "CONNECTED" : "NOT CONNECTED"
        )
        setAuthStatus(response.data)
      } else {
        console.log("🔐 Auth check failed:", response.error)
        setError({
          type: "API_ERROR",
          message: response.error || "Failed to check auth status"
        })
      }
    } catch (err) {
      console.error("🔐 Auth check error:", err)
      setError({
        type: "API_ERROR",
        message: err instanceof Error ? err.message : "Unknown error"
      })
    } finally {
      setIsLoading(false)
    }
  }, [figmaService])

  const initiateAuth = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await figmaService.initiateAuth()

      if (response.success && response.data?.authUrl) {
        // Open OAuth URL in new tab
        window.open(response.data.authUrl, "_blank")
      } else {
        setError({
          type: "AUTH_REQUIRED",
          message: response.error || "Failed to initiate authentication"
        })
      }
    } catch (err) {
      setError({
        type: "AUTH_REQUIRED",
        message: err instanceof Error ? err.message : "Authentication failed"
      })
    } finally {
      setIsLoading(false)
    }
  }, [figmaService])

  // DON'T check auth on mount - only check when explicitly needed
  // useEffect(() => {
  //   checkAuth()
  // }, [])

  const isAuthenticated = Boolean(
    authStatus?.connected && authStatus?.integration?.is_active
  )

  // Minimal debug logging - only when auth status actually changes
  useEffect(() => {
    if (authStatus) {
      console.log("🔐 Auth status changed:", {
        connected: authStatus.connected,
        isAuthenticated
      })
    }
  }, [authStatus?.connected, isAuthenticated])

  return {
    authStatus,
    isLoading,
    error,
    checkAuth,
    initiateAuth,
    isAuthenticated
  }
}
