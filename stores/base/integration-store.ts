/**
 * Base Integration Store
 *
 * Provides common patterns for integration stores (Linear, Figma).
 * Follows DRY principle by centralizing shared state management logic.
 */

export interface IntegrationStoreState {
  isConnected: boolean
  isLoadingStatus: boolean
  statusError?: string
  isLoadingMetadata: boolean
  metadataError?: string
  metadataLastFetched: number | null
}

export interface IntegrationStoreActions {
  setConnectionStatus: (connected: boolean) => void
  setIsLoadingStatus: (loading: boolean) => void
  setStatusError: (error: string | undefined) => void
  setIsLoadingMetadata: (loading: boolean) => void
  setMetadataError: (error: string | undefined) => void
  isMetadataStale: () => boolean
  reset: () => void
}

/**
 * Default cache duration for metadata (5 minutes)
 */
export const DEFAULT_CACHE_DURATION = 5 * 60 * 1000

/**
 * Creates initial integration store state
 */
export function createInitialIntegrationState(): IntegrationStoreState {
  return {
    isConnected: false,
    isLoadingStatus: false,
    statusError: undefined,
    isLoadingMetadata: false,
    metadataError: undefined,
    metadataLastFetched: null
  }
}

/**
 * Creates common integration store actions
 */
export function createIntegrationStoreActions<T extends IntegrationStoreState>(
  set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void,
  get: () => T,
  cacheDuration: number = DEFAULT_CACHE_DURATION
): Pick<
  IntegrationStoreActions,
  | "setConnectionStatus"
  | "setIsLoadingStatus"
  | "setStatusError"
  | "setIsLoadingMetadata"
  | "setMetadataError"
  | "isMetadataStale"
> {
  return {
    setConnectionStatus: (connected: boolean) =>
      set({ isConnected: connected, statusError: undefined } as Partial<T>),

    setIsLoadingStatus: (loading: boolean) =>
      set({ isLoadingStatus: loading } as Partial<T>),

    setStatusError: (error: string | undefined) =>
      set({ statusError: error } as Partial<T>),

    setIsLoadingMetadata: (loading: boolean) =>
      set({ isLoadingMetadata: loading } as Partial<T>),

    setMetadataError: (error: string | undefined) =>
      set({ metadataError: error } as Partial<T>),

    isMetadataStale: () => {
      const state = get()
      if (!state.metadataLastFetched) return true
      return Date.now() - state.metadataLastFetched > cacheDuration
    }
  }
}

/**
 * Helper to send Chrome message with Promise wrapper
 */
export function sendChromeMessage<T>(
  message: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error:
            chrome.runtime.lastError.message || "Extension communication error"
        })
      } else {
        resolve(response)
      }
    })
  })
}

/**
 * Standard error message handling
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return "An unknown error occurred"
}
