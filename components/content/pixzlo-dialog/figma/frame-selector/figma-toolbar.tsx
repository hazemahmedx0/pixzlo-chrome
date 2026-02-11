import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { useFigmaPreferences } from "@/hooks/use-figma-preferences"
import { useFigmaDataStore } from "@/stores/figma-data"
import { useFigmaToolbarStore, type FigmaFrame } from "@/stores/figma-toolbar"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import {
  ArrowsClockwiseIcon,
  ArrowUpRightIcon,
  PlusIcon
} from "@phosphor-icons/react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"

interface FigmaToolbarProps {
  onAddFrame: () => void
  onRefreshFrames: () => Promise<void> | void
  onOpenInFigma: (frame: FigmaFrame) => void
  onFrameChange: (frame: FigmaFrame) => void
  // Optional: pass frames directly from parent for guaranteed sync
  frames?: FigmaFrame[]
  selectedFrame?: FigmaFrame
  className?: string
}

/**
 * Figma toolbar component that manages frame selection and actions
 * Contains Design selector + Add more frames + Refresh + Open in Figma
 */
const FigmaToolbar = memo(
  ({
    onAddFrame,
    onRefreshFrames,
    onOpenInFigma,
    onFrameChange,
    frames: propsFrames,
    selectedFrame: propsSelectedFrame,
    className
  }: FigmaToolbarProps): JSX.Element => {
    const {
      currentFrame: storeCurrentFrame,
      availableFrames: storeAvailableFrames,
      isRefreshing,
      isAddingFrame,
      setCurrentFrame
    } = useFigmaToolbarStore()

    // Use props if provided, otherwise fall back to store
    // This ensures frames are always in sync with the parent component
    const currentFrame = propsSelectedFrame ?? storeCurrentFrame
    const availableFrames = propsFrames ?? storeAvailableFrames

    const { preference, hasPreferenceForWebsite } = useFigmaPreferences()
    const { refreshMetadata: refreshFigmaMetadata } = useFigmaDataStore()
    const getPageUrl = usePixzloDialogStore((state) => state.getPageUrl)

    const [hasAutoSelectedFrame, setHasAutoSelectedFrame] = useState(false)

    // Use refs to avoid dependency issues
    const onFrameChangeRef = useRef(onFrameChange)
    onFrameChangeRef.current = onFrameChange

    // Get current website URL - use getPageUrl() for correct URL in tab page context
    const currentWebsiteUrl = useMemo(() => {
      return getPageUrl()
    }, [getPageUrl])

    // Use frames - props take priority over store for guaranteed sync
    const sortedFrames = useMemo(() => [...availableFrames], [availableFrames])

    // Reset auto-selection flag when preference changes
    useEffect(() => {
      setHasAutoSelectedFrame(false)
    }, [preference?.lastUsedFrameId])

    const preferredFrame = useMemo(() => {
      if (!preference || !hasPreferenceForWebsite(currentWebsiteUrl)) {
        return undefined
      }
      return sortedFrames.find(
        (frame) =>
          frame.figmaFrameId === preference.lastUsedFrameId ||
          frame.id === preference.lastUsedFrameId
      )
    }, [sortedFrames, preference, hasPreferenceForWebsite, currentWebsiteUrl])

    // Auto-select frame when needed (only on initial load)
    useEffect(() => {
      if (sortedFrames.length === 0 || hasAutoSelectedFrame) {
        return
      }

      if (
        currentFrame &&
        sortedFrames.some((frame) => frame.id === currentFrame.id)
      ) {
        setHasAutoSelectedFrame(true)
        return
      }

      const targetFrame = preferredFrame || sortedFrames[0]
      if (!targetFrame) {
        return
      }

      setCurrentFrame(targetFrame)
      onFrameChangeRef.current(targetFrame)
      setHasAutoSelectedFrame(true)
    }, [
      sortedFrames,
      preferredFrame,
      hasAutoSelectedFrame,
      currentFrame,
      setCurrentFrame
    ])

    const handleFrameSelect = useCallback(
      (frameId: string): void => {
        // Find the frame from the available frames
        const selectedFrame = sortedFrames.find((frame) => frame.id === frameId)
        if (selectedFrame) {
          // Always update the store and trigger the change callback
          setCurrentFrame(selectedFrame)
          // Always call onFrameChange to trigger the design loading
          onFrameChange(selectedFrame)
        }
      },
      [sortedFrames, setCurrentFrame, onFrameChange]
    )

    const handleAddFrame = useCallback((): void => {
      onAddFrame()
    }, [onAddFrame])

    const { setIsRefreshing } = useFigmaToolbarStore()

    const handleRefresh = useCallback(async (): Promise<void> => {
      try {
        setIsRefreshing(true)
        await refreshFigmaMetadata(currentWebsiteUrl, { force: true })
        await onRefreshFrames?.()
      } finally {
        setIsRefreshing(false)
      }
    }, [
      onRefreshFrames,
      refreshFigmaMetadata,
      setIsRefreshing,
      currentWebsiteUrl
    ])

    const handleOpenInFigma = useCallback((): void => {
      if (currentFrame) {
        onOpenInFigma(currentFrame)
      }
    }, [currentFrame, onOpenInFigma])

    return (
      <div
        className={`flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 ${className ?? ""}`}>
        {/* Left side - Design selector + Add more frames */}
        <div className="flex items-center gap-3">
          {/* Design selector */}
          <div className="flex items-center gap-2">
            <span className="text-label-sm text-gray-600">Design:</span>
            {sortedFrames.length === 0 ? (
              <span className="text-label-sm text-gray-400">No frames</span>
            ) : (
              <Select
                value={
                  currentFrame?.id ??
                  preferredFrame?.id ??
                  sortedFrames[0]?.id ??
                  ""
                }
                onValueChange={(frameId) => {
                  handleFrameSelect(frameId)
                }}>
                <Tooltip delayDuration={400}>
                  <TooltipTrigger asChild>
                    <SelectTrigger className="h-8 w-60 min-w-0 bg-gray-100 [&>span:first-child]:min-w-0 [&>span:first-child]:overflow-hidden [&>span:first-child]:text-ellipsis [&>span:first-child]:whitespace-nowrap">
                      <SelectValue placeholder="Select design" />
                    </SelectTrigger>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={8}
                    className="max-w-xs">
                    <p className="font-medium">
                      {currentFrame?.name ??
                        preferredFrame?.name ??
                        sortedFrames[0]?.name ??
                        "Select design"}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <SelectContent
                  position="popper"
                  side="top"
                  sideOffset={8}
                  className="z-[2147483650] w-auto min-w-[var(--radix-select-trigger-width)]">
                  {sortedFrames.map((frame) => {
                    const isDefaultFrame =
                      preference &&
                      hasPreferenceForWebsite(currentWebsiteUrl) &&
                      (frame.figmaFrameId === preference.lastUsedFrameId ||
                        frame.id === preference.lastUsedFrameId)

                    return (
                      <SelectItem
                        key={frame.id}
                        value={frame.id}
                        textValue={frame.name}
                        title={frame.name}
                        className="whitespace-nowrap">
                        <div className="flex w-full items-center gap-2">
                          {frame.imageUrl && (
                            <div className="h-4 w-6 shrink-0 overflow-hidden rounded border bg-gray-100">
                              <img
                                src={frame.imageUrl}
                                alt={frame.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span>{frame.name}</span>
                            {isDefaultFrame && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-green-500"
                                aria-label="Default frame"
                              />
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button
            variant="sky"
            size="sm"
            onClick={handleAddFrame}
            disabled={isAddingFrame}
            className="gap-1.5">
            {isAddingFrame ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Adding...
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4" />
                Add more frames
              </>
            )}
          </Button>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="min-w-[90px] gap-1.5">
            {isRefreshing ? (
              <>
                <div className="border-gray-400/30 h-3 w-3 animate-spin rounded-full border-2 border-t-gray-400" />
                <span className="animate-pulse">Refreshing...</span>
              </>
            ) : (
              <>
                <ArrowsClockwiseIcon className="h-4 w-4" />
                Refresh
              </>
            )}
          </Button>

          <Button
            variant="link"
            size="sm"
            onClick={handleOpenInFigma}
            disabled={!currentFrame}
            className="gap-1.5">
            <ArrowUpRightIcon className="h-4 w-4" />
            Open in Figma
          </Button>
        </div>
      </div>
    )
  }
)

FigmaToolbar.displayName = "FigmaToolbar"

export default FigmaToolbar
