import type { ComponentProps } from "react"

import ScreenshotPreviewWithDrawing from "./screenshot-preview-with-drawing"

type ScreenshotPreviewProps = ComponentProps<typeof ScreenshotPreviewWithDrawing>

interface ElementComparisonPreviewProps
  extends Omit<ScreenshotPreviewProps, "hasHighlightedVersion"> {
  highlightedImage?: string
}

const ElementComparisonPreview = (
  props: ElementComparisonPreviewProps
): JSX.Element => {
  return (
    <ScreenshotPreviewWithDrawing
      {...props}
      hasHighlightedVersion={true}
    />
  )
}

export default ElementComparisonPreview
