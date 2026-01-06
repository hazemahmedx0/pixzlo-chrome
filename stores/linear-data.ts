/**
 * Linear Data Store
 *
 * Manages Linear integration state including teams, projects, users,
 * workflow states, and user preferences.
 *
 * Uses shared base integration store patterns for consistency with Figma store.
 */

import { create } from "zustand"

import {
  DEFAULT_CACHE_DURATION,
  extractErrorMessage,
  sendChromeMessage
} from "./base/integration-store"

// Type definitions
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

interface LinearMetadata {
  teams: LinearTeam[]
  projects: LinearProject[]
  users: LinearUser[]
  workflowStates: LinearWorkflowState[]
  preference: LinearPreference | null
}

interface LinearDataState {
  // Linear metadata (all options + preference)
  metadata: LinearMetadata

  // Loading and error states
  isLoadingMetadata: boolean
  metadataError?: string
  metadataLastFetched: number | null

  // Integration status
  isConnected: boolean
  isLoadingStatus: boolean
  statusError?: string

  // Actions - Setters
  setMetadata: (data: Partial<LinearMetadata>) => void
  setIsLoadingMetadata: (loading: boolean) => void
  setMetadataError: (error: string | undefined) => void
  setConnectionStatus: (connected: boolean) => void
  setIsLoadingStatus: (loading: boolean) => void
  setStatusError: (error: string | undefined) => void
  setStatusDebugHelpers: (helpers: {
    checkStatus: () => Promise<void>
    retryConnection: () => Promise<void>
  }) => void

  // Actions - Fetching
  fetchAllData: () => Promise<void>
  fetchMetadata: () => Promise<void>
  checkStatus: () => Promise<void>

  // Actions - Helpers
  isMetadataStale: () => boolean
  isStatusStale: () => boolean
  reset: () => void
}

// Module-level state for status tracking
let lastStatusFetchedAt: number | null = null

// Initial empty metadata
const emptyMetadata: LinearMetadata = {
  teams: [],
  projects: [],
  users: [],
  workflowStates: [],
  preference: null
}

export const useLinearDataStore = create<LinearDataState>((set, get) => ({
  // Initial state
  metadata: { ...emptyMetadata },
  isLoadingMetadata: false,
  metadataError: undefined,
  metadataLastFetched: null,
  isConnected: false,
  isLoadingStatus: false,
  statusError: undefined,

  // Setters
  setMetadata: (data) =>
    set({
      metadata: {
        teams: data.teams ?? get().metadata.teams,
        projects: data.projects ?? get().metadata.projects,
        users: data.users ?? get().metadata.users,
        workflowStates: data.workflowStates ?? get().metadata.workflowStates,
        preference: data.preference !== undefined ? data.preference : get().metadata.preference
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
    return Date.now() - state.metadataLastFetched > DEFAULT_CACHE_DURATION
  },

  isStatusStale: () => {
    if (!lastStatusFetchedAt) return true
    return Date.now() - lastStatusFetchedAt > DEFAULT_CACHE_DURATION
  },

  // Check Linear integration status
  checkStatus: async () => {
    const state = get()
    if (state.isLoadingStatus) return

    set({ isLoadingStatus: true, statusError: undefined })

    try {
      const response = await sendChromeMessage<{
        connected: boolean
        integration?: unknown
      }>({ type: "linear-check-status" })

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
        statusError: extractErrorMessage(error)
      })
      lastStatusFetchedAt = Date.now()
    }
  },

  // Fetch Linear metadata (teams, projects, users, workflow states, preference)
  fetchMetadata: async () => {
    const state = get()
    if (state.isLoadingMetadata) return

    set({ isLoadingMetadata: true, metadataError: undefined })

    try {
      const response = await sendChromeMessage<LinearMetadata>({
        type: "linear-fetch-metadata"
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
          metadata: { ...emptyMetadata },
          isLoadingMetadata: false,
          metadataError: response.error || "Failed to fetch Linear metadata"
        })
      }
    } catch (error) {
      set({
        metadata: { ...emptyMetadata },
        isLoadingMetadata: false,
        metadataError: extractErrorMessage(error)
      })
    }
  },

  // Fetch all Linear data (status + metadata)
  fetchAllData: async () => {
    const state = get()
    await state.checkStatus()

    const updatedState = get()
    if (!updatedState.metadataLastFetched || updatedState.isMetadataStale()) {
      await updatedState.fetchMetadata()
    }
  },

  // Reset all data
  reset: () =>
    set({
      metadata: { ...emptyMetadata },
      isLoadingMetadata: false,
      metadataError: undefined,
      metadataLastFetched: null,
      isConnected: false,
      isLoadingStatus: false,
      statusError: undefined
    })
}))
