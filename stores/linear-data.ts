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
  checkStatus: (force?: boolean) => Promise<void>
  isMetadataStale: () => boolean
  isStatusStale: () => boolean
  reset: () => void
  resetStatusCache: () => void
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const WORKSPACE_STORAGE_KEY = "pixzlo_selected_workspace_id"
let lastStatusFetchedAt: number | null = null
let lastStatusWorkspaceId: string | null = null // Track which workspace the status is for

// Helper to get current workspace ID from storage
async function getCurrentWorkspaceId(): Promise<string | null> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const result = await chrome.storage.local.get(WORKSPACE_STORAGE_KEY)
      return (result[WORKSPACE_STORAGE_KEY] as string) ?? null
    }
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(WORKSPACE_STORAGE_KEY)
    }
    return null
  } catch {
    return null
  }
}

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

  // Reset status cache (call when workspace changes)
  resetStatusCache: () => {
    lastStatusFetchedAt = null
    lastStatusWorkspaceId = null
    set({ isConnected: false, statusError: undefined })
  },

  // Fetch Linear integration status (always makes API call when called directly)
  checkStatus: async (force = false) => {
    const state = get()
    if (state.isLoadingStatus) return

    // Get current workspace ID to detect workspace changes
    const currentWorkspaceId = await getCurrentWorkspaceId()

    // Auto-force refresh if workspace changed
    const workspaceChanged =
      currentWorkspaceId !== null &&
      lastStatusWorkspaceId !== null &&
      currentWorkspaceId !== lastStatusWorkspaceId

    if (workspaceChanged) {
      console.log(
        "🔄 Workspace changed from",
        lastStatusWorkspaceId,
        "to",
        currentWorkspaceId,
        "- forcing Linear status refresh"
      )
    }

    // If force is true OR workspace changed, reset the cache
    if (force || workspaceChanged) {
      lastStatusFetchedAt = null
      lastStatusWorkspaceId = null
      // Also reset metadata when workspace changes
      if (workspaceChanged) {
        set({
          metadata: {
            teams: [],
            projects: [],
            users: [],
            workflowStates: [],
            preference: null
          },
          metadataLastFetched: null
        })
      }
    }

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
        lastStatusWorkspaceId = currentWorkspaceId // Track which workspace this status is for
        console.log(
          "✅ Linear status checked and cached for workspace:",
          currentWorkspaceId
        )
      } else {
        set({
          isConnected: false,
          isLoadingStatus: false,
          statusError: response.error
        })
        lastStatusFetchedAt = Date.now()
        lastStatusWorkspaceId = currentWorkspaceId
      }
    } catch (error) {
      set({
        isConnected: false,
        isLoadingStatus: false,
        statusError:
          error instanceof Error ? error.message : "Failed to check status"
      })
      lastStatusFetchedAt = Date.now()
      lastStatusWorkspaceId = currentWorkspaceId
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

// Listen for workspace changes from popup (chrome.storage.onChanged)
// This ensures the content script resets its cache when the user switches workspaces
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[WORKSPACE_STORAGE_KEY]) {
      const oldValue = changes[WORKSPACE_STORAGE_KEY].oldValue as
        | string
        | undefined
      const newValue = changes[WORKSPACE_STORAGE_KEY].newValue as
        | string
        | undefined

      if (oldValue !== newValue && newValue) {
        console.log(
          "🔄 [LinearDataStore] Workspace changed via storage:",
          oldValue,
          "→",
          newValue
        )
        // Reset the cache so next checkStatus will fetch fresh data for the new workspace
        lastStatusFetchedAt = null
        lastStatusWorkspaceId = null
        // Also reset the store state
        useLinearDataStore.getState().resetStatusCache()
      }
    }
  })
}
