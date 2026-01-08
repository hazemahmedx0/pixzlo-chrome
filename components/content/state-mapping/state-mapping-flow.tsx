/**
 * State Mapping Flow
 *
 * Main orchestrator component for the state mapping feature.
 * Handles the flow from element selection to rule creation.
 */

import { Button } from "@/components/ui/button"
import { FigmaService } from "@/lib/figma-service"
import {
  generateSelector,
  generateSelectorLabel
} from "@/lib/selector-generator"
import { useFigmaDataStore } from "@/stores/figma-data"
import { useStateMappingStore } from "@/stores/state-mapping-store"
import type { StateCondition } from "@/types/state-mapping"
import {
  ArrowLeft,
  CheckCircle,
  Plus,
  Trash,
  WarningCircle,
  X
} from "@phosphor-icons/react"
import { AlertCircle, Loader2 } from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"

interface StateMappingFlowProps {
  onClose: () => void
}

const StateMappingFlow = memo(
  ({ onClose }: StateMappingFlowProps): JSX.Element => {
    const {
      flowState,
      addCondition,
      removeCondition,
      setRuleName,
      setConditionLogic,
      setSelectedFigmaLinkId,
      setFlowStep,
      setFlowError,
      resetFlow,
      createRule
    } = useStateMappingStore()

    const { metadata, refreshMetadata } = useFigmaDataStore()
    const designLinks = metadata.designLinks ?? []

    const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(
      null
    )
    const [isSaving, setIsSaving] = useState(false)
    const overlayRef = useRef<HTMLDivElement>(null)
    const highlightRef = useRef<HTMLDivElement>(null)

    // Figma URL input state
    const [showFigmaInput, setShowFigmaInput] = useState(false)
    const [figmaUrl, setFigmaUrl] = useState("")
    const [isAddingFigma, setIsAddingFigma] = useState(false)
    const [figmaError, setFigmaError] = useState<string | null>(null)

    const figmaService = useMemo(() => FigmaService.getInstance(), [])
    const currentWebsiteUrl = useMemo(() => {
      const url = new URL(window.location.href)
      return url.origin + url.pathname
    }, [])

    // ========================================================================
    // Element Selection Mode
    // ========================================================================

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (flowState.step !== "selecting-element") return

        const overlay = overlayRef.current
        const highlight = highlightRef.current
        if (!overlay || !highlight) return

        // Temporarily hide overlay for hit test
        overlay.style.pointerEvents = "none"
        const el = document.elementFromPoint(
          e.clientX,
          e.clientY
        ) as HTMLElement | null
        overlay.style.pointerEvents = "auto"

        // Exclude extension UI elements
        const isExtensionUI = el?.closest("[data-pixzlo-ui]")
        if (!el || el === document.body || isExtensionUI) {
          highlight.style.display = "none"
          setHoveredElement(null)
          return
        }

        const rect = el.getBoundingClientRect()
        highlight.style.display = "block"
        highlight.style.left = `${rect.left}px`
        highlight.style.top = `${rect.top}px`
        highlight.style.width = `${rect.width}px`
        highlight.style.height = `${rect.height}px`
        setHoveredElement(el)
      },
      [flowState.step]
    )

    const handleClick = useCallback(
      (e: MouseEvent) => {
        if (flowState.step !== "selecting-element") return
        if (!hoveredElement) return

        // Ignore clicks on extension UI
        const target = e.target as HTMLElement
        if (target.closest("[data-pixzlo-ui]")) return

        e.preventDefault()
        e.stopPropagation()

        // Generate selector and add condition
        const selector = generateSelector(hoveredElement)
        const label = generateSelectorLabel(hoveredElement)

        const condition: StateCondition = {
          id: crypto.randomUUID(),
          selector,
          label,
          operator: "exists"
        }

        addCondition(condition)

        // Hide highlight
        if (highlightRef.current) {
          highlightRef.current.style.display = "none"
        }
        setHoveredElement(null)
      },
      [flowState.step, hoveredElement, addCondition]
    )

    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          if (flowState.step === "selecting-element") {
            if (flowState.selectedConditions.length > 0) {
              setFlowStep("configuring-rule")
            } else {
              onClose()
            }
          }
        }
      },
      [
        flowState.step,
        flowState.selectedConditions.length,
        setFlowStep,
        onClose
      ]
    )

    // Set up event listeners for element selection
    useEffect(() => {
      if (flowState.step === "selecting-element") {
        document.addEventListener("mousemove", handleMouseMove, {
          passive: true
        })
        document.addEventListener("click", handleClick, { capture: true })
        document.addEventListener("keydown", handleKeyDown)

        return () => {
          document.removeEventListener("mousemove", handleMouseMove)
          document.removeEventListener("click", handleClick, { capture: true })
          document.removeEventListener("keydown", handleKeyDown)
        }
      }
    }, [flowState.step, handleMouseMove, handleClick, handleKeyDown])

    // ========================================================================
    // Rule Actions
    // ========================================================================

    const handleAddAnotherCondition = useCallback(() => {
      setFlowStep("selecting-element")
    }, [setFlowStep])

    const handleSaveRule = useCallback(async () => {
      if (!flowState.ruleName.trim()) {
        setFlowError("Please enter a rule name")
        return
      }

      if (!flowState.selectedFigmaLinkId) {
        setFlowError("Please select a Figma frame")
        return
      }

      if (flowState.selectedConditions.length === 0) {
        setFlowError("Please add at least one condition")
        return
      }

      setIsSaving(true)
      setFlowError(null)

      const rule = await createRule({
        pageUrl: window.location.href,
        figmaLinkId: flowState.selectedFigmaLinkId,
        name: flowState.ruleName.trim(),
        conditions: flowState.selectedConditions,
        conditionLogic: flowState.conditionLogic
      })

      setIsSaving(false)

      if (rule) {
        resetFlow()
        onClose()
      }
    }, [
      flowState.ruleName,
      flowState.selectedFigmaLinkId,
      flowState.selectedConditions,
      flowState.conditionLogic,
      createRule,
      resetFlow,
      onClose,
      setFlowError
    ])

    const handleCancel = useCallback(() => {
      resetFlow()
      onClose()
    }, [resetFlow, onClose])

    // ========================================================================
    // Figma Frame Addition
    // ========================================================================

    const handleAddFigmaFrame = useCallback(async () => {
      const urlToAdd = figmaUrl.trim()

      if (!urlToAdd) {
        setFigmaError("Please enter a Figma URL")
        return
      }

      if (!figmaService.isValidFigmaUrl(urlToAdd)) {
        setFigmaError("Please enter a valid Figma URL")
        return
      }

      // Parse the URL to get fileId and nodeId
      const parsed = figmaService.parseFigmaUrl(urlToAdd)
      if (!parsed) {
        setFigmaError("Invalid Figma URL format")
        return
      }

      if (!parsed.nodeId) {
        setFigmaError(
          "Please use a Figma URL with a specific frame selected (should include node-id)"
        )
        return
      }

      setIsAddingFigma(true)
      setFigmaError(null)

      try {
        // Convert node-id format from URL (e.g., "123-456") to Figma format (e.g., "123:456")
        const frameId = parsed.nodeId.replace(/-/g, ":")

        // Create the design link directly
        const linkResponse = await figmaService.createDirectDesignLink({
          figma_file_id: parsed.fileId,
          figma_frame_id: frameId,
          frame_name: "Linked Frame",
          frame_url: urlToAdd
        })

        if (!linkResponse.success) {
          throw new Error(linkResponse.error || "Failed to create design link")
        }

        // Refresh metadata to get the new design link
        await refreshMetadata(currentWebsiteUrl, { force: true })

        // The response contains the full metadata with designLinks array
        // Find and select the newly added frame (most recent one matching our frameId)
        const newDesignLinks = linkResponse.data?.designLinks || []
        const newLink = newDesignLinks.find(
          (link) => link.figma_frame_id === frameId
        )
        if (newLink?.id) {
          setSelectedFigmaLinkId(newLink.id)
        } else if (newDesignLinks.length > 0) {
          // Fallback: select the most recently added (last in array)
          const lastLink = newDesignLinks[newDesignLinks.length - 1]
          if (lastLink?.id) {
            setSelectedFigmaLinkId(lastLink.id)
          }
        }

        // Reset the input state
        setShowFigmaInput(false)
        setFigmaUrl("")
      } catch (error) {
        console.error("Failed to add Figma frame:", error)
        setFigmaError(
          error instanceof Error ? error.message : "Failed to add Figma frame"
        )
      } finally {
        setIsAddingFigma(false)
      }
    }, [
      figmaUrl,
      figmaService,
      refreshMetadata,
      currentWebsiteUrl,
      setSelectedFigmaLinkId
    ])

    const handleBackFromFigmaInput = useCallback(() => {
      setShowFigmaInput(false)
      setFigmaUrl("")
      setFigmaError(null)
    }, [])

    // ========================================================================
    // Render
    // ========================================================================

    // Element selection mode overlay
    if (flowState.step === "selecting-element") {
      return (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[2147483647] cursor-crosshair"
          data-pixzlo-ui="state-mapping-selector"
          style={{
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
          }}>
          {/* Highlight box */}
          <div
            ref={highlightRef}
            className="pointer-events-none absolute"
            style={{
              display: "none",
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              border: "2px solid rgb(59, 130, 246)",
              borderRadius: "4px"
            }}
          />

          {/* Instructions - matching floating toolbar style */}
          <div className="pointer-events-none fixed left-1/2 top-4 -translate-x-1/2">
            <div className="rounded-full bg-white/90 px-4 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
              <p className="text-sm font-medium text-gray-700">
                {flowState.selectedConditions.length > 0 ? (
                  <>
                    Click another element to add • Press{" "}
                    <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      Esc
                    </kbd>{" "}
                    to continue
                  </>
                ) : (
                  <>
                    Click on an element that indicates a page state • Press{" "}
                    <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      Esc
                    </kbd>{" "}
                    to cancel
                  </>
                )}
              </p>
              {flowState.selectedConditions.length > 0 && (
                <p className="mt-1 text-center text-xs text-gray-500">
                  {flowState.selectedConditions.length} condition
                  {flowState.selectedConditions.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </div>

          {/* Cancel button - matching floating toolbar close button */}
          <button
            type="button"
            onClick={handleCancel}
            className="pointer-events-auto fixed right-4 top-4 rounded-full bg-white/90 p-2 shadow-lg ring-1 ring-black/5 backdrop-blur-sm transition-colors hover:bg-red-50 hover:text-red-600">
            <X size={18} />
          </button>
        </div>
      )
    }

    // Rule configuration modal - matching Figma popup modal style
    if (
      flowState.step === "configuring-rule" ||
      flowState.step === "selecting-frame"
    ) {
      return (
        <div
          className="fixed inset-0 z-[2147483647] flex items-center justify-center"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
          }}
          data-pixzlo-ui="state-mapping-modal">
          <div
            className="flex flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
            style={{
              width: "480px",
              maxWidth: "90vw",
              minHeight: "500px",
              maxHeight: "85vh"
            }}
            onClick={(e) => e.stopPropagation()}>
            {/* Header - matching main dialog header */}
            <header className="border-separator flex h-14 flex-shrink-0 items-center justify-between border-b px-5">
              <span className="text-paragraph-md text-gray-850">
                Create State Mapping Rule
              </span>
              <button
                type="button"
                onClick={handleCancel}
                className="flex h-8 w-8 items-center justify-center rounded-sm text-gray-600 hover:bg-gray-100"
                aria-label="Close dialog">
                <X size={16} />
              </button>
            </header>

            {/* Content */}
            <div className="custom-scrollbar flex-1 overflow-y-auto p-5">
              <div className="space-y-5">
                {/* Rule Name */}
                <div>
                  <label
                    htmlFor="rule-name"
                    className="mb-1.5 block text-label-sm text-gray-700">
                    Rule name
                  </label>
                  <input
                    id="rule-name"
                    type="text"
                    value={flowState.ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g., Empty State, Error State, Loading..."
                    className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-paragraph-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <p className="mt-1.5 text-paragraph-xs text-gray-500">
                    Give this rule a descriptive name
                  </p>
                </div>

                {/* Conditions */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-label-sm text-gray-700">
                      When these elements are present
                    </label>
                    <select
                      value={flowState.conditionLogic}
                      onChange={(e) =>
                        setConditionLogic(e.target.value as "AND" | "OR")
                      }
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-paragraph-xs text-gray-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500">
                      <option value="AND">ALL must match</option>
                      <option value="OR">ANY can match</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    {flowState.selectedConditions.map((condition) => (
                      <div
                        key={condition.id}
                        className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <CheckCircle
                          size={16}
                          weight="fill"
                          className="flex-shrink-0 text-sky-500"
                        />
                        <div className="min-w-0 flex-1">
                          <code className="block truncate text-paragraph-xs text-gray-700">
                            {condition.label}
                          </code>
                        </div>
                        <select
                          value={condition.operator}
                          onChange={(e) => {
                            const updated = flowState.selectedConditions.map(
                              (c) =>
                                c.id === condition.id
                                  ? {
                                      ...c,
                                      operator: e.target.value as
                                        | "exists"
                                        | "not_exists"
                                    }
                                  : c
                            )
                            useStateMappingStore.setState((state) => ({
                              flowState: {
                                ...state.flowState,
                                selectedConditions: updated
                              }
                            }))
                          }}
                          className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-paragraph-xs text-gray-700">
                          <option value="exists">exists</option>
                          <option value="not_exists">doesn&apos;t exist</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeCondition(condition.id)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500">
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddAnotherCondition}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 py-2 text-paragraph-sm text-gray-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600">
                    <Plus size={16} />
                    Select Another Element
                  </button>
                </div>

                {/* Figma Frame Selection */}
                <div>
                  <label className="mb-2 block text-label-sm text-gray-700">
                    Then auto-select this Figma frame
                  </label>

                  {showFigmaInput ? (
                    // Inline Figma URL Input
                    <div className="space-y-3 rounded-md border border-gray-200 p-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleBackFromFigmaInput}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                          disabled={isAddingFigma}>
                          <ArrowLeft size={16} />
                        </button>
                        <span className="text-label-sm text-gray-700">
                          Link Figma Frame
                        </span>
                      </div>

                      {figmaError && (
                        <div className="flex items-start gap-2 rounded-md bg-red-50 p-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                          <p className="text-paragraph-xs text-red-700">
                            {figmaError}
                          </p>
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="figma-url-input"
                          className="mb-1 block text-paragraph-xs text-gray-700">
                          Figma frame URL
                        </label>
                        <input
                          id="figma-url-input"
                          type="url"
                          placeholder="https://www.figma.com/design/...?node-id=..."
                          value={figmaUrl}
                          onChange={(e) => setFigmaUrl(e.target.value)}
                          disabled={isAddingFigma}
                          className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-paragraph-sm text-gray-900 placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="mt-1 text-paragraph-xs text-gray-500">
                          Paste a link to a specific Figma frame (must include
                          node-id)
                        </p>
                      </div>

                      <Button
                        onClick={handleAddFigmaFrame}
                        variant="sky"
                        className="w-full"
                        disabled={isAddingFigma || !figmaUrl.trim()}>
                        {isAddingFigma ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Linking...
                          </>
                        ) : (
                          "Link Frame"
                        )}
                      </Button>
                    </div>
                  ) : designLinks.length === 0 ? (
                    // No frames - show add button
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 rounded-md bg-amber-50 p-3">
                        <WarningCircle
                          size={18}
                          weight="fill"
                          className="mt-0.5 flex-shrink-0 text-amber-500"
                        />
                        <div className="text-paragraph-sm text-amber-800">
                          <p className="font-medium">No Figma frames linked</p>
                          <p className="mt-1 text-paragraph-xs">
                            Link a Figma frame to this page to create a state
                            mapping rule.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFigmaInput(true)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 py-2.5 text-paragraph-sm text-gray-600 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600">
                        <Plus size={16} />
                        Link Figma Frame
                      </button>
                    </div>
                  ) : (
                    // Show existing frames + add button
                    <div className="space-y-2">
                      <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-2">
                        {designLinks.map((link) => (
                          <button
                            key={link.id}
                            type="button"
                            onClick={() => setSelectedFigmaLinkId(link.id)}
                            className={`flex w-full items-center gap-3 rounded-md border p-2 text-left transition-all ${
                              flowState.selectedFigmaLinkId === link.id
                                ? "border-sky-500 bg-sky-50"
                                : "border-transparent hover:bg-gray-50"
                            }`}>
                            {link.thumbnail_url ? (
                              <img
                                src={link.thumbnail_url}
                                alt={link.frame_name ?? "Frame"}
                                className="h-10 w-14 flex-shrink-0 rounded object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-14 flex-shrink-0 items-center justify-center rounded bg-gray-100">
                                <span className="text-sm">🎨</span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-paragraph-sm font-medium text-gray-900">
                                {link.frame_name ?? "Untitled Frame"}
                              </p>
                            </div>
                            {flowState.selectedFigmaLinkId === link.id && (
                              <CheckCircle
                                size={18}
                                weight="fill"
                                className="flex-shrink-0 text-sky-500"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFigmaInput(true)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-gray-300 py-2 text-paragraph-xs text-gray-500 transition-colors hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600">
                        <Plus size={14} />
                        Link Another Frame
                      </button>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {flowState.error && (
                  <div className="flex items-start gap-3 rounded-md bg-red-50 p-3">
                    <WarningCircle
                      size={18}
                      weight="fill"
                      className="mt-0.5 flex-shrink-0 text-red-500"
                    />
                    <div className="text-paragraph-sm text-red-700">
                      {flowState.error}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - matching main dialog footer style */}
            <div className="flex flex-shrink-0 gap-3 border-t border-gray-100 px-5 py-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1">
                Cancel
              </Button>
              <Button
                variant="sky"
                onClick={handleSaveRule}
                disabled={
                  isSaving ||
                  !flowState.ruleName.trim() ||
                  !flowState.selectedFigmaLinkId ||
                  flowState.selectedConditions.length === 0
                }
                className="flex-1">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Rule"
                )}
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return <></>
  }
)

StateMappingFlow.displayName = "StateMappingFlow"

export default StateMappingFlow
