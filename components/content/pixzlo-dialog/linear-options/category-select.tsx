import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import type { LinearOptionsData } from "@/hooks/use-linear-options"

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

interface CategorySelectProps {
  data: LinearOptionsData
  selections: LinearSelectionState
  onSelect: (category: LinearOptionCategory, optionId: string) => void
  isLoading: boolean
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
  isLoading
}: CategorySelectProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {CATEGORIES.map(({ key, label, helper }) => {
        const options = getOptionsForCategory(data, key)
        const selectedId = selections[key]?.id ?? ""

        return (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-gray-800">
                  {label}
                </span>
                <span className="text-[11px] text-gray-500">{helper}</span>
              </div>
              <span className="text-[11px] text-gray-400">
                {options.length} available
              </span>
            </div>
            <Select
              value={selectedId}
              onValueChange={(next) => onSelect(key, next)}
              disabled={isLoading || options.length === 0}>
              <SelectTrigger className="h-8 text-xs">
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
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-gray-700">
                          {option.primary}
                        </span>
                        {option.secondary ? (
                          <span className="text-[10px] uppercase tracking-wide text-gray-400">
                            {option.secondary}
                          </span>
                        ) : null}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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
