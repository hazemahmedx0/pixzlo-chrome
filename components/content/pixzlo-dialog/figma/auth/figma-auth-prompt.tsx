import { Button } from "@/components/ui/button"
import { useFigmaAuth } from "@/hooks/use-figma-auth"
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react"
import { memo, useEffect, useState } from "react"

interface FigmaAuthPromptProps {
  isOpen: boolean
  onClose: () => void
  onAuthenticated?: () => void
}

/**
 * Component for prompting user to authenticate with Figma
 */
const FigmaAuthPrompt = memo(
  ({ isOpen, onClose, onAuthenticated }: FigmaAuthPromptProps): JSX.Element => {
    const { isAuthenticated, isLoading, error, initiateAuth, checkAuth } =
      useFigmaAuth()

    const [authInProgress, setAuthInProgress] = useState(false)

    // Close dialog when authentication is successful
    useEffect(() => {
      if (isAuthenticated) {
        onAuthenticated?.()
      }
    }, [isAuthenticated, onAuthenticated])

    const handleAuthClick = async (): Promise<void> => {
      console.log("🔐 Starting Figma OAuth via background script...")
      setAuthInProgress(true)

      try {
        // Send OAuth request to background script (chrome.identity only works there)
        const result = await new Promise<{
          success: boolean
          error?: string
        }>((resolve) => {
          chrome.runtime.sendMessage(
            {
              type: "FIGMA_OAUTH"
              // Background script will handle getting auth URL and launching OAuth
            },
            (response) => {
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || "Extension error"
                })
              } else {
                resolve(response || { success: false, error: "No response" })
              }
            }
          )
        })

        if (result.success) {
          console.log("🔐 OAuth SUCCESS! Checking auth status...")

          // Quick check - backend should be ready by now
          setTimeout(async () => {
            await checkAuth()
            setAuthInProgress(false)
            onAuthenticated?.()
          }, 500) // Reduced from 2000ms to 500ms
        } else {
          console.error("🔐 OAuth failed:", result.error)
          setAuthInProgress(false)
        }
      } catch (error) {
        console.error("🔐 OAuth setup failed:", error)
        setAuthInProgress(false)
      }
    }

    return (
      <div className="custom-scrollbar flex h-full w-full overflow-y-auto p-6">
        <div className="m-auto max-w-md">
          {/* Pixzlo Logo */}
          <div className="mb-6 flex justify-center">
            <img
              src={chrome.runtime.getURL("assets/figma-to-pixzlo.svg")}
              alt="Pixzlo Logo"
              className="h-12 w-auto"
            />
          </div>

          <div className="mb-6 text-center">
            <p className="mb-2 text-title-h6 text-gray-900">
              Hold up. You haven't hooked up Figma yet.
            </p>
            <p className="text-paragraph-sm text-gray-500">
              Link your Figma account to select frames and compare UI elements.
              Quick and secure, just a few clicks!
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-lg bg-red-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-red-500" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Authentication Failed</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleAuthClick}
              className="flex-1"
              variant="sky"
              disabled={authInProgress}>
              {authInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>Connect Figma</>
              )}
            </Button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p className="text-balance text-center">
              This will open a new tab for Figma authentication. Keep this
              dialog open while you complete the process.
            </p>
          </div>
        </div>
      </div>
    )
  }
)

FigmaAuthPrompt.displayName = "FigmaAuthPrompt"

export default FigmaAuthPrompt
