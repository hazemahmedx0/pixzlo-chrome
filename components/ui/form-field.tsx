import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { memo } from "react"

interface FormFieldProps {
  type: "input" | "textarea"
  placeholder: string
  value: string
  onChange: (value: string) => void
  className?: string
  inputClassName?: string
  rows?: number
}

const FormField = memo(
  ({
    type,
    placeholder,
    value,
    onChange,
    className = "",
    inputClassName = "",
    rows = 4
  }: FormFieldProps) => {
    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ): void => {
      onChange(e.target.value)
    }

    if (type === "textarea") {
      return (
        <div className={className}>
          <Textarea
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            className={`w-full resize-none ${inputClassName}`}
            rows={rows}
            spellCheck={false}
          />
        </div>
      )
    }

    return (
      <div className={className}>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className={inputClassName}
        />
      </div>
    )
  }
)

FormField.displayName = "FormField"

export default FormField
