import type { LinearOptionsData } from "@/hooks/use-linear-options"

import type {
  LinearOptionCategory,
  LinearSelectionState
} from "./category-select"

interface LinearOptionsListProps {
  data: LinearOptionsData
  selections: LinearSelectionState
  onSelect: (category: LinearOptionCategory, optionId: string) => void
}

const SECTION_CONFIG: Record<LinearOptionCategory, string> = {
  teams: "Selected team",
  projects: "Linked project",
  users: "Default assignee",
  workflowStates: "Initial workflow state"
}

export function LinearOptionsList({
  selections
}: LinearOptionsListProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2 rounded border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
      {Object.entries(SECTION_CONFIG).map(([key, label]) => {
        const selection = selections[key as LinearOptionCategory]
        return (
          <div key={key} className="flex justify-between">
            <span className="font-medium text-gray-700">{label}</span>
            <span className="text-gray-500">
              {selection?.label ?? "Not set"}
            </span>
          </div>
        )
      })}
    </div>
  )
}
