import { Checkbox } from "@/components/ui/checkbox"
import { Minus } from "lucide-react"
import { memo, useEffect, useRef } from "react"

interface PropertyCheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}

const PropertyCheckbox = memo(
  ({
    checked,
    indeterminate = false,
    onCheckedChange,
    className = ""
  }: PropertyCheckboxProps): JSX.Element => {
    const checkboxRef = useRef<HTMLButtonElement>(null)

    // Set indeterminate state on the native checkbox element
    useEffect(() => {
      if (checkboxRef.current) {
        const inputElement = checkboxRef.current.querySelector(
          'input[type="checkbox"]'
        ) as HTMLInputElement | null
        if (inputElement) {
          inputElement.indeterminate = indeterminate
        }
      }
    }, [indeterminate])

    const handleClick = (): void => {
      // When indeterminate or unchecked, select all (checked = true)
      // When checked, deselect all (checked = false)
      if (indeterminate || !checked) {
        onCheckedChange(true)
      } else {
        onCheckedChange(false)
      }
    }

    return (
      <div className={`flex items-center ${className}`}>
        {indeterminate ? (
          <button
            ref={checkboxRef}
            onClick={handleClick}
            className="flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white hover:border-gray-400"
            type="button">
            <Minus className="h-3 w-3 text-gray-600" />
          </button>
        ) : (
          <Checkbox
            ref={checkboxRef}
            checked={checked}
            onCheckedChange={(value) => {
              if (typeof value === "boolean") {
                onCheckedChange(value)
              }
            }}
          />
        )}
      </div>
    )
  }
)

PropertyCheckbox.displayName = "PropertyCheckbox"

export default PropertyCheckbox
