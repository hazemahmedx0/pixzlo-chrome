import { useFigmaDataStore } from "@/stores/figma-data"
import type { FigmaAuthStatus } from "@/types/figma"
import { useCallback } from "react"

type FigmaDataState = ReturnType<typeof useFigmaDataStore.getState>

interface UseFigmaAuthReturn {
  authStatus: FigmaAuthStatus | undefined
  isLoading: boolean
  error: string | undefined
  checkAuth: () => Promise<void>
  initiateAuth: () => Promise<void>
  isAuthenticated: boolean
  metadata: FigmaDataState["metadata"]
  isLoadingMetadata: boolean
  fetchMetadata: (websiteUrl?: string) => Promise<void>
}

export function useFigmaAuth(): UseFigmaAuthReturn {
  const {
    metadata,
    isLoadingStatus,
    isLoadingMetadata,
    isConnected,
    refreshMetadata,
    fetchMetadata,
    metadataError
  } = useFigmaDataStore()

  const checkAuth = useCallback(async (): Promise<void> => {
    // Force refresh to avoid stale cached status when auth state changes externally
    await refreshMetadata()
  }, [refreshMetadata])

  const initiateAuth = useCallback(async (): Promise<void> => {
    await refreshMetadata()
  }, [refreshMetadata])

  const authStatus: FigmaAuthStatus | undefined = metadata.integration
    ? {
        connected: Boolean(metadata.integration.is_active),
        integration: metadata.integration
      }
    : { connected: false }

  const isAuthenticated = isConnected

  return {
    authStatus,
    isLoading: isLoadingMetadata || isLoadingStatus,
    error: metadataError,
    checkAuth,
    initiateAuth,
    isAuthenticated,
    metadata,
    isLoadingMetadata,
    fetchMetadata
  }
}
