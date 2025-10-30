import { useFigmaDataStore } from "@/stores/figma-data"
import type { FigmaDesignLink } from "@/types/figma"
import { useCallback, useMemo } from "react"

interface UseFigmaDesignsReturn {
  designs: FigmaDesignLink[]
  isLoading: boolean
  error: string | undefined
  lastFetchedAt: number | undefined
  refreshDesigns: () => Promise<void>
  createDesignLink: (linkData: {
    figma_file_id: string
    figma_frame_id: string
    frame_name?: string
    frame_url: string
    thumbnail_url?: string
  }) => Promise<boolean>
  deleteDesignLink: (linkId: string) => Promise<boolean>
  hasDesigns: boolean
}

export function useFigmaDesigns(): UseFigmaDesignsReturn {
  const {
    metadata,
    isLoadingMetadata,
    metadataError,
    metadataLastFetched,
    fetchMetadata,
    createDesignLink,
    deleteDesignLink
  } = useFigmaDataStore()

  const refreshDesigns = useCallback(async (): Promise<void> => {
    await fetchMetadata()
  }, [fetchMetadata])

  const preferredFrameId = metadata.preference?.lastUsedFrameId ?? null

  const orderedDesigns = useMemo(() => {
    if (!preferredFrameId) {
      return metadata.designLinks
    }

    const preferredIndex = metadata.designLinks.findIndex(
      (design) => design.figma_frame_id === preferredFrameId
    )

    if (preferredIndex <= 0) {
      return metadata.designLinks
    }

    const preferredDesign = metadata.designLinks[preferredIndex]
    return [
      preferredDesign,
      ...metadata.designLinks.slice(0, preferredIndex),
      ...metadata.designLinks.slice(preferredIndex + 1)
    ]
  }, [metadata.designLinks, preferredFrameId])

  const hasDesigns = orderedDesigns.length > 0

  return {
    designs: orderedDesigns,
    isLoading: isLoadingMetadata,
    error: metadataError ?? undefined,
    lastFetchedAt: metadataLastFetched,
    refreshDesigns,
    createDesignLink,
    deleteDesignLink,
    hasDesigns
  }
}
