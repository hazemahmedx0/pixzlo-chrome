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
      checkAuth
    } = useFigmaAuth()

    const hasDesigns = designs.length > 0

    // Debug authentication state changes - only log when popup is open
    useEffect(() => {
      if (isFigmaPopupOpen) {
        console.log("🎯 FigmaDesignManager - Figma popup opened:", {
          isAuthenticated,
          authLoading,
          isLoadingDesigns,
          hasDesigns
        })
      }
    }, [
      isAuthenticated,
      authLoading,
      isLoadingDesigns,
      hasDesigns,
      isFigmaPopupOpen
    ])

    const handleAddDesignClick = (): void => {
      console.log("🎯 Add design clicked - opening modal...")
      // Just open modal - auth check happens inside the modal
      setIsFigmaPopupOpen(true)
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
      />
    )
  }
)

FigmaDesignManager.displayName = "FigmaDesignManager"

export default FigmaDesignManager
