import { useFigmaAuth } from "@/hooks/use-figma-auth"
import { useFigmaDesigns } from "@/hooks/use-figma-designs"
import type { FigmaDesignLink } from "@/types/figma"
import { memo, useEffect, useState } from "react"

import FigmaAuthPrompt from "./auth/figma-auth-prompt"
import FigmaDesignManager from "./design-manager"

interface FigmaModalContentProps {
  isOpen: boolean
  onClose: () => void
  onDesignSelected: (
    designData: {
      imageUrl: string
      designName: string
      figmaUrl: string
    },
    contextData?: any
  ) => void
  existingDesigns: FigmaDesignLink[]
  initialContext?: any
  onAuthCompleted: () => Promise<void>
}

/**
 * Content component for Figma modal that handles its own auth checking
 * This prevents the auth loading from affecting the main dialog
 */
const FigmaModalContent = memo(
  ({
    isOpen,
    onClose,
    onDesignSelected,
    existingDesigns,
    initialContext,
    onAuthCompleted
  }: FigmaModalContentProps): JSX.Element => {
    const [isCheckingAuth, setIsCheckingAuth] = useState(true) // Start with true since we need to check on mount

    const {
      isAuthenticated,
      isLoading: authLoading,
      checkAuth
    } = useFigmaAuth()

    // Check auth when this component mounts (modal content is rendered)
    useEffect(() => {
      if (isOpen) {
        console.log("🎯 Modal content mounted - checking auth status...")
        setIsCheckingAuth(true)
        checkAuth().finally(() => {
          // Add small delay to prevent flashing
          setTimeout(() => {
            setIsCheckingAuth(false)
          }, 300)
        })
      }
    }, [isOpen, checkAuth])

    // Handle auth completion with loading state
    const handleAuthCompleted = async (): Promise<void> => {
      setIsCheckingAuth(true)
      try {
        await onAuthCompleted()
      } finally {
        setTimeout(() => {
          setIsCheckingAuth(false)
        }, 300)
      }
    }

    if (isCheckingAuth || authLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
            </div>
            <p className="text-gray-600">Loading Figma integration...</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        <FigmaAuthPrompt
          isOpen={isOpen}
          onClose={onClose}
          onAuthenticated={handleAuthCompleted}
        />
      )
    }

    return (
      <FigmaDesignManager
        isOpen={isOpen}
        onClose={onClose}
        onDesignSelected={onDesignSelected}
        existingDesigns={existingDesigns}
        initialContext={initialContext}
      />
    )
  }
)

FigmaModalContent.displayName = "FigmaModalContent"

export default FigmaModalContent
