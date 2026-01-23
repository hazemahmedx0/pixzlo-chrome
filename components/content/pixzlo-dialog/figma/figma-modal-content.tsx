import { useFigmaAuth } from "@/hooks/use-figma-auth"
import { useFigmaDesigns } from "@/hooks/use-figma-designs"
import type { FigmaDesignLink } from "@/types/figma"
import { memo, useCallback, useEffect, useState } from "react"

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

    const { isAuthenticated, isLoading: authLoading } = useFigmaAuth()

    // Just wait for auth loading to complete (metadata is already fetched by dialog)
    useEffect(() => {
      if (!isOpen) {
        setIsCheckingAuth(false)
        return
      }

      // Metadata is already being fetched by the main dialog via useDialogIntegrationData
      // We just need to wait for it to complete
      setIsCheckingAuth(true)

      // Wait briefly for auth state to stabilize, then end checking
      const timer = setTimeout(() => {
        setIsCheckingAuth(false)
      }, 800)

      return () => clearTimeout(timer)
    }, [isOpen, authLoading, isAuthenticated])

    // Handle auth completion with loading state
    const handleAuthCompleted = useCallback(async (): Promise<void> => {
      setIsCheckingAuth(true)
      try {
        await onAuthCompleted()
      } finally {
        setTimeout(() => {
          setIsCheckingAuth(false)
        }, 300)
      }
    }, [onAuthCompleted])

    if (isCheckingAuth || authLoading) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
            </div>
            <p className="text-gray-600">Loading Figma integration...</p>
            <p className="mt-2 text-xs text-gray-400">
              {isCheckingAuth && "Checking auth..."}
              {authLoading && " Loading metadata..."}
            </p>
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
