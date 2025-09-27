import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import {
  useLinearOptions,
  type LinearOptionsData
} from "@/hooks/use-linear-options"
import { Settings } from "lucide-react"
import { useState } from "react"

import {
  CategorySelect,
  type LinearOptionCategory,
  type LinearSelectionState
} from "./category-select"
import { LinearOptionsList } from "./linear-options-list"

interface LinearOptionsPopoverProps {
  isConnected: boolean
  selections?: LinearSelectionState
  onSelectionChange?: (
    category: LinearOptionCategory,
    optionId: string,
    label: string
  ) => void
}

export function LinearOptionsPopover({
  isConnected,
  selections: externalSelections,
  onSelectionChange
}: LinearOptionsPopoverProps): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [internalSelected, setInternalSelected] =
    useState<LinearSelectionState>({})

  // Use external selections if provided, otherwise use internal state
  const selected = externalSelections ?? internalSelected
  const setSelected = onSelectionChange
    ? (category: LinearOptionCategory, optionId: string, label: string) => {
        onSelectionChange(category, optionId, label)
      }
    : (category: LinearOptionCategory, optionId: string, label: string) => {
        const newSelection = {
          id: optionId,
          label
        }
        setInternalSelected((prev) => ({
          ...prev,
          [category]: newSelection
        }))
      }

  const {
    data: options,
    isLoading,
    fetchOptions,
    retryFetch
  } = useLinearOptions()

  const handleSelect = (
    category: LinearOptionCategory,
    optionId: string
  ): void => {
    const label = getOptionLabel(category, optionId, options)
    if (!label) return

    setSelected(category, optionId, label)
  }

  if (!isConnected) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-100"
          onClick={() => {
            if (!options.teams && !isLoading) {
              void fetchOptions()
            }
          }}
          aria-label="Linear settings">
          <Settings className="h-4 w-4 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 rounded-lg border border-gray-200 bg-white shadow-lg"
        side="top"
        align="start"
        sideOffset={8}
        aria-label="Linear options">
        <div className="flex max-h-[420px] flex-col gap-4 overflow-y-auto p-4">
          <header className="border-b pb-2">
            <h4 className="text-sm font-medium text-gray-800">
              Linear Configuration
            </h4>
            <p className="text-xs text-gray-500">
              Configure default resources for Linear issue creation
            </p>
          </header>

          <CategorySelect
            data={options}
            selections={selected}
            onSelect={handleSelect}
            isLoading={isLoading}
          />

          <LinearOptionsList
            data={options}
            selections={selected}
            onSelect={handleSelect}
          />

          <footer className="flex items-center justify-between border-t pt-2 text-[11px] text-gray-500">
            <span className="pr-3">
              Need more control? Manage integrations in the Pixzlo dashboard.
            </span>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                const pixzloWebUrl =
                  process.env.PIXZLO_WEB_URL || "http://localhost:3000"
                window.open(`${pixzloWebUrl}/settings/integrations`, "_blank")
              }}>
              Manage
            </Button>
          </footer>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function getOptionLabel(
  category: LinearOptionCategory,
  optionId: string,
  data: LinearOptionsData
): string | undefined {
  switch (category) {
    case "teams":
      return data.teams?.find((team) => team.id === optionId)?.name
    case "projects":
      return data.projects?.find((project) => project.id === optionId)?.name
    case "users":
      return data.users?.find((user) => user.id === optionId)?.displayName
    case "workflowStates":
      return data.workflowStates?.find((state) => state.id === optionId)?.name
    default:
      return undefined
  }
}
