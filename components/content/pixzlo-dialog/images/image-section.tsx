import type { Screenshot } from "@/types/capture"
import type { DrawingElement } from "@/types/drawing"
import type { FigmaDesignLink } from "@/types/figma"
import { memo } from "react"

import ElementComparisonPreview from "../../element-comparison-preview"
import ImageThumbnailCarousel from "../../image-thumbnail-carousel"
import StandaloneScreenshotPreview from "../../standalone-screenshot-preview"

interface FigmaDesignData {
  imageUrl: string
  designName: string
  figmaUrl: string
}

interface ImageSectionProps {
  screenshots: Screenshot[]
  activeImageIndex: number
  includeFullscreen: boolean
  onImageSelect: (index: number) => void
  onIncludeFullscreenChange: (include: boolean) => void
  onDrawingSave?: (
    imageUrl: string,
    elements: DrawingElement[],
    originalImage: string
  ) => void
  onFigmaDesignSelected?: (designData: {
    imageUrl: string
    designName: string
    figmaUrl: string
  }) => void
  drawingCanvasRef?: React.RefObject<any>
  figmaDesign?: FigmaDesignData | null
  figmaDesigns?: FigmaDesignLink[]
  isLoadingFigmaDesigns?: boolean
}

const ImageSection = memo(
  ({
    screenshots,
    activeImageIndex,
    includeFullscreen,
    onImageSelect,
    onIncludeFullscreenChange,
    onDrawingSave,
    onFigmaDesignSelected,
    drawingCanvasRef,
    figmaDesign,
    figmaDesigns = [],
    isLoadingFigmaDesigns = false
  }: ImageSectionProps): JSX.Element => {
    const currentScreenshot = screenshots[0]
    const isElementCapture = currentScreenshot?.type === "element"

    const isComparisonView = isElementCapture && screenshots.length > 1
    const implementationImage =
      activeImageIndex === 1 && screenshots[1]?.dataUrl
        ? screenshots[1].dataUrl
        : screenshots[0]?.dataUrl || currentScreenshot.dataUrl

    return (
      <div
        className="flex flex-1 flex-col bg-gray-50 p-4"
        style={{ width: "calc(100% - 384px)" }}>
        <div className="flex h-full flex-1 flex-col">
          {/* Main screenshot preview */}
          <div className="flex min-h-0 flex-1 items-center justify-center">
            {isComparisonView ? (
              <ElementComparisonPreview
                currentImage={implementationImage}
                highlightedImage={screenshots[1]?.dataUrl}
                showHighlighted={false}
                onDrawingSave={onDrawingSave}
                onFigmaDesignSelected={onFigmaDesignSelected}
                drawingCanvasRef={drawingCanvasRef}
                className="h-full w-full"
                figmaDesign={figmaDesign}
                figmaDesigns={figmaDesigns}
                isLoadingFigmaDesigns={isLoadingFigmaDesigns}
              />
            ) : (
              <StandaloneScreenshotPreview
                currentImage={implementationImage}
                onDrawingSave={onDrawingSave}
                drawingCanvasRef={drawingCanvasRef}
                className="h-full w-full"
              />
            )}
          </div>

          {/* Bottom thumbnail carousel */}
          {isComparisonView && (
            <div className="w-full">
              <ImageThumbnailCarousel
                images={[
                  {
                    src: screenshots[0]?.dataUrl || currentScreenshot.dataUrl,
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
                onImageSelect={onImageSelect}
              />
            </div>
          )}
        </div>
      </div>
    )
  }
)

ImageSection.displayName = "PixzloDialogImageSection"

export default ImageSection
