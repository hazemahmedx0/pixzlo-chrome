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
    return (
      <>
        {/* Title */}
        <div className="mt-5 grid w-full items-center gap-2">
          <Label htmlFor="title">Title</Label>
          <Input type="text" id="title" placeholder="Untitled issue" />
        </div>

        {/* Description */}
        <div className="mt-3 grid w-full items-center gap-2">
          <Label htmlFor="description">description</Label>
          <Textarea id="title" placeholder="description" />
        </div>
      </>
    )
  }
)

FormSection.displayName = "PixzloDialogFormSection"

export default FormSection
