import FormField from "@/components/ui/form-field"
import { memo } from "react"

import { Input } from "~components/ui/input"
import { Label } from "~components/ui/label"
import { Textarea } from "~components/ui/textarea"

interface FormSectionProps {
  title: string
  description: string
  onTitleChange: (title: string) => void
  onDescriptionChange: (description: string) => void
}

const FormSection = memo(
  ({
    title,
    description,
    onTitleChange,
    onDescriptionChange
  }: FormSectionProps): JSX.Element => {
    // Prevent keyboard shortcuts from interfering with input
    const handleKeyDown = (e: React.KeyboardEvent): void => {
      // Stop event propagation to prevent page shortcuts
      e.stopPropagation()

      // Allow common editing shortcuts
      if (e.ctrlKey || e.metaKey) {
        // Allow Ctrl/Cmd + A, C, V, X, Z, Y (common editing)
        const allowedKeys = ["a", "c", "v", "x", "z", "y"]
        if (allowedKeys.includes(e.key.toLowerCase())) {
          return // Allow these shortcuts
        }
      }

      // Allow all other normal typing
      if (
        e.key.length === 1 ||
        [
          "Backspace",
          "Delete",
          "Enter",
          "Tab",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End"
        ].includes(e.key)
      ) {
        return // Allow normal typing and navigation
      }
    }

    return (
      <>
        {/* Title */}
        <div className="mt-5 grid w-full items-center gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            type="text"
            id="title"
            placeholder="Untitled issue"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.stopPropagation()}
          />
        </div>

        {/* Description */}
        <div className="mt-3 grid w-full items-center gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe the issue..."
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.stopPropagation()}
            rows={3}
          />
        </div>
      </>
    )
  }
)

FormSection.displayName = "PixzloDialogFormSection"

export default FormSection
