import { useFigmaDataStore } from "@/stores/figma-data"
import { useCallback, useMemo } from "react"

interface FigmaPreference {
  id: string
  lastUsedFrameId: string
  lastUsedFrameName: string | null
  lastUsedFileId: string
  frameUrl: string | null
  frameImageUrl: string | null
  updatedAt: string
}

interface FigmaPreferenceUpdate {
  websiteUrl: string
  frameId: string
  frameName?: string
  fileId?: string
  frameUrl?: string
  frameImageUrl?: string
}

interface FigmaPreferenceState {
  preference: FigmaPreference | null
  isLoading: boolean
  error?: string
  hasPreferenceForWebsite: (websiteUrl: string) => boolean
  refresh: () => Promise<void>
  updatePreference: (update: FigmaPreferenceUpdate) => Promise<void>
}

export function useFigmaPreferences(): FigmaPreferenceState {
  const {
    metadata,
    isLoadingMetadata,
    metadataError,
    fetchMetadata,
    updatePreference,
    metadataLastFetched
  } = useFigmaDataStore()

  const refresh = useCallback(async () => {
    if (!metadataLastFetched) {
      await fetchMetadata()
    }
  }, [fetchMetadata, metadataLastFetched])

  const hasPreferenceForWebsite = useCallback(
    (websiteUrl: string): boolean => {
      if (!metadata.website) {
        return false
      }

      try {
        const domain = new URL(websiteUrl).hostname
        return (
          metadata.website.domain === domain && metadata.preference !== null
        )
      } catch {
        return false
      }
    },
    [metadata.website, metadata.preference]
  )

  const updatePreferenceForWebsite = useCallback(
    async (update: FigmaPreferenceUpdate) => {
      await updatePreference(update)
    },
    [updatePreference]
  )

  return useMemo(() => {
    return {
      preference: metadata.preference,
      isLoading: isLoadingMetadata,
      error: metadataError,
      hasPreferenceForWebsite,
      refresh,
      updatePreference: updatePreferenceForWebsite
    }
  }, [
    metadata.preference,
    isLoadingMetadata,
    metadataError,
    hasPreferenceForWebsite,
    refresh,
    updatePreferenceForWebsite
  ])
}
