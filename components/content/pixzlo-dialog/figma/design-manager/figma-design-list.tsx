import { Button } from "@/components/ui/button"
import type { FigmaDesignLink } from "@/types/figma"
import { ExternalLink, Link2, Plus, Trash2 } from "lucide-react"
import { memo } from "react"

interface FigmaDesignListProps {
  existingDesigns: FigmaDesignLink[]
  onAddDesignClick: () => void
  onDesignSelect: (design: FigmaDesignLink) => void
  onDeleteDesign: (designId: string) => Promise<void>
  onClose: () => void
}

/**
 * Component for displaying and managing the list of existing Figma design links
 */
const FigmaDesignList = memo(
  ({
    existingDesigns,
    onAddDesignClick,
    onDesignSelect,
    onDeleteDesign,
    onClose
  }: FigmaDesignListProps): JSX.Element => {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Figma Designs
            </h2>
            <p className="text-sm text-gray-600">
              Manage design links for this page
            </p>
          </div>
          <Button onClick={onAddDesignClick} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Design
          </Button>
        </div>

        {existingDesigns.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Link2 className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mb-2 text-sm font-medium text-gray-900">
              No Design Reference Linked
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              Connect your Figma file to compare the design with your
              implementation and ensure visual accuracy.
            </p>
            <Button onClick={onAddDesignClick}>Link Figma File</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {existingDesigns.map((design) => (
              <div
                key={design.id}
                className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                <div className="flex-shrink-0">
                  {design.thumbnail_url ? (
                    <img
                      src={design.thumbnail_url}
                      alt={design.frame_name || "Design"}
                      className="h-16 w-24 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-24 items-center justify-center rounded bg-gray-100">
                      <div className="text-2xl">🎨</div>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {design.frame_name || "Untitled Design"}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Created {new Date(design.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDesignSelect(design)}>
                    Select
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(design.frame_url, "_blank")}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteDesign(design.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    )
  }
)

FigmaDesignList.displayName = "FigmaDesignList"

export default FigmaDesignList
