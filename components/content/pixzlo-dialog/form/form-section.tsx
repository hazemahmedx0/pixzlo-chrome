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

// Character limits
const TITLE_MAX_LENGTH = 120
const DESCRIPTION_MAX_LENGTH = 5000

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

    // Sanitize and limit input
    const handleTitleChange = (value: string): void => {
      // Remove any potential XSS attempts (basic sanitization)
      const sanitized = value.replace(/<script[^>]*>.*?<\/script>/gi, "").trim()
      // Enforce character limit
      const limited = sanitized.slice(0, TITLE_MAX_LENGTH)
      onTitleChange(limited)
    }

    const handleDescriptionChange = (value: string): void => {
      // Remove any potential XSS attempts (basic sanitization)
      const sanitized = value.replace(/<script[^>]*>.*?<\/script>/gi, "").trim()
      // Enforce character limit
      const limited = sanitized.slice(0, DESCRIPTION_MAX_LENGTH)
      onDescriptionChange(limited)
    }

    const titleRemaining = TITLE_MAX_LENGTH - title.length
    const descriptionRemaining = DESCRIPTION_MAX_LENGTH - description.length

    return (
      <>
        {/* Title */}
        <div className="mt-5 grid w-full items-center gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title">Title</Label>
            <span
              className={`text-xs ${
                titleRemaining < 20
                  ? "text-red-500"
                  : titleRemaining < 40
                    ? "text-amber-500"
                    : "text-gray-400"
              }`}>
              {titleRemaining} characters left
            </span>
          </div>
          <Input
            type="text"
            id="title"
            placeholder="Untitled issue"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.stopPropagation()}
            maxLength={TITLE_MAX_LENGTH}
          />
        </div>

        {/* Description */}
        <div className="mt-3 grid w-full items-center gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description">Description</Label>
            <span
              className={`text-xs ${
                descriptionRemaining < 100
                  ? "text-red-500"
                  : descriptionRemaining < 500
                    ? "text-amber-500"
                    : "text-gray-400"
              }`}>
              {descriptionRemaining} characters left
            </span>
          </div>
          <Textarea
            id="description"
            placeholder="Describe the issue..."
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.stopPropagation()}
            rows={3}
            maxLength={DESCRIPTION_MAX_LENGTH}
          />
        </div>
      </>
    )
  }
)

FormSection.displayName = "PixzloDialogFormSection"

export default FormSection
