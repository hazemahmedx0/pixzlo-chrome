import { toast } from "@/components/ui/sonner"
import { useFigmaPreferences } from "@/hooks/use-figma-preferences"
import { composeAnnotatedImage } from "@/lib/compose-image"
import { FigmaService } from "@/lib/figma-service"
import { useFigmaToolbarStore } from "@/stores/figma-toolbar"
import { useLinearDataStore } from "@/stores/linear-data"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import type { IssueData } from "@/types/capture"
import { useCallback, useState } from "react"

interface UseIssueSubmissionReturn {
  handleSubmit: () => void
  isSubmitting: boolean
}

export interface IssueCreatedResult {
  issueUrl?: string
  trackedIssueUrl?: string
  copiedToClipboard?: boolean
}

const ISSUE_URL_UTM = {
  source: "pixzlo_extension",
  medium: "chrome_extension",
  campaign: "issue_created",
  content: "view_issue"
}

function buildTrackedIssueUrl(issueUrl: string): string {
  try {
    const trackedUrl = new URL(issueUrl)
    trackedUrl.searchParams.set("utm_source", ISSUE_URL_UTM.source)
    trackedUrl.searchParams.set("utm_medium", ISSUE_URL_UTM.medium)
    trackedUrl.searchParams.set("utm_campaign", ISSUE_URL_UTM.campaign)
    trackedUrl.searchParams.set("utm_content", ISSUE_URL_UTM.content)
    return trackedUrl.toString()
  } catch {
    return issueUrl
  }
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
  },
  onIssueCreated?: (result?: IssueCreatedResult) => void
): UseIssueSubmissionReturn => {
  const createIssueData = usePixzloDialogStore((state) => state.createIssueData)
  const { currentFrame } = useFigmaToolbarStore()
  const { metadata } = useLinearDataStore()
  const { preference: existingFigmaPreference } = useFigmaPreferences()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const persistFigmaLinkAfterIssue = useCallback(async (): Promise<void> => {
    try {
      const dialogState = usePixzloDialogStore.getState()
      const figmaContext = dialogState.figmaContext
      const figmaUrl =
        dialogState.figmaDesign?.figmaUrl || figmaContext?.figmaUrl
      const fileId = figmaContext?.fileId
      const frameId = figmaContext?.frameId

      if (!figmaUrl || !fileId || !frameId) {
        return
      }

      const localDesigns = dialogState.localFigmaDesigns ?? []
      const localMatch = localDesigns.find(
        (design) =>
          design.figma_frame_id === frameId || design.frame_url === figmaUrl
      )
      if (!localMatch) {
        return
      }

      const figmaService = FigmaService.getInstance()
      const response = await figmaService.createDesignLink({
        figma_file_id: fileId,
        figma_frame_id: frameId,
        frame_name: localMatch.frame_name || figmaContext?.frameData?.name,
        frame_url: figmaUrl,
        thumbnail_url: localMatch.thumbnail_url
      })

      if (response.success) {
        usePixzloDialogStore.getState().setNeedsFigmaMetadataRefresh(true)
      }
    } catch {
      // Don't block issue creation if link persistence fails
    }
  }, [])

  const savePreferences = useCallback(async (): Promise<void> => {
    try {
      // Use getPageUrl() to get the correct URL in tab page context
      const currentWebsiteUrl = usePixzloDialogStore.getState().getPageUrl()

      const preferredFrameId =
        currentFrame?.figmaFrameId ?? currentFrame?.id ?? null

      const shouldUpdateFigmaPreference =
        currentFrame &&
        currentWebsiteUrl &&
        (!existingFigmaPreference ||
          existingFigmaPreference.lastUsedFrameId !== preferredFrameId)

      if (shouldUpdateFigmaPreference) {
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
                  frameId: preferredFrameId || currentFrame.id,
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
        } catch {
          // Error saving Figma preference
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
          try {
            await new Promise<{
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
          } catch {
            // Error saving Linear preferences
          }
        }
      }
    } catch {
      // Error in preference saving
      // Don't block issue creation if preference saving fails
    }
  }, [
    currentFrame,
    linearSelections,
    existingFigmaPreference,
    metadata.preference
  ])

  const handleSubmit = useCallback(() => {
    if (isSubmitting) return
    setIsSubmitting(true)

    const issueData = createIssueData()
    if (!issueData) {
      setIsSubmitting(false)
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

          // Export drawing overlay on demand to avoid expensive per-stroke
          // background exports while keeping submission images current.
          let overlay = state.drawingOverlayDataUrl || null
          if (state.drawingOverlayExporter) {
            try {
              const latestOverlay = state.drawingOverlayExporter()
              if (latestOverlay) {
                overlay = latestOverlay
                state.setDrawingOverlayDataUrl(latestOverlay)
              }
            } catch {
              // Fall back to cached overlay if export fails.
            }
          }

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
            const finalizeIssueCreation = (
              result?: IssueCreatedResult
            ): void => {
              setIsSubmitting(false)

              // Persist new Figma link only after issue creation succeeds
              void persistFigmaLinkAfterIssue()

              if (onIssueCreated) {
                onIssueCreated(result)
                return
              }

              toast.success("Issue created successfully!", {
                description: result?.copiedToClipboard
                  ? "URL copied to clipboard"
                  : undefined
              })
            }

            if (chrome.runtime.lastError) {
              onSubmit?.(issueData)
              setIsSubmitting(false)
              return
            }
            if (!response?.success) {
              onSubmit?.(issueData)
              setIsSubmitting(false)
              return
            }

            const issueUrl = response.data?.issueUrl
            const trackedIssueUrl = issueUrl
              ? buildTrackedIssueUrl(issueUrl)
              : undefined

            if (!issueUrl || !navigator.clipboard?.writeText) {
              finalizeIssueCreation({ issueUrl, trackedIssueUrl })
              return
            }

            navigator.clipboard
              .writeText(issueUrl)
              .then(() => {
                finalizeIssueCreation({
                  issueUrl,
                  trackedIssueUrl,
                  copiedToClipboard: true
                })
              })
              .catch(() => {
                finalizeIssueCreation({ issueUrl, trackedIssueUrl })
              })
          }
        )
      })()
      return
    }

    // Fallback: local handler (also save preferences)
    savePreferences().finally(() => {
      onSubmit?.(issueData)
      setIsSubmitting(false)
    })
  }, [
    onSubmit,
    createIssueData,
    savePreferences,
    isSubmitting,
    onIssueCreated,
    persistFigmaLinkAfterIssue
  ])

  return { handleSubmit, isSubmitting }
}
