import { FigmaService } from "@/lib/figma-service"
import type { FigmaAuthStatus, FigmaDesignLink } from "@/types/figma"
import { create } from "zustand"

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
  metadata: FigmaMetadata
  isLoadingMetadata: boolean
  metadataError?: string
  metadataLastFetched: number | null

  isConnected: boolean
  isLoadingStatus: boolean
  statusError?: string

  fetchMetadata: (
    websiteUrl?: string,
    options?: { force?: boolean }
  ) => Promise<void>
  refreshMetadata: (
    websiteUrl?: string,
    options?: { force?: boolean }
  ) => Promise<void>
  getAccessToken: () => string | undefined
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
  setStatus: (status: FigmaAuthStatus | null) => void
  setMetadata: (metadata: FigmaMetadata) => void
  reset: () => void
}

const CACHE_DURATION = 5 * 60 * 1000

const emptyMetadata: FigmaMetadata = {
  integration: undefined,
  token: undefined,
  website: undefined,
  designLinks: [],
  preference: undefined
}

export const useFigmaDataStore = create<FigmaDataState>((set, get) => ({
  metadata: emptyMetadata,
  isLoadingMetadata: false,
  metadataError: undefined,
  metadataLastFetched: undefined,

  isConnected: false,
  isLoadingStatus: false,
  statusError: undefined,

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

  fetchMetadata: async (websiteUrl?: string, options?: { force?: boolean }) => {
    const state = get()
    if (state.isLoadingMetadata) {
      return
    }

    const urlToUse = websiteUrl ?? window.location.href

    // Check if we already have fresh data for this URL
    if (
      !options?.force &&
      state.metadataLastFetched &&
      Date.now() - state.metadataLastFetched < CACHE_DURATION &&
      state.metadata.website?.url === urlToUse
    ) {
      console.log("📋 Using cached Figma metadata for:", urlToUse)
      return
    }

    set({ isLoadingMetadata: true, metadataError: undefined })

    try {
      const service = FigmaService.getInstance()
      const response = await service.getMetadata(urlToUse, {
        force: Boolean(options?.force)
      })

      if (!response.success || !response.data) {
        set({
          metadata: emptyMetadata,
          isLoadingMetadata: false,
          metadataError: response.error || "Failed to fetch Figma metadata",
          metadataLastFetched: null,
          isConnected: false
        })
        return
      }

      const normalizedDesignLinks =
        response.data.designLinks?.map((link) => ({
          ...link,
          figma_frame_id: link.figma_frame_id
        })) ?? []

      set({
        metadata: {
          ...response.data,
          designLinks: normalizedDesignLinks
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
        metadata: emptyMetadata,
        isLoadingMetadata: false,
        metadataError:
          error instanceof Error
            ? error.message
            : "Failed to fetch Figma metadata",
        metadataLastFetched: null,
        isConnected: false
      })
    }
  },

  refreshMetadata: async (websiteUrl?: string, options?: { force?: boolean }) => {
    // Clear both store + service caches; otherwise we can keep showing stale auth
    // state until a full page refresh.
    FigmaService.getInstance().clearMetadataCache()
    set({ metadataLastFetched: null })
    await get().fetchMetadata(websiteUrl, { force: Boolean(options?.force) })
  },

  getAccessToken: () => {
    return get().metadata.token?.accessToken
  },

  updatePreference: async (update) => {
    const service = FigmaService.getInstance()
    const response = await service.updatePreference(update)

    if (!response.success || !response.data) {
      set({
        metadataError: response.error || "Failed to update Figma preference",
        metadata: emptyMetadata,
        metadataLastFetched: null,
        isConnected: false
      })
      return
    }

    const normalizedDesignLinks =
      response.data.designLinks?.map((link) => ({
        ...link,
        figma_frame_id: link.figma_frame_id
      })) ?? []

    set({
      metadata: {
        ...response.data,
        designLinks: normalizedDesignLinks
      },
      metadataLastFetched: Date.now(),
      metadataError: undefined,
      isConnected: Boolean(response.data.integration?.is_active)
    })
  },

  createDesignLink: async (link) => {
    const service = FigmaService.getInstance()
    const response = await service.createDesignLink(link)

    if (!response.success || !response.data) {
      set({ metadataError: response.error || "Failed to create design link" })
      return false
    }

    // Refresh with current full URL to get the design links for this specific page
    await get().refreshMetadata(window.location.href, { force: true })
    return true
  },

  deleteDesignLink: async (linkId) => {
    const service = FigmaService.getInstance()
    const response = await service.deleteDesignLink(linkId)

    if (!response.success) {
      set({ metadataError: response.error || "Failed to delete design link" })
      return false
    }

    // Refresh with current full URL to update the design links for this specific page
    await get().refreshMetadata(window.location.href, { force: true })
    return true
  },

  reset: () =>
    set({
      metadata: emptyMetadata,
      isLoadingMetadata: false,
      metadataError: undefined,
      metadataLastFetched: null,
      isConnected: false,
      isLoadingStatus: false,
      statusError: undefined
    })
}))
