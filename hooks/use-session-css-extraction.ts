import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import type { SerializedElementInfo } from "@/types/session"
import { useEffect } from "react"

/**
 * Hook for setting CSS extraction from serialized element info
 * Used in the tab page context where we don't have access to the live HTMLElement
 */
export const useSessionCSSExtraction = (
  elementInfo?: SerializedElementInfo
): void => {
  const screenshots = usePixzloDialogStore((state) => state.screenshots)
  const setExtractedCSS = usePixzloDialogStore((state) => state.setExtractedCSS)

  useEffect(() => {
    if (!elementInfo || !screenshots.length) {
      setExtractedCSS(null)
      return
    }

    const currentScreenshot = screenshots[0]
    const isElementCapture = currentScreenshot?.type === "element"

    if (isElementCapture && elementInfo.extractedCSS) {
      // Use the pre-extracted CSS from the serialized element info
      setExtractedCSS(elementInfo.extractedCSS)
    } else {
      setExtractedCSS(null)
    }
  }, [elementInfo, screenshots, setExtractedCSS])
}
