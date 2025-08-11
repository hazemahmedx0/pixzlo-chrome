import type { MetadataDisplayProps } from "@/types/ui"
import { Globe, Hash, Monitor, Smartphone } from "lucide-react"
import { memo } from "react"

const MetadataDisplay = memo(
  ({
    url,
    device,
    browser,
    screenResolution,
    viewportSize
  }: MetadataDisplayProps) => {
    const metadataItems = [
      {
        icon: Globe,
        label: "URL",
        value: url,
        className: "col-span-2"
      },
      {
        icon: Monitor,
        label: "Device & OS",
        value: device
      },
      {
        icon: Hash,
        label: "Browser",
        value: browser
      },
      {
        icon: Monitor,
        label: "Screen Resolution",
        value: screenResolution
      },
      {
        icon: Smartphone,
        label: "Viewport Size",
        value: viewportSize
      }
    ]

    return (
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Hash size={16} />
          Metadata
        </h4>

        <div className="grid grid-cols-2 gap-3">
          {metadataItems.map(({ icon: Icon, label, value, className }) => (
            <div key={label} className={`space-y-1 ${className || ""}`}>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Icon size={12} />
                <span>{label}</span>
              </div>
              <div className="rounded border bg-gray-50 px-2 py-1 text-sm text-gray-900">
                {label === "URL" ? (
                  <span className="break-all" title={value}>
                    {value.length > 50 ? `${value.slice(0, 50)}...` : value}
                  </span>
                ) : (
                  <span>{value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
)

MetadataDisplay.displayName = "MetadataDisplay"

export default MetadataDisplay
