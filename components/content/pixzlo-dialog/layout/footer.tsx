import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  createLinearIssue,
  useLinearIntegration
} from "@/hooks/use-linear-integration"
import { memo, useState } from "react"
import { toast } from "sonner"

interface FooterProps {
  onCancel: () => void
  onSubmit: () => void
  issueTitle?: string
  issueDescription?: string
}

const Footer = memo(
  ({
    onCancel,
    onSubmit,
    issueTitle,
    issueDescription
  }: FooterProps): JSX.Element => {
    const [shareToLinear, setShareToLinear] = useState(true)
    const { isConnected, isLoading, error, retryConnection } =
      useLinearIntegration()

    const handleConnect = (): void => {
      // Open Pixzlo-web settings page for Linear integration
      // This would typically open in a new tab/window
      const pixzloWebUrl = process.env.PIXZLO_WEB_URL || "http://localhost:3000"
      window.open(`${pixzloWebUrl}/settings/integrations`, "_blank")
    }

    const handleSubmit = async (): Promise<void> => {
      try {
        console.log("🎯 Footer handleSubmit called")
        console.log("🔍 Debug values:", {
          shareToLinear,
          isConnected,
          issueTitle: issueTitle || "NO_TITLE",
          issueDescription: issueDescription || "NO_DESCRIPTION"
        })

        // First, create the main issue
        await onSubmit()
        console.log("✅ Main issue created successfully")

        // Then, if Linear sharing is enabled and connected, create Linear issue
        if (shareToLinear && isConnected) {
          console.log("🚀 Starting Linear issue creation...")

          // Use title or fallback to a default
          const finalTitle = issueTitle?.trim() || "Pixzlo Issue Report"
          const finalDescription =
            issueDescription?.trim() || "Issue reported via Pixzlo extension"

          console.log("📝 Using title:", finalTitle)
          console.log("📝 Using description:", finalDescription)

          try {
            const linearResult = await createLinearIssue({
              title: finalTitle,
              description: finalDescription,
              priority: 2 // Medium priority
            })
            console.log("📝 Linear result:", linearResult)

            if (linearResult.success && linearResult.issueUrl) {
              toast.success("Issue created successfully!", {
                description: `Created in Pixzlo and Linear. Issue: ${linearResult.issueUrl}`
              })
            } else {
              // Main issue was created, but Linear failed
              toast.success("Issue created in Pixzlo", {
                description:
                  "Linear sync failed: " +
                  (linearResult.error || "Unknown error")
              })
            }
          } catch (linearError) {
            // Main issue was created, but Linear failed
            toast.success("Issue created in Pixzlo", {
              description:
                "Linear sync failed. Check your integration settings."
            })
          }
        } else {
          console.log("❌ Linear issue NOT created because:", {
            shareToLinear: `${shareToLinear} (toggle state)`,
            isConnected: `${isConnected} (Linear connection status)`,
            reason: !shareToLinear
              ? "Toggle is OFF"
              : !isConnected
                ? "Linear not connected"
                : "Unknown"
          })
          toast.success("Issue created successfully!", {
            description:
              "Your issue has been created and the link has been copied to your clipboard."
          })
        }
      } catch (error) {
        console.error("Error creating issue:", error)
        toast.error("Failed to create issue", {
          description:
            "There was an error creating your issue. Please try again."
        })
      }
    }

    return (
      <div className="mt-4 pb-4 pt-0">
        <div className="flex items-center justify-between">
          {/* Left side - Linear integration toggle */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></div>
                <span className="text-sm text-gray-500">
                  Checking Linear...
                </span>
              </div>
            ) : isConnected ? (
              <div className="flex items-center gap-2">
                <Switch
                  checked={shareToLinear}
                  onCheckedChange={setShareToLinear}
                  className="data-[state=checked]:bg-blue-600"
                />
                <span className="text-sm text-gray-700">Share to Linear</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {error ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-orange-600">{error}</span>
                    <Button
                      variant="outline"
                      onClick={retryConnection}
                      className="px-2 py-1 text-xs hover:bg-gray-50">
                      Retry
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleConnect}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50">
                    Connect Linear
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Right side - Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              Create issue
            </Button>
          </div>
        </div>
      </div>
    )
  }
)

Footer.displayName = "PixzloDialogFooter"

export default Footer
