import {
  BrowserIcon,
  DesktopTowerIcon,
  FrameCornersIcon,
  LinkIcon,
  MonitorIcon
} from "@phosphor-icons/react"
import { memo } from "react"

interface InfoTabProps {
  metadata: {
    url: string
    device: string
    browser: string
    screenResolution: string
    viewportSize: string
  }
}

const InfoTab = memo(({ metadata }: InfoTabProps): JSX.Element => {
  return (
    <div className="h-full overflow-hidden rounded-md border border-gray-100">
      <div
        className="custom-scrollbar h-full overflow-y-auto"
        data-scrollable="true"
        onWheel={(e) => e.stopPropagation()}>
        <div className="space-y-4">
          <div>
            <div className="space-y-2 text-xs">
              <div className="info-row">
                <span className="info-label">
                  {" "}
                  <LinkIcon
                    size={12}
                    weight="duotone"
                    className="text-gray-450"
                  />
                  URL
                </span>
                <div className="info-value-url info-value">{metadata.url}</div>
              </div>
              <div className="info-row">
                <span className="info-label">
                  <DesktopTowerIcon
                    size={12}
                    weight="duotone"
                    className="text-gray-450"
                  />
                  Device
                </span>
                <div className="info-value">{metadata.device}</div>
              </div>
              <div className="info-row">
                <span className="info-label">
                  <BrowserIcon
                    size={12}
                    weight="duotone"
                    className="text-gray-450"
                  />
                  Browser
                </span>
                <div className="info-value">{metadata.browser}</div>
              </div>
              <div className="info-row">
                <span className="info-label">
                  <MonitorIcon
                    size={12}
                    weight="duotone"
                    className="text-gray-450"
                  />
                  Screen Resolution
                </span>
                <div className="info-value">{metadata.screenResolution}</div>
              </div>
              <div className="info-row">
                <span className="info-label">
                  <FrameCornersIcon
                    size={12}
                    weight="duotone"
                    className="text-gray-450"
                  />
                  Viewport Size
                </span>
                <div className="info-value">{metadata.viewportSize}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

InfoTab.displayName = "PixzloDialogInfoTab"

export default InfoTab
