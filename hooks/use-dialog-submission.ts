import { composeAnnotatedImage } from "@/lib/compose-image"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import type { IssueData } from "@/types/capture"
import { useCallback } from "react"

interface UseDialogSubmissionReturn {
  handleSubmit: () => void
}

export const useDialogSubmission = (
  onSubmit?: (issueData: IssueData) => void
): UseDialogSubmissionReturn => {
  const { createIssueData } = usePixzloDialogStore()

  const handleSubmit = useCallback(() => {
    const issueData = createIssueData()
    if (!issueData) {
      return
    }

    // Prefer background worker submission for security
    const isChrome =
      typeof chrome !== "undefined" && !!chrome.runtime?.sendMessage
    if (isChrome) {
      ;(async () => {
        const payload: any = {
          title: issueData.title,
          description: issueData.description,
          priority: issueData.priority,
          metadata: issueData.metadata
          // Images should be filled by caller via window context if available
        }

        // Attempt to collect images from current store if available
        try {
          const state = usePixzloDialogStore.getState()
          const screenshots = state.screenshots
          payload.isElementCapture = screenshots?.[0]?.type === "element"

          // For element captures: use highlighted version if available, fallback to clean version
          const highlightedImage =
            screenshots?.[1]?.compositeImageUrl ||
            screenshots?.[1]?.dataUrl ||
            screenshots?.[0]?.compositeImageUrl ||
            screenshots?.[0]?.dataUrl
          const baseImage =
            screenshots?.[state.activeImageIndex || 0]?.compositeImageUrl ||
            screenshots?.[0]?.dataUrl

          // Prefer Konva overlay export when available to ensure drawings are preserved
          const overlay = state.drawingOverlayDataUrl || null

          // Create annotated image with drawings
          let annotated: string | undefined = baseImage
          try {
            if (baseImage && overlay) {
              annotated = await composeAnnotatedImage(baseImage, overlay)
            }
          } catch {}

          payload.images = {
            clean: highlightedImage, // Use highlighted version (screenshots[1]) for "element" type upload
            annotated // Image with drawings applied for "main" type upload
          }

          // Add CSS styles data if available
          if (state.extractedCSS && state.extractedCSS.properties) {
            payload.cssStyles = state.extractedCSS.properties.map((prop) => ({
              property_name: prop.name,
              implemented_value: prop.computedValue || prop.value,
              design_value: undefined, // Will be filled from Figma if available
              unit:
                prop.name.includes("width") ||
                prop.name.includes("height") ||
                prop.name.includes("margin") ||
                prop.name.includes("padding") ||
                prop.name.includes("font-size") ||
                prop.name.includes("border-radius")
                  ? "px"
                  : undefined,
              notes:
                prop.rawValue !== prop.computedValue
                  ? `Raw: ${prop.rawValue}`
                  : undefined
            }))
          }

          // Add Figma context data
          if (state.figmaDesign || state.figmaContext) {
            payload.figma = {
              imageUrl: state.figmaDesign?.imageUrl,
              figmaUrl:
                state.figmaDesign?.figmaUrl || state.figmaContext?.figmaUrl,
              fileId: state.figmaContext?.fileId,
              frameId: state.figmaContext?.frameId,
              frameName: state.figmaContext?.frameData?.name,
              thumbnailUrl: undefined
            }

            // Add Figma design values to CSS styles if available
            if (
              payload.cssStyles &&
              state.figmaContext?.selectedElementProperties
            ) {
              const figmaProps = state.figmaContext.selectedElementProperties
              payload.cssStyles = payload.cssStyles.map((style) => {
                // Map common properties from Figma to CSS
                let designValue = undefined
                switch (style.property_name) {
                  case "width":
                    designValue = figmaProps.width
                      ? `${figmaProps.width}px`
                      : undefined
                    break
                  case "height":
                    designValue = figmaProps.height
                      ? `${figmaProps.height}px`
                      : undefined
                    break
                  case "font-family":
                    designValue = figmaProps.fontFamily
                    break
                  case "font-size":
                    designValue = figmaProps.fontSize
                      ? `${figmaProps.fontSize}px`
                      : undefined
                    break
                  case "font-weight":
                    designValue = figmaProps.fontWeight?.toString()
                    break
                  case "color":
                    designValue = figmaProps.color
                    break
                  case "background-color":
                    designValue = figmaProps.backgroundColor
                    break
                  case "border-radius":
                    designValue = figmaProps.borderRadius
                      ? `${figmaProps.borderRadius}px`
                      : undefined
                    break
                  case "padding":
                    designValue = figmaProps.padding
                      ? `${figmaProps.padding}px`
                      : undefined
                    break
                  case "margin":
                    designValue = figmaProps.margin
                      ? `${figmaProps.margin}px`
                      : undefined
                    break
                }

                return {
                  ...style,
                  design_value: designValue
                }
              })
            }
          }

          // Add browser info
          payload.browserInfo = {
            name: navigator.userAgent.includes("Chrome")
              ? "Chrome"
              : navigator.userAgent.includes("Firefox")
                ? "Firefox"
                : navigator.userAgent.includes("Safari")
                  ? "Safari"
                  : navigator.userAgent.includes("Edge")
                    ? "Edge"
                    : "Unknown",
            version: navigator.appVersion,
            userAgent: navigator.userAgent
          }
        } catch {}

        chrome.runtime.sendMessage(
          { type: "SUBMIT_ISSUE", payload },
          (response?: {
            success: boolean
            data?: { issueUrl: string }
            error?: string
          }) => {
            if (chrome.runtime.lastError) {
              onSubmit?.(issueData)
              return
            }
            if (!response?.success) {
              onSubmit?.(issueData)
              return
            }
            const url = response.data?.issueUrl
            if (url) {
              navigator.clipboard
                ?.writeText(url)
                .then(() => {
                  // Show success feedback to user
                  alert(
                    "Issue created successfully! URL copied to clipboard."
                  )
                })
                .catch(() => {
                  // Show URL to user if clipboard fails
                  alert(`Issue created successfully! URL: ${url}`)
                })
            } else {
              alert("Issue created successfully!")
            }

            // Don't call onSubmit here as it might close the dialog
            // Let the user close the dialog manually after seeing the success message
          }
        )
      })()
      return
    }

    // Fallback: local handler
    onSubmit?.(issueData)
  }, [onSubmit, createIssueData])

  return { handleSubmit }
}
