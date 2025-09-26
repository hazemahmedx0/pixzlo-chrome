import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { memo } from "react"

interface FooterProps {
  onCancel: () => void
  onSubmit: () => void
  onDownload?: () => void
}

const Footer = memo(
  ({ onCancel, onSubmit, onDownload }: FooterProps): JSX.Element => {
    return (
      <div className="p-4 pt-0">
        <div className="flex items-center justify-between">
          {/* Left side - Download button */}
          <div>
            {onDownload && (
              <Button
                variant="outline"
                onClick={onDownload}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                <Download size={16} />
                Download
              </Button>
            )}
          </div>

          {/* Right side - Original buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              Create &amp; copy link
            </Button>
          </div>
        </div>
      </div>
    )
  }
)

Footer.displayName = "PixzloDialogFooter"

export default Footer
