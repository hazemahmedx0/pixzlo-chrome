import { LinearOptionsPopover } from "@/components/content/pixzlo-dialog/linear-options"
import type {
  LinearOptionCategory,
  LinearSelectionState
} from "@/components/content/pixzlo-dialog/linear-options/category-select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useIssueSubmissionWithPreferences } from "@/hooks/use-issue-submission-with-preferences"
import { useLinearIntegration } from "@/hooks/use-linear-integration"
import { PIXZLO_WEB_URL } from "@/lib/constants"
import { useLinearDataStore } from "@/stores/linear-data"
import { memo, useCallback, useEffect, useState } from "react"

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
    const [linearSelections, setLinearSelections] =
      useState<LinearSelectionState>({})
    const { isConnected, isLoading, error, retryConnection } =
      useLinearIntegration()
    const { metadata, fetchMetadata } = useLinearDataStore()

    // Load Linear defaults automatically when connected
    useEffect(() => {
      if (isConnected && !isLoading) {
        // Fetch metadata to get preferences and options
        fetchMetadata().catch((err) => {
          console.error("Failed to fetch Linear metadata:", err)
        })
      }
    }, [isConnected, isLoading, fetchMetadata])

    // Auto-apply defaults from preferences
    useEffect(() => {
      if (isConnected && metadata.preference) {
        const newSelections: LinearSelectionState = {}

        // Apply team default
        if (metadata.preference.lastUsedTeamId && metadata.teams) {
          const team = metadata.teams.find(
            (t) => t.id === metadata.preference?.lastUsedTeamId
          )
          if (team) {
            newSelections.teams = { id: team.id, label: team.name }
          }
        }

        // Apply project default
        if (metadata.preference.lastUsedProjectId && metadata.projects) {
          const project = metadata.projects.find(
            (p) => p.id === metadata.preference?.lastUsedProjectId
          )
          if (project) {
            newSelections.projects = { id: project.id, label: project.name }
          }
        }

        // Only update if we have defaults to apply
        if (Object.keys(newSelections).length > 0) {
          setLinearSelections((prev) => ({
            ...prev,
            ...newSelections
          }))
        }
      }
    }, [isConnected, metadata.preference, metadata.teams, metadata.projects])

    // Use the enhanced submission hook with preferences
    const { handleSubmit: handleSubmitWithPreferences } =
      useIssueSubmissionWithPreferences(
        onSubmit,
        shareToLinear && isConnected ? linearSelections : undefined
      )

    const handleLinearSelectionChange = (
      category: LinearOptionCategory,
      optionId: string,
      label: string
    ): void => {
      setLinearSelections((prev) => {
        const newSelections = {
          ...prev,
          [category]: { id: optionId, label }
        }

        // Clear workflow state if team changes (workflow states are team-specific)
        if (category === "teams" && prev.workflowStates) {
          console.log("🔄 Team changed, clearing workflow state selection")
          delete newSelections.workflowStates
        }

        return newSelections
      })
    }

    const handleConnect = (): void => {
      // Open Pixzlo-web settings page for Linear integration
      // This would typically open in a new tab/window
      const pixzloWebUrl = PIXZLO_WEB_URL
      window.open(`${pixzloWebUrl}/settings/integrations`, "_blank")
    }

    const handleSubmit = useCallback((): void => {
      // Call the enhanced submission that saves preferences
      handleSubmitWithPreferences()
    }, [handleSubmitWithPreferences])

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
                  className="data-[state=checked]:bg-primary"
                />
                <span className="text-sm text-gray-700">Share to Linear</span>
                <LinearOptionsPopover
                  isConnected={isConnected}
                  selections={linearSelections}
                  onSelectionChange={handleLinearSelectionChange}
                />
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
