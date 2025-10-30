import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import type { LinearOptionsData } from "@/stores/linear-data"

// LinearSelectionState is now defined in this file

export type LinearOptionCategory =
  | "teams"
  | "projects"
  | "users"
  | "workflowStates"

export interface LinearSelectionState {
  teams?: {
    id: string
    label: string
  }
  projects?: {
    id: string
    label: string
  }
  users?: {
    id: string
    label: string
  }
  workflowStates?: {
    id: string
    label: string
  }
}

interface LinearPreference {
  id: string
  lastUsedTeamId: string | null
  lastUsedTeamName: string | null
  lastUsedProjectId: string | null
  lastUsedProjectName: string | null
  updatedAt: string
}

interface CategorySelectProps {
  data: LinearOptionsData
  selections: LinearSelectionState
  onSelect: (category: LinearOptionCategory, optionId: string) => void
  isLoading: boolean
  preference?: LinearPreference | null
}

interface CategoryConfig {
  key: LinearOptionCategory
  label: string
  helper: string
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: "teams",
    label: "Team",
    helper: "Primary Linear team for syncing"
  },
  {
    key: "projects",
    label: "Project",
    helper: "Link issues to an existing project"
  },
  {
    key: "users",
    label: "Assignee",
    helper: "Default user to assign issues to"
  },
  {
    key: "workflowStates",
    label: "Workflow State",
    helper: "State newly created issues should start in"
  }
]

export function CategorySelect({
  data,
  selections,
  onSelect,
  isLoading,
  preference
}: CategorySelectProps): JSX.Element {
  // Helper function to check if selection matches preference (only team and project)
  const isPreferredSelection = (
    category: LinearOptionCategory,
    optionId: string
  ): boolean => {
    if (!preference) return false

    switch (category) {
      case "teams":
        return optionId === preference.lastUsedTeamId
      case "projects":
        return optionId === preference.lastUsedProjectId
      case "users":
      case "workflowStates":
        // These are not saved as preferences
        return false
      default:
        return false
    }
  }

  // Get filtered options based on selections
  const getFilteredOptions = (key: LinearOptionCategory): CategoryOption[] => {
    const allOptions = getOptionsForCategory(data, key)

    // Filter workflow states based on selected team
    if (key === "workflowStates" && selections.teams?.id) {
      return allOptions.filter(
        (option) =>
          data.workflowStates?.find((state) => state.id === option.id)?.team
            ?.id === selections.teams?.id
      )
    }

    // Filter projects based on selected team (if there's a team property on projects)
    // For now, return all projects as they may not have team associations

    return allOptions
  }

  return (
    <div className="flex flex-col gap-4">
      {CATEGORIES.map(({ key, label, helper }) => {
        const options = getFilteredOptions(key)
        const selectedId = selections[key]?.id ?? ""

        return (
          <div key={key} className="flex flex-col gap-2">
            <div className="flex min-w-0 flex-1 items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-800">{label}</span>
                <span className="text-[11px] text-gray-500">{helper}</span>
              </div>
              <span className="whitespace-nowrap text-[11px] text-gray-400">
                {options.length} available
              </span>
            </div>
            <div className="flex items-center">
              <Select
                value={selectedId}
                onValueChange={(next) => onSelect(key, next)}
                disabled={isLoading || options.length === 0}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue
                    placeholder={
                      isLoading ? "Loading..." : `Select ${label.toLowerCase()}`
                    }
                  />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-60 text-xs">
                  {isLoading ? (
                    <SelectItem value="__loading" disabled>
                      Loading {label.toLowerCase()}...
                    </SelectItem>
                  ) : options.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      No {label.toLowerCase()}s available
                    </SelectItem>
                  ) : (
                    options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        <span className="font-medium text-gray-700">
                          {option.primary}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface CategoryOption {
  id: string
  primary: string
  secondary?: string
}

function getOptionsForCategory(
  data: LinearOptionsData,
  category: LinearOptionCategory
): CategoryOption[] {
  switch (category) {
    case "teams":
      return (
        data.teams?.map((team) => ({
          id: team.id,
          primary: team.name,
          secondary: team.key
        })) ?? []
      )
    case "projects":
      return (
        data.projects?.map((project) => ({
          id: project.id,
          primary: project.name,
          secondary: project.state
        })) ?? []
      )
    case "users":
      return (
        data.users?.map((user) => ({
          id: user.id,
          primary: user.displayName,
          secondary: user.email ?? undefined
        })) ?? []
      )
    case "workflowStates":
      return (
        data.workflowStates?.map((state) => ({
          id: state.id,
          primary: state.name,
          secondary: state.team?.name
        })) ?? []
      )
    default:
      return []
  }
}
