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

// Threshold percentages for showing the indicator
const TITLE_SHOW_THRESHOLD = 0.7 // Show when 70% full
const DESCRIPTION_SHOW_THRESHOLD = 0.9 // Show when 90% full

interface CharacterLimitIndicatorProps {
  current: number
  max: number
  showThreshold: number
}

const CharacterLimitIndicator = memo(
  ({
    current,
    max,
    showThreshold
  }: CharacterLimitIndicatorProps): JSX.Element | null => {
    const percentage = current / max

    // Don't show if below threshold
    if (percentage < showThreshold) {
      return null
    }

    // Calculate how far into the "warning zone" we are (0 = just entered, 1 = at limit)
    const warningProgress = (percentage - showThreshold) / (1 - showThreshold)

    // Circle properties
    const size = 14
    const strokeWidth = 3
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference * (1 - warningProgress)

    // Color transitions from orange to red
    const getColor = (): string => {
      if (warningProgress >= 0.85) return "#ef4444" // red-500
      if (warningProgress >= 0.6) return "#f97316" // orange-500
      return "#f59e0b" // amber-500
    }

    return (
      <div
        className="relative flex items-center justify-center transition-opacity duration-300"
        style={{
          width: size,
          height: size,
          opacity: Math.min(1, (percentage - showThreshold) / 0.1 + 0.3)
        }}>
        {/* Background circle */}
        <svg
          width={size}
          height={size}
          className="absolute"
          style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-200"
          />
        </svg>
        {/* Pulse effect when nearly full */}
        {warningProgress >= 0.85 && (
          <span
            className="absolute inset-0 animate-ping rounded-full opacity-30"
            style={{ backgroundColor: getColor() }}
          />
        )}
      </div>
    )
  }
)

CharacterLimitIndicator.displayName = "CharacterLimitIndicator"

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

    // Sanitize and limit input (no trim to allow spaces)
    const handleTitleChange = (value: string): void => {
      // Remove any potential XSS attempts (basic sanitization)
      const sanitized = value.replace(/<script[^>]*>.*?<\/script>/gi, "")
      // Enforce character limit
      const limited = sanitized.slice(0, TITLE_MAX_LENGTH)
      onTitleChange(limited)
    }

    const handleDescriptionChange = (value: string): void => {
      // Remove any potential XSS attempts (basic sanitization)
      const sanitized = value.replace(/<script[^>]*>.*?<\/script>/gi, "")
      // Enforce character limit
      const limited = sanitized.slice(0, DESCRIPTION_MAX_LENGTH)
      onDescriptionChange(limited)
    }

    return (
      <>
        {/* Title */}
        <div className="mt-5 grid w-full items-center gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title">Title</Label>
            <CharacterLimitIndicator
              current={title.length}
              max={TITLE_MAX_LENGTH}
              showThreshold={TITLE_SHOW_THRESHOLD}
            />
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
            <CharacterLimitIndicator
              current={description.length}
              max={DESCRIPTION_MAX_LENGTH}
              showThreshold={DESCRIPTION_SHOW_THRESHOLD}
            />
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
