import { useFigmaPreferences } from "@/hooks/use-figma-preferences"
import { composeAnnotatedImage } from "@/lib/compose-image"
import { useFigmaToolbarStore } from "@/stores/figma-toolbar"
import { useLinearDataStore } from "@/stores/linear-data"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import type { IssueData } from "@/types/capture"
import { useCallback } from "react"

interface UseIssueSubmissionReturn {
  handleSubmit: () => void
}

/**
 * Enhanced issue submission hook that saves preferences when creating issues
 * - Saves Figma frame preference for the current website
 * - Saves Linear team and project preferences (not assignee or workflow state)
 */
export const useIssueSubmissionWithPreferences = (
  onSubmit?: (issueData: IssueData) => void,
  linearSelections?: {
    teams?: { id: string; label: string }
    projects?: { id: string; label: string }
    users?: { id: string; label: string }
    workflowStates?: { id: string; label: string }
  }
): UseIssueSubmissionReturn => {
  const { createIssueData } = usePixzloDialogStore()
  const { currentFrame } = useFigmaToolbarStore()
  const { metadata } = useLinearDataStore()
  const { preference: existingFigmaPreference } = useFigmaPreferences()

  const savePreferences = useCallback(async (): Promise<void> => {
    try {
      const currentWebsiteUrl = window.location.href

      // Debug logging for Figma frame state
      console.log("🔍 DEBUG: Current frame state:", {
        currentFrame,
        websiteUrl: currentWebsiteUrl,
        frameId: currentFrame?.id,
        frameName: currentFrame?.name,
        fileId: currentFrame?.fileId
      })

      const shouldUpdateFigmaPreference =
        currentFrame &&
        currentWebsiteUrl &&
        (!existingFigmaPreference ||
          existingFigmaPreference.lastUsedFrameId !== currentFrame.id)

      if (shouldUpdateFigmaPreference) {
        console.log("🎯 Saving Figma frame preference:", currentFrame.name)

        try {
          const response = await new Promise<{
            success: boolean
            error?: string
          }>((resolve) => {
            chrome.runtime.sendMessage(
              {
                type: "figma-update-preference",
                data: {
                  websiteUrl: currentWebsiteUrl,
                  frameId: currentFrame.id,
                  frameName: currentFrame.name,
                  fileId: currentFrame.fileId,
                  frameUrl: currentFrame.figmaUrl,
                  frameImageUrl: currentFrame.imageUrl
                }
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  resolve({
                    success: false,
                    error:
                      chrome.runtime.lastError.message ||
                      "Extension communication error"
                  })
                } else {
                  resolve(response)
                }
              }
            )
          })

          if (response.success) {
            console.log("✅ Figma frame preference saved")
          } else {
            console.error("❌ Failed to save Figma preference:", response.error)
          }
        } catch (error) {
          console.error("❌ Error saving Figma preference:", error)
        }
      }

      // 2. Save Linear preferences (only team and project)
      if (linearSelections) {
        const linearPreferenceData: {
          teamId?: string
          teamName?: string
          projectId?: string
          projectName?: string
        } = {}

        const existingPreference = metadata.preference

        if (
          linearSelections.teams &&
          linearSelections.teams.id !== existingPreference?.lastUsedTeamId
        ) {
          linearPreferenceData.teamId = linearSelections.teams.id
          linearPreferenceData.teamName = linearSelections.teams.label
        }

        if (
          linearSelections.projects &&
          linearSelections.projects.id !== existingPreference?.lastUsedProjectId
        ) {
          linearPreferenceData.projectId = linearSelections.projects.id
          linearPreferenceData.projectName = linearSelections.projects.label
        }

        if (Object.keys(linearPreferenceData).length > 0) {
          console.log("🎯 Saving Linear preferences:", linearPreferenceData)

          try {
            const response = await new Promise<{
              success: boolean
              error?: string
            }>((resolve) => {
              chrome.runtime.sendMessage(
                {
                  type: "linear-update-preference",
                  data: linearPreferenceData
                },
                (response) => {
                  if (chrome.runtime.lastError) {
                    resolve({
                      success: false,
                      error:
                        chrome.runtime.lastError.message ||
                        "Extension communication error"
                    })
                  } else {
                    resolve(response)
                  }
                }
              )
            })

            if (response.success) {
              console.log("✅ Linear preferences saved")
            } else {
              console.error(
                "❌ Failed to save Linear preferences:",
                response.error
              )
            }
          } catch (error) {
            console.error("❌ Error saving Linear preferences:", error)
          }
        }
      }
    } catch (error) {
      console.error("❌ Error in preference saving:", error)
      // Don't block issue creation if preference saving fails
    }
  }, [
    currentFrame,
    linearSelections,
    existingFigmaPreference,
    metadata.preference
  ])

  const handleSubmit = useCallback(() => {
    const issueData = createIssueData()
    if (!issueData) {
      console.error("Failed to create issue data")
      return
    }

    // Prefer background worker submission for security
    const isChrome =
      typeof chrome !== "undefined" && !!chrome.runtime?.sendMessage
    if (isChrome) {
      ;(async () => {
        // Save preferences before creating the issue
        await savePreferences()

        const payload: any = {
          title: issueData.title,
          description: issueData.description,
          priority: issueData.priority,
          metadata: issueData.metadata,
          linearEnabled: !!linearSelections,
          linearOptions: linearSelections
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

          // Add CSS styles data if available (only selected properties)
          if (state.extractedCSS && state.extractedCSS.properties) {
            const selectedProperties = state.selectedProperties
            payload.cssStyles = state.extractedCSS.properties
              .filter((prop) => selectedProperties.has(prop.name))
              .map((prop) => ({
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

            // Add Figma design values to CSS styles if available (only for selected properties)
            if (
              payload.cssStyles &&
              state.figmaContext?.selectedElementProperties
            ) {
              const figmaProps = state.figmaContext.selectedElementProperties
              const selectedProperties = state.selectedProperties
              payload.cssStyles = payload.cssStyles
                .filter((style) => selectedProperties.has(style.property_name))
                .map((style) => {
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
              console.error(
                "Background message error:",
                chrome.runtime.lastError.message
              )
              onSubmit?.(issueData)
              return
            }
            if (!response?.success) {
              console.error("Issue submission failed:", response?.error)
              onSubmit?.(issueData)
              return
            }
            const url = response.data?.issueUrl
            if (url) {
              navigator.clipboard
                ?.writeText(url)
                .then(() => {
                  console.log("✅ Issue URL copied to clipboard:", url)
                  // Show success feedback to user
                  alert(
                    "✅ Issue created successfully! URL copied to clipboard."
                  )
                })
                .catch((err) => {
                  console.error("Failed to copy URL to clipboard:", err)
                  // Show URL to user if clipboard fails
                  alert(`✅ Issue created successfully! URL: ${url}`)
                })
            } else {
              console.log("✅ Issue created successfully (no URL returned)")
              alert("✅ Issue created successfully!")
            }

            // Don't call onSubmit here as it might close the dialog
            // Let the user close the dialog manually after seeing the success message
            console.log(
              "🔍 Issue submission completed - dialog remains open for user"
            )
          }
        )
      })()
      return
    }

    // Fallback: local handler (also save preferences)
    savePreferences().finally(() => {
      onSubmit?.(issueData)
    })
  }, [onSubmit, createIssueData, savePreferences])

  return { handleSubmit }
}
