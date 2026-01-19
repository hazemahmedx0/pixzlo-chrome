import { useFigmaAuth } from "@/hooks/use-figma-auth"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import type { FigmaDesignLink } from "@/types/figma"
import { memo, useEffect } from "react"

import FigmaDesignPlaceholder from "./figma-design-placeholder"
import FigmaDesignViewer from "./figma-design-viewer"

interface FigmaDesignManagerProps {
  designs: FigmaDesignLink[]
  isLoadingDesigns: boolean
  onDesignSelected?: (
    designData: {
      imageUrl: string
      designName: string
      figmaUrl: string
    },
    contextData?: {
      figmaUrl: string
      fileId: string
      frameId: string
      frameData?: any
    }
  ) => void
  placeholderAspectRatio?: number | null
  placeholderMinHeight?: string | number | null
}

/**
 * Main component managing Figma design integration workflow
 */
const FigmaDesignManager = memo(
  ({
    designs,
    isLoadingDesigns,
    onDesignSelected,
    placeholderAspectRatio = null,
    placeholderMinHeight = null
  }: FigmaDesignManagerProps): JSX.Element => {
    const { isFigmaPopupOpen, figmaContext, setIsFigmaPopupOpen } =
      usePixzloDialogStore()

    const {
      isAuthenticated,
      isLoading: authLoading,
      metadata,
      isLoadingMetadata,
      fetchMetadata
    } = useFigmaAuth()

    const hasDesigns = designs.length > 0

    const handleAddDesignClick = (): void => {
      setIsFigmaPopupOpen(true)
      // Metadata fetching is handled by the modal component
    }

    const handleDesignSelection = (
      designData: {
        imageUrl: string
        designName: string
        figmaUrl: string
      },
      contextData?: {
        figmaUrl: string
        fileId: string
        frameId: string
        frameData?: any
      }
    ): void => {
      onDesignSelected?.(designData, contextData)
      setIsFigmaPopupOpen(false)
    }

    // Always show the add-design placeholder; API calls only happen when popup opens
    return (
      <FigmaDesignPlaceholder
        onClick={handleAddDesignClick}
        aspectRatio={placeholderAspectRatio}
        minHeight={placeholderMinHeight}
        isLoading={isLoadingMetadata}
      />
    )
  }
)

FigmaDesignManager.displayName = "FigmaDesignManager"

export default FigmaDesignManager
