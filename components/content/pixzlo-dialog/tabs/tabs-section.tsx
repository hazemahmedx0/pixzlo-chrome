import type { ExtractedCSS } from "@/lib/css-extractor"
import type { TabType } from "@/stores/pixzlo-dialog"
import type { Screenshot } from "@/types/capture"
import { memo } from "react"

import InfoTab from "../info-tab"
import StylingTab from "../styling-tab"

interface FigmaProperties {
  width?: number
  height?: number
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  color?: string
  backgroundColor?: string
  borderRadius?: number
  padding?: number
  margin?: number
  [key: string]: any
}

interface TabsSectionProps {
  activeTab: TabType
  showStylingTab: boolean
  extractedCSS: ExtractedCSS | null
  currentScreenshot: Screenshot
  onTabChange: (tab: TabType) => void
  figmaProperties?: FigmaProperties | null
}

const TabsSection = memo(
  ({
    activeTab,
    showStylingTab,
    extractedCSS,
    currentScreenshot,
    onTabChange,
    figmaProperties
  }: TabsSectionProps): JSX.Element => {
    return (
      <div className="mt-2 flex-1 overflow-hidden rounded-lg !bg-gray-75 p-2">
        <div className="flex h-full flex-col gap-3">
          <div className="flex h-full w-full flex-col gap-2">
            {/* Tab buttons */}
            <div className="inline-flex h-10 items-center justify-center rounded-xl text-paragraph-sm text-gray-600">
              {showStylingTab && (
                <button
                  onClick={() => onTabChange("styling")}
                  className={`inline-flex h-full flex-1 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 transition-all ${
                    activeTab === "styling"
                      ? "bg-gray-150 text-gray-900"
                      : "hover:bg-gray-100 hover:text-gray-900"
                  }`}>
                  Styling
                </button>
              )}
              <button
                onClick={() => onTabChange("info")}
                className={`inline-flex h-full flex-1 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 transition-all ${
                  activeTab === "info"
                    ? "bg-gray-150 text-gray-900"
                    : "hover:bg-gray-100 hover:text-gray-900"
                }`}>
                Info
              </button>
            </div>

            {/* Tab content */}
            <div className="min-h-0 flex-1">
              {activeTab === "styling" && showStylingTab && extractedCSS && (
                <StylingTab
                  extractedCSS={extractedCSS}
                  figmaProperties={figmaProperties}
                />
              )}

              {activeTab === "info" && currentScreenshot.metadata && (
                <InfoTab metadata={currentScreenshot.metadata} />
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
)

TabsSection.displayName = "PixzloDialogTabsSection"

export default TabsSection
