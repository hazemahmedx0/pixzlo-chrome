import type { LinearOptionsData } from "@/stores/linear-data"
import { useLinearDataStore } from "@/stores/linear-data"
import { Loader2 } from "lucide-react"
import { memo, useCallback, useEffect, useState } from "react"

import { CategorySelect } from "./category-select"
import type {
  LinearOptionCategory,
  LinearSelectionState
} from "./category-select"

interface EnhancedCategorySelectProps {
  data: LinearOptionsData
  selections: LinearSelectionState
  onSelect: (category: LinearOptionCategory, optionId: string) => void
  isLoading: boolean
}

/**
 * Enhanced category select that adds preference functionality
 * to the existing CategorySelect component without changing the UI structure
 */
const EnhancedCategorySelect = memo(
  ({
    data,
    selections,
    onSelect,
    isLoading
  }: EnhancedCategorySelectProps): JSX.Element => {
    const { metadata, isLoadingMetadata } = useLinearDataStore()
    const preference = metadata.preference ?? null

    const [hasAutoAppliedDefaults, setHasAutoAppliedDefaults] = useState(false)

    // Apply default selections from preferences
    useEffect(() => {
      if (
        preference &&
        !hasAutoAppliedDefaults &&
        Object.keys(data).length > 0
      ) {
        let hasAppliedAny = false

        // Apply team default
        if (preference.lastUsedTeamId && data.teams && !selections.teams) {
          const team = data.teams.find(
            (t) => t.id === preference.lastUsedTeamId
          )
          if (team) {
            onSelect("teams", team.id)
            hasAppliedAny = true
          }
        }

        // Apply project default
        if (
          preference.lastUsedProjectId &&
          data.projects &&
          !selections.projects
        ) {
          const project = data.projects.find(
            (p) => p.id === preference.lastUsedProjectId
          )
          if (project) {
            onSelect("projects", project.id)
            hasAppliedAny = true
          }
        }

        // Note: Assignee and workflow state are not auto-selected per user request
        // Users can manually select these but they won't be saved as preferences

        if (hasAppliedAny) {
          setHasAutoAppliedDefaults(true)
        }
      }
    }, [preference, hasAutoAppliedDefaults, data, selections, onSelect])

    // Enhanced select handler without immediate preference saving
    const handleSelect = useCallback(
      (category: LinearOptionCategory, optionId: string): void => {
        // Just call the original select handler
        onSelect(category, optionId)
      },
      [onSelect]
    )

    return (
      <div className="space-y-4">
        {/* Preference loading indicator */}
        {isLoadingMetadata && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading defaults...</span>
          </div>
        )}

        {/* Original components with enhanced handlers */}
        <CategorySelect
          data={data}
          selections={selections}
          onSelect={handleSelect}
          isLoading={isLoading}
          preference={preference}
        />
      </div>
    )
  }
)

EnhancedCategorySelect.displayName = "EnhancedCategorySelect"

export default EnhancedCategorySelect
