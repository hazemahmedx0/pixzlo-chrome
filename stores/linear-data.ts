import { create } from "zustand"

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

export interface LinearPreference {
  id: string
  lastUsedTeamId: string | null
  lastUsedTeamName: string | null
  lastUsedProjectId: string | null
  lastUsedProjectName: string | null
  updatedAt: string
}

interface LinearDataState {
  // Linear metadata (all options + preference)
  metadata: {
    teams?: LinearTeam[]
    projects?: LinearProject[]
    users?: LinearUser[]
    workflowStates?: LinearWorkflowState[]
    preference?: LinearPreference | null
  }
  isLoadingMetadata: boolean
  metadataError?: string
  metadataLastFetched: number | null

  // Integration status
  isConnected: boolean
  isLoadingStatus: boolean
  statusError?: string

  // Actions
  setMetadata: (data: {
    teams?: LinearTeam[]
    projects?: LinearProject[]
    users?: LinearUser[]
    workflowStates?: LinearWorkflowState[]
    preference?: LinearPreference | null
  }) => void
  setIsLoadingMetadata: (loading: boolean) => void
  setMetadataError: (error: string | undefined) => void
  setConnectionStatus: (connected: boolean) => void
  setIsLoadingStatus: (loading: boolean) => void
  setStatusError: (error: string | undefined) => void
  setStatusDebugHelpers: (helpers: {
    checkStatus: () => Promise<void>
    retryConnection: () => Promise<void>
  }) => void

  // Combined actions
  fetchAllData: () => Promise<void>
  fetchMetadata: () => Promise<void>
  checkStatus: () => Promise<void>
  isMetadataStale: () => boolean
  isStatusStale: () => boolean
  reset: () => void
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
let lastStatusFetchedAt: number | null = null

export const useLinearDataStore = create<LinearDataState>((set, get) => ({
  // Initial state
  metadata: {
    teams: [],
    projects: [],
    users: [],
    workflowStates: [],
    preference: null
  },
  isLoadingMetadata: false,
  metadataError: undefined,
  metadataLastFetched: null,

  isConnected: false,
  isLoadingStatus: false,
  statusError: undefined,

  // Basic setters
  setMetadata: (data) =>
    set({
      metadata: {
        teams: data.teams ?? [],
        projects: data.projects ?? [],
        users: data.users ?? [],
        workflowStates: data.workflowStates ?? [],
        preference: data.preference ?? null
      },
      metadataLastFetched: Date.now(),
      metadataError: undefined
    }),
  setIsLoadingMetadata: (loading) => set({ isLoadingMetadata: loading }),
  setMetadataError: (error) => set({ metadataError: error }),
  setConnectionStatus: (connected) =>
    set({ isConnected: connected, statusError: undefined }),
  setIsLoadingStatus: (loading) => set({ isLoadingStatus: loading }),
  setStatusError: (error) => set({ statusError: error }),
  setStatusDebugHelpers: (helpers) => {
    if (typeof window !== "undefined") {
      ;(window as any).__pixzlo_debug_linear = {
        ...helpers,
        getCurrentState: () => get()
      }
    }
  },

  // Check if metadata is stale
  isMetadataStale: () => {
    const state = get()
    if (!state.metadataLastFetched) return true
    return Date.now() - state.metadataLastFetched > CACHE_DURATION
  },

  isStatusStale: () => {
    if (!lastStatusFetchedAt) return true
    return Date.now() - lastStatusFetchedAt > CACHE_DURATION
  },

  // Fetch Linear integration status (always makes API call when called directly)
  checkStatus: async () => {
    const state = get()
    if (state.isLoadingStatus) return

    set({ isLoadingStatus: true, statusError: undefined })

    try {
      const response = await new Promise<{
        success: boolean
        data?: { connected: boolean; integration?: unknown }
        error?: string
      }>((resolve) => {
        chrome.runtime.sendMessage(
          { type: "linear-check-status" },
          (backgroundResponse) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error:
                  chrome.runtime.lastError.message ||
                  "Extension communication error"
              })
            } else {
              resolve(backgroundResponse)
            }
          }
        )
      })

      if (response.success) {
        set({
          isConnected: response.data?.connected || false,
          isLoadingStatus: false,
          statusError: undefined
        })
        lastStatusFetchedAt = Date.now()
        console.log("✅ Linear status checked and cached")
      } else {
        set({
          isConnected: false,
          isLoadingStatus: false,
          statusError: response.error
        })
        lastStatusFetchedAt = Date.now()
      }
    } catch (error) {
      set({
        isConnected: false,
        isLoadingStatus: false,
        statusError:
          error instanceof Error ? error.message : "Failed to check status"
      })
      lastStatusFetchedAt = Date.now()
    }
  },

  // Fetch aggregated Linear metadata (options + preference)
  fetchMetadata: async () => {
    const state = get()
    if (state.isLoadingMetadata) return

    set({ isLoadingMetadata: true, metadataError: undefined })

    try {
      const response = await new Promise<{
        success: boolean
        data?: {
          teams?: LinearTeam[]
          projects?: LinearProject[]
          users?: LinearUser[]
          workflowStates?: LinearWorkflowState[]
          preference?: LinearPreference | null
        }
        error?: string
      }>((resolve) => {
        chrome.runtime.sendMessage(
          { type: "linear-fetch-metadata" },
          (backgroundResponse) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error:
                  chrome.runtime.lastError.message ||
                  "Extension communication error"
              })
            } else {
              resolve(backgroundResponse)
            }
          }
        )
      })

      if (response.success && response.data) {
        set({
          metadata: {
            teams: response.data.teams ?? [],
            projects: response.data.projects ?? [],
            users: response.data.users ?? [],
            workflowStates: response.data.workflowStates ?? [],
            preference: response.data.preference ?? null
          },
          metadataLastFetched: Date.now(),
          isLoadingMetadata: false,
          metadataError: undefined
        })
      } else {
        set({
          metadata: {
            teams: [],
            projects: [],
            users: [],
            workflowStates: [],
            preference: null
          },
          isLoadingMetadata: false,
          metadataError: response.error || "Failed to fetch Linear metadata"
        })
      }
    } catch (error) {
      set({
        metadata: {
          teams: [],
          projects: [],
          users: [],
          workflowStates: [],
          preference: null
        },
        isLoadingMetadata: false,
        metadataError:
          error instanceof Error
            ? error.message
            : "Failed to fetch Linear metadata"
      })
    }
  },

  // Fetch all Linear data (status + metadata)
  fetchAllData: async () => {
    const state = get()
    // Always check status for freshness when called from dialog
    await state.checkStatus()

    const updatedState = get()
    if (!updatedState.metadataLastFetched || updatedState.isMetadataStale()) {
      await updatedState.fetchMetadata()
    }
  },

  // Reset all data
  reset: () =>
    set({
      metadata: {
        teams: [],
        projects: [],
        users: [],
        workflowStates: [],
        preference: null
      },
      isLoadingMetadata: false,
      metadataError: undefined,
      metadataLastFetched: null,
      isConnected: false,
      isLoadingStatus: false,
      statusError: undefined
    })
}))
