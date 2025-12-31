import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { PIXZLO_WEB_URL } from "@/lib/constants"
import {
  useLinearDataStore,
  type LinearOptionsData
} from "@/stores/linear-data"
import { Settings } from "lucide-react"
import { useMemo, useState } from "react"

import {
  type LinearOptionCategory,
  type LinearSelectionState
} from "./category-select"
import EnhancedCategorySelect from "./enhanced-category-select"

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

  const { metadata, isLoadingMetadata } = useLinearDataStore()

  const options: LinearOptionsData = useMemo(
    () => ({
      teams: metadata.teams,
      projects: metadata.projects,
      users: metadata.users,
      workflowStates: metadata.workflowStates
    }),
    [metadata]
  )

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
          aria-label="Linear settings">
          <Settings className="h-4 w-4 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
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

          <EnhancedCategorySelect
            data={options}
            selections={selected}
            onSelect={handleSelect}
            isLoading={isLoadingMetadata}
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
                if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
                  chrome.runtime.sendMessage(
                    { type: "OPEN_INTEGRATIONS_SETTINGS" },
                    () => {
                      if (chrome.runtime.lastError) {
                        window.open(`${PIXZLO_WEB_URL}/settings/integrations`, "_blank")
                      }
                    }
                  )
                  return
                }

                window.open(`${PIXZLO_WEB_URL}/settings/integrations`, "_blank")
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
