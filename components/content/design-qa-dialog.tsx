import { Button } from "@/components/ui/button"
import FormField from "@/components/ui/form-field"
import { CSSExtractor, type ExtractedCSS } from "@/lib/css-extractor"
import type { IssueData, Screenshot } from "@/types/capture"
import { X } from "lucide-react"
import { memo, useCallback, useEffect, useState } from "react"

import ImageThumbnailCarousel from "./image-thumbnail-carousel"
import ScreenshotPreview from "./screenshot-preview"

interface DesignQADialogProps {
  screenshots: Screenshot[]
  isOpen: boolean
  onClose: () => void
  onSubmit?: (issueData: IssueData) => void
  selectedElement?: HTMLElement
}

const DesignQADialog = memo(
  ({
    screenshots,
    isOpen,
    onClose,
    onSubmit,
    selectedElement
  }: DesignQADialogProps) => {
    const [activeTab, setActiveTab] = useState("styling")
    const [activeImageIndex, setActiveImageIndex] = useState(0)
    const [includeFullscreen, setIncludeFullscreen] = useState(true)
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [extractedCSS, setExtractedCSS] = useState<ExtractedCSS | null>(null)

    const currentScreenshot = screenshots[0]
    const isElementCapture = currentScreenshot?.type === "element"
    const showDesignReference = isElementCapture
    const showStylingTab = isElementCapture

    // Set initial tab based on capture type
    useEffect(() => {
      if (!showStylingTab) {
        setActiveTab("info")
      } else {
        setActiveTab("styling")
      }
    }, [showStylingTab])

    // Extract CSS properties when element is provided
    useEffect(() => {
      if (selectedElement && isElementCapture) {
        const css = CSSExtractor.extractElementCSS(selectedElement)
        setExtractedCSS(css)
      }
    }, [selectedElement, isElementCapture])

    const handleSubmit = useCallback(() => {
      if (!onSubmit || !currentScreenshot?.metadata) return

      const issueData: IssueData = {
        title: title || "Untitled Issue",
        description,
        priority: "urgent",
        screenshots,
        metadata: currentScreenshot.metadata
      }

      onSubmit(issueData)
    }, [title, description, screenshots, currentScreenshot, onSubmit])

    if (!isOpen || !currentScreenshot) return null

    return (
      <div
        className="fixed inset-0 z-[2147483647] flex h-screen items-center justify-center bg-black/50 p-8 backdrop-blur-md"
        data-pixzlo-ui="design-qa-dialog"
        style={{
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
        }}>
        <div className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-white shadow-lg">
          <div className="flex h-full flex-col">
            {/* Header */}
            <header className="border-b border-gray-200">
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={onClose}
                    className="relative flex h-10 w-10 items-center justify-center rounded-sm text-gray-600 hover:bg-gray-100">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2"></div>
              </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
              {/* Left side - Images */}
              <div
                className="flex flex-1 flex-col bg-gray-100 p-6"
                style={{ width: "calc(100% - 384px)" }}>
                <div className="flex h-full flex-1 flex-col gap-4">
                  {/* Main screenshot preview */}
                  <div className="flex flex-1 items-center justify-center overflow-hidden">
                    <ScreenshotPreview
                      currentImage={
                        screenshots[activeImageIndex]?.dataUrl ||
                        currentScreenshot.dataUrl
                      }
                      hasHighlightedVersion={
                        isElementCapture && screenshots.length > 1
                      }
                      showHighlighted={activeImageIndex === 1}
                      highlightedImage={screenshots[1]?.dataUrl}
                      onAddFigmaDesign={() => {
                        // TODO: Implement Figma design upload
                        console.log("Add Figma design clicked")
                      }}
                      className="h-full"
                    />
                  </div>

                  {/* Bottom thumbnail carousel */}
                  {isElementCapture && screenshots.length > 1 && (
                    <div className="w-full">
                      <ImageThumbnailCarousel
                        images={[
                          {
                            src:
                              screenshots[0]?.dataUrl ||
                              currentScreenshot.dataUrl,
                            label: "Clean screenshot",
                            isActive: activeImageIndex === 0
                          },
                          ...(screenshots[1]
                            ? [
                                {
                                  src: screenshots[1].dataUrl,
                                  label: "With highlight",
                                  isActive: activeImageIndex === 1
                                }
                              ]
                            : [])
                        ]}
                        onImageSelect={setActiveImageIndex}
                        includeFullscreen={includeFullscreen}
                        onIncludeFullscreenChange={setIncludeFullscreen}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div
                className="w-1 cursor-col-resize bg-gray-200 transition-colors hover:bg-gray-300"
                style={{ minWidth: "4px", zIndex: 10 }}></div>

              {/* Right side - Form and Details */}
              <div
                className="border-l border-gray-200 bg-white"
                style={{ width: "384px", minWidth: "400px" }}>
                <div className="flex h-full flex-col">
                  {/* Title */}
                  <div className="border-b border-gray-200 p-4">
                    <FormField
                      type="input"
                      placeholder="Issue title"
                      value={title}
                      onChange={setTitle}
                      inputClassName="border-0 px-0 text-lg font-medium placeholder:text-gray-400 focus-visible:ring-0"
                    />
                  </div>

                  {/* Description */}
                  <div
                    className="min-h-1/4 flex flex-col overflow-hidden"
                    style={{ height: "200px" }}>
                    <div className="flex flex-1 overflow-y-auto overflow-x-hidden">
                      <div className="relative flex h-full w-full flex-col">
                        <FormField
                          type="textarea"
                          placeholder="Describe the issue"
                          value={description}
                          onChange={setDescription}
                          inputClassName="w-full flex-1 resize-none rounded-lg border-0 bg-transparent p-4 text-lg text-gray-900 placeholder-gray-500 outline-none focus:border-transparent focus-visible:ring-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div
                    className="h-1 w-full cursor-row-resize bg-gray-200 transition-colors hover:bg-gray-300"
                    style={{ minHeight: "4px", zIndex: 10 }}></div>

                  {/* Tabs section */}
                  <div className="flex-1 overflow-hidden p-2">
                    <div className="flex h-full flex-col gap-3">
                      <div className="flex h-full w-full flex-col gap-2">
                        {/* Tab buttons */}
                        <div className="inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-600">
                          {showStylingTab && (
                            <button
                              onClick={() => setActiveTab("styling")}
                              className={`inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
                                activeTab === "styling"
                                  ? "bg-white text-gray-900 shadow-sm"
                                  : "hover:text-gray-900"
                              }`}>
                              Styling
                            </button>
                          )}
                          <button
                            onClick={() => setActiveTab("info")}
                            className={`inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
                              activeTab === "info"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "hover:text-gray-900"
                            }`}>
                            Info
                          </button>
                        </div>

                        {/* Tab content */}
                        <div className="min-h-0 flex-1">
                          {activeTab === "styling" &&
                            showStylingTab &&
                            extractedCSS && (
                              <div className="flex h-full flex-col rounded-md border border-gray-200 bg-white">
                                <div className="flex h-full flex-col rounded-sm pt-0">
                                  {/* Table header */}
                                  <div className="sticky top-0 z-10 grid grid-cols-[120px_1fr_1fr] rounded-t-sm border-b border-gray-200 px-3 py-1.5 text-xs font-medium uppercase text-gray-700">
                                    <div className="z-15 sticky left-0">
                                      <div>PROPERTY</div>
                                    </div>
                                    <div>
                                      <div className="relative inline-block text-left">
                                        <button className="flex w-full items-center justify-center text-xs font-medium uppercase text-gray-700">
                                          CODE (R)
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <div>DESIGN</div>
                                    </div>
                                  </div>

                                  {/* Property rows */}
                                  <div className="flex-1 overflow-y-auto">
                                    <div className="flex flex-col">
                                      {extractedCSS.properties.map(
                                        (property, index) => (
                                          <div
                                            key={index}
                                            className="grid grid-cols-[120px_1fr_1fr] gap-2 border-b border-gray-100 px-3 py-2 text-xs text-gray-600 last:border-b-0 hover:bg-gray-100">
                                            <div className="z-5 sticky left-0 flex items-start break-all pt-0.5 font-medium text-gray-700">
                                              {property.name}
                                            </div>
                                            <div className="code-column">
                                              <div className="flex items-start gap-1 truncate text-wrap text-red-600">
                                                {property.color && (
                                                  <div
                                                    className="h-4 w-4 flex-shrink-0 rounded-[2px] ring-1 ring-inset ring-black/10"
                                                    style={CSSExtractor.getColorStyle(
                                                      property
                                                    )}
                                                  />
                                                )}
                                                {CSSExtractor.formatValue(
                                                  property
                                                )}
                                              </div>
                                            </div>
                                            <div className="design-column">
                                              <div className="flex items-center truncate text-gray-700">
                                                <span className="text-sm italic text-gray-400">
                                                  undefined
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                          {activeTab === "info" &&
                            currentScreenshot.metadata && (
                              <div className="h-full rounded-md border border-gray-200 bg-white p-4">
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="mb-2 text-sm font-medium text-gray-700">
                                      Page Information
                                    </h4>
                                    <div className="space-y-2 text-xs">
                                      <div>
                                        <span className="text-gray-500">
                                          URL:
                                        </span>
                                        <div className="mt-1 break-all rounded bg-gray-50 p-2">
                                          {currentScreenshot.metadata.url}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">
                                          Device:
                                        </span>
                                        <div className="mt-1 rounded bg-gray-50 p-2">
                                          {currentScreenshot.metadata.device}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">
                                          Browser:
                                        </span>
                                        <div className="mt-1 rounded bg-gray-50 p-2">
                                          {currentScreenshot.metadata.browser}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">
                                          Screen Resolution:
                                        </span>
                                        <div className="mt-1 rounded bg-gray-50 p-2">
                                          {
                                            currentScreenshot.metadata
                                              .screenResolution
                                          }
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">
                                          Viewport Size:
                                        </span>
                                        <div className="mt-1 rounded bg-gray-50 p-2">
                                          {
                                            currentScreenshot.metadata
                                              .viewportSize
                                          }
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer buttons */}
                  <div className="p-4 pt-0">
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                        Create &amp; copy link
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

DesignQADialog.displayName = "DesignQADialog"

export default DesignQADialog
