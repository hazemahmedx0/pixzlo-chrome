import { CSSExtractor } from "@/lib/css-extractor"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import { useEffect } from "react"

export const useCSSExtraction = (): void => {
  const { selectedElement, screenshots, setExtractedCSS } =
    usePixzloDialogStore()

  useEffect(() => {
    if (!selectedElement || !screenshots.length) {
      setExtractedCSS(null)
      return
    }

    const currentScreenshot = screenshots[0]
    const isElementCapture = currentScreenshot?.type === "element"

    if (isElementCapture) {
      try {
        const css = CSSExtractor.extractElementCSS(selectedElement)
        setExtractedCSS(css)
      } catch {
        setExtractedCSS(null)
      }
    } else {
      setExtractedCSS(null)
    }
  }, [selectedElement, screenshots, setExtractedCSS])
}
