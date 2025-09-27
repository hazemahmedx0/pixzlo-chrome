import { useCallback, useEffect, useState } from "react"

interface LinearTeam {
  id: string
  name: string
  key: string
  description?: string
  color?: string
}

interface LinearProject {
  id: string
  name: string
  description?: string
  state: string
  progress: number
  url: string
}

interface LinearUser {
  id: string
  name: string
  displayName: string
  email?: string
  avatarUrl?: string
  isActive: boolean
}

interface LinearWorkflowState {
  id: string
  name: string
  color: string
  description?: string
  type: string
  position: number
  team?: {
    id: string
    name: string
  }
}

export interface LinearOptionsData {
  teams?: LinearTeam[]
  projects?: LinearProject[]
  users?: LinearUser[]
  workflowStates?: LinearWorkflowState[]
}

interface LinearOptionsState {
  data: LinearOptionsData
  isLoading: boolean
  error?: string
}

export function useLinearOptions(): LinearOptionsState & {
  fetchOptions: () => Promise<void>
  retryFetch: () => Promise<void>
} {
  const [state, setState] = useState<LinearOptionsState>({
    data: {},
    isLoading: false,
    error: undefined
  })

  const fetchOptions = useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: undefined }))

      console.log("📡 Fetching Linear options via background script...")

      // Send message to background script to fetch Linear options
      const response = await new Promise<{
        success: boolean
        data?: LinearOptionsData
        error?: string
      }>((resolve) => {
        chrome.runtime.sendMessage(
          { type: "linear-fetch-options" },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error:
                  chrome.runtime.lastError.message ||
                  "Extension communication error"
              })
            } else {
              resolve(response)
            }
          }
        )
      })

      if (!response.success) {
        setState({
          data: {},
          isLoading: false,
          error: response.error || "Failed to fetch Linear options"
        })
        return
      }

      const data = response.data!
      console.log("🔗 Linear options fetched:", data) // Debug logging

      setState({
        data,
        isLoading: false,
        error: undefined
      })
    } catch (error) {
      console.error("❌ Error fetching Linear options:", error)

      setState({
        data: {},
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Linear options"
      })
    }
  }, [])

  // Retry fetch function for manual refresh
  const retryFetch = useCallback(async (): Promise<void> => {
    console.log("🔄 Manually retrying Linear options fetch...")
    await fetchOptions()
  }, [fetchOptions])

  // Don't auto-fetch on mount - only fetch when explicitly called
  // This prevents unnecessary API calls when the component loads

  return {
    ...state,
    fetchOptions,
    retryFetch
  }
}
