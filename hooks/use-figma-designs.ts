import { FigmaService } from "@/lib/figma-service"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import type { FigmaDesignLink } from "@/types/figma"
import { useCallback, useEffect, useState } from "react"

interface UseFigmaDesignsReturn {
  designs: FigmaDesignLink[]
  isLoading: boolean
  error: string | null
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

/**
 * Hook for managing Figma design links for the current page
 */
export function useFigmaDesigns(): UseFigmaDesignsReturn {
  const [error, setError] = useState<string | null>(null)

  const designs = usePixzloDialogStore((state) => state.figmaDesigns)
  const figmaDesignsLoading = usePixzloDialogStore(
    (state) => state.figmaDesignsLoading
  )
  const setFigmaDesigns = usePixzloDialogStore((state) => state.setFigmaDesigns)
  const setFigmaDesignsLoading = usePixzloDialogStore(
    (state) => state.setFigmaDesignsLoading
  )

  const figmaService = FigmaService.getInstance()

  const refreshDesigns = useCallback(async (): Promise<void> => {
    setFigmaDesignsLoading(true)
    setError(null)

    try {
      const response = await figmaService.getDesignLinksForCurrentPage()

      if (response.success) {
        const links = response.data
        if (Array.isArray(links)) {
          setFigmaDesigns(links)
        } else {
          setError("Failed to fetch design links")
          setFigmaDesigns([])
        }
      } else {
        setError(response.error || "Failed to fetch design links")
        setFigmaDesigns([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      setFigmaDesigns([])
    } finally {
      setFigmaDesignsLoading(false)
    }
  }, [figmaService, setFigmaDesigns, setFigmaDesignsLoading])

  const createDesignLink = useCallback(
    async (linkData: {
      figma_file_id: string
      figma_frame_id: string
      frame_name?: string
      frame_url: string
      thumbnail_url?: string
    }): Promise<boolean> => {
      try {
        setError(null)
        const response = await figmaService.createDesignLink(linkData)

        if (response.success && response.data) {
          const current = usePixzloDialogStore
            .getState()
            .figmaDesigns.filter((design) => design.id !== response.data!.id)
          setFigmaDesigns([response.data!, ...current])
          return true
        } else {
          setError(response.error || "Failed to create design link")
          return false
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error"
        setError(errorMessage)
        return false
      }
    },
    [figmaService, setFigmaDesigns]
  )

  const deleteDesignLink = useCallback(
    async (linkId: string): Promise<boolean> => {
      try {
        setError(null)
        const response = await figmaService.deleteDesignLink(linkId)

        if (response.success) {
          const current = usePixzloDialogStore
            .getState()
            .figmaDesigns.filter((design) => design.id !== linkId)
          setFigmaDesigns(current)
          return true
        } else {
          setError(response.error || "Failed to delete design link")
          return false
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error"
        setError(errorMessage)
        return false
      }
    },
    [figmaService, setFigmaDesigns]
  )

  // Don't load designs automatically on mount - only load when explicitly requested
  // This prevents unnecessary API calls when components first appear
  // Designs will be loaded when user opens Figma popup or explicitly requests them

  const hasDesigns = designs.length > 0

  return {
    designs,
    isLoading: figmaDesignsLoading,
    error,
    refreshDesigns,
    createDesignLink,
    deleteDesignLink,
    hasDesigns
  }
}
