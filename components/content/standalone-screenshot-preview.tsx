import type { ComponentProps } from "react"

import ScreenshotPreviewWithDrawing from "./screenshot-preview-with-drawing"

type ScreenshotPreviewProps = ComponentProps<typeof ScreenshotPreviewWithDrawing>

const StandaloneScreenshotPreview = (
  props: Omit<ScreenshotPreviewProps, "hasHighlightedVersion">
): JSX.Element => {
  return (
    <ScreenshotPreviewWithDrawing
      {...props}
      hasHighlightedVersion={false}
      showHighlighted={false}
    />
  )
}

export default StandaloneScreenshotPreview
