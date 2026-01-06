/**
 * Figma Data Store
 *
 * Manages Figma integration state including authentication, design links,
 * and user preferences.
 *
 * Uses shared base integration store patterns for consistency with Linear store.
 */

import { FigmaService } from "@/lib/figma-service"
import type { FigmaAuthStatus, FigmaDesignLink } from "@/types/figma"
import { create } from "zustand"

import { DEFAULT_CACHE_DURATION, extractErrorMessage } from "./base/integration-store"

// Type definitions
interface FigmaPreference {
  id: string
  lastUsedFrameId: string
  lastUsedFrameName: string | null
  lastUsedFileId: string
  frameUrl: string | null
  frameImageUrl: string | null
  updatedAt: string
}

interface FigmaMetadata {
  integration: FigmaAuthStatus["integration"] | null
  token: {
    accessToken?: string
    expiresAt?: string | null
    status: "valid" | "missing" | "expired" | "invalid"
    error?: string
  } | null
  website: { domain: string; url: string; id: string | null } | null
  designLinks: FigmaDesignLink[]
  preference: FigmaPreference | null
}

interface FigmaDataState {
  // Figma metadata
  metadata: FigmaMetadata

  // Loading and error states
  isLoadingMetadata: boolean
  metadataError?: string
  metadataLastFetched: number | null

  // Integration status
  isConnected: boolean
  isLoadingStatus: boolean
  statusError?: string

  // Actions - Fetching
  fetchMetadata: (websiteUrl?: string) => Promise<void>
  refreshMetadata: (websiteUrl?: string) => Promise<void>

  // Actions - Helpers
  getAccessToken: () => string | undefined
  isMetadataStale: () => boolean

  // Actions - Updates
  updatePreference: (update: {
    websiteUrl: string
    frameId: string
    frameName?: string
    fileId?: string
    frameUrl?: string
    frameImageUrl?: string
  }) => Promise<void>
  createDesignLink: (link: {
    figma_file_id: string
    figma_frame_id: string
    frame_name?: string
    frame_url: string
    thumbnail_url?: string
  }) => Promise<boolean>
  deleteDesignLink: (linkId: string) => Promise<boolean>

  // Actions - Setters
  setStatus: (status: FigmaAuthStatus | null) => void
  setMetadata: (metadata: FigmaMetadata) => void
  reset: () => void
}

// Initial empty metadata
const emptyMetadata: FigmaMetadata = {
  integration: null,
  token: null,
  website: null,
  designLinks: [],
  preference: null
}

/**
 * Helper to normalize design links from API response
 */
const normalizeDesignLinks = (links?: FigmaDesignLink[]): FigmaDesignLink[] =>
  links?.map((link) => ({
    ...link,
    figma_frame_id: link.figma_frame_id
  })) ?? []

export const useFigmaDataStore = create<FigmaDataState>((set, get) => ({
  // Initial state
  metadata: { ...emptyMetadata },
  isLoadingMetadata: false,
  metadataError: undefined,
  metadataLastFetched: null,
  isConnected: false,
  isLoadingStatus: false,
  statusError: undefined,

  // Setters
  setStatus: (status) =>
    set({
      isConnected: Boolean(status?.connected && status.integration?.is_active),
      statusError: undefined,
      isLoadingStatus: false,
      metadata: {
        ...get().metadata,
        integration: status?.integration ?? null
      }
    }),

  setMetadata: (metadata) =>
    set({
      metadata,
      metadataLastFetched: Date.now(),
      metadataError: undefined,
      isConnected: Boolean(metadata.integration?.is_active),
      isLoadingMetadata: false,
      isLoadingStatus: false
    }),

  // Check if metadata is stale
  isMetadataStale: () => {
    const state = get()
    if (!state.metadataLastFetched) return true
    return Date.now() - state.metadataLastFetched > DEFAULT_CACHE_DURATION
  },

  // Fetch Figma metadata
  fetchMetadata: async (websiteUrl?: string) => {
    const state = get()
    if (state.isLoadingMetadata) return

    const urlToUse = websiteUrl ?? window.location.href

    // Check if we already have fresh data for this URL
    if (
      state.metadataLastFetched &&
      Date.now() - state.metadataLastFetched < DEFAULT_CACHE_DURATION &&
      state.metadata.website?.url === urlToUse
    ) {
      console.log("📋 Using cached Figma metadata for:", urlToUse)
      return
    }

    set({ isLoadingMetadata: true, metadataError: undefined })

    try {
      const service = FigmaService.getInstance()
      const response = await service.getMetadata(urlToUse)

      if (!response.success || !response.data) {
        set({
          metadata: { ...emptyMetadata },
          isLoadingMetadata: false,
          metadataError: response.error || "Failed to fetch Figma metadata",
          metadataLastFetched: null,
          isConnected: false
        })
        return
      }

      set({
        metadata: {
          ...response.data,
          designLinks: normalizeDesignLinks(response.data.designLinks)
        },
        isLoadingMetadata: false,
        metadataError: undefined,
        metadataLastFetched: Date.now(),
        isConnected: Boolean(response.data.integration?.is_active),
        isLoadingStatus: false
      })
      console.log("✅ Figma metadata fetched and cached for:", urlToUse)
    } catch (error) {
      console.error("❌ Error fetching Figma metadata:", error)
      set({
        metadata: { ...emptyMetadata },
        isLoadingMetadata: false,
        metadataError: extractErrorMessage(error),
        metadataLastFetched: null,
        isConnected: false
      })
    }
  },

  refreshMetadata: async (websiteUrl?: string) => {
    set({ metadataLastFetched: null })
    await get().fetchMetadata(websiteUrl)
  },

  getAccessToken: () => {
    return get().metadata.token?.accessToken
  },

  // Update Figma preference
  updatePreference: async (update) => {
    const service = FigmaService.getInstance()
    const response = await service.updatePreference(update)

    if (!response.success || !response.data) {
      set({
        metadataError: response.error || "Failed to update Figma preference",
        metadata: { ...emptyMetadata },
        metadataLastFetched: null,
        isConnected: false
      })
      return
    }

    set({
      metadata: {
        ...response.data,
        designLinks: normalizeDesignLinks(response.data.designLinks)
      },
      metadataLastFetched: Date.now(),
      metadataError: undefined,
      isConnected: Boolean(response.data.integration?.is_active)
    })
  },

  // Create a new design link
  createDesignLink: async (link) => {
    const service = FigmaService.getInstance()
    const response = await service.createDesignLink(link)

    if (!response.success || !response.data) {
      set({ metadataError: response.error || "Failed to create design link" })
      return false
    }

    await get().refreshMetadata()
    return true
  },

  // Delete a design link
  deleteDesignLink: async (linkId) => {
    const service = FigmaService.getInstance()
    const response = await service.deleteDesignLink(linkId)

    if (!response.success) {
      set({ metadataError: response.error || "Failed to delete design link" })
      return false
    }

    await get().refreshMetadata()
    return true
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
