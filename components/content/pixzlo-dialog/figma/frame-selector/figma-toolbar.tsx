import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useFigmaPreferences } from "@/hooks/use-figma-preferences"
import { useFigmaDataStore } from "@/stores/figma-data"
import { useFigmaToolbarStore, type FigmaFrame } from "@/stores/figma-toolbar"
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
  className?: string
}

/**
 * Figma toolbar component that manages frame selection and actions
 * Replaces the status text with a proper management interface
 */
const FigmaToolbar = memo(
  ({
    onAddFrame,
    onRefreshFrames,
    onOpenInFigma,
    onFrameChange,
    className
  }: FigmaToolbarProps): JSX.Element => {
    const {
      currentFrame,
      availableFrames,
      isRefreshing,
      isAddingFrame,
      setCurrentFrame
    } = useFigmaToolbarStore()

    const { preference, hasPreferenceForWebsite } = useFigmaPreferences()
    const { fetchMetadata: refreshFigmaMetadata } = useFigmaDataStore()
    const { refreshMetadata } = useFigmaDataStore()

    const [sortedFrames, setSortedFrames] = useState<FigmaFrame[]>([])
    const [hasAutoSelectedFrame, setHasAutoSelectedFrame] = useState(false)

    // Use refs to avoid dependency issues
    const onFrameChangeRef = useRef(onFrameChange)
    onFrameChangeRef.current = onFrameChange

    // Get current website URL
    const currentWebsiteUrl = useMemo(() => {
      return window.location.href
    }, [])

    // Reset auto-selection flag when preference changes
    useEffect(() => {
      setHasAutoSelectedFrame(false)
    }, [preference?.lastUsedFrameId])

    const preferredFrame = useMemo(() => {
      if (!preference || !hasPreferenceForWebsite(currentWebsiteUrl)) {
        return undefined
      }
      return availableFrames.find(
        (frame) => frame.id === preference.lastUsedFrameId
      )
    }, [
      availableFrames,
      preference,
      hasPreferenceForWebsite,
      currentWebsiteUrl
    ])

    // Use frames in natural order (sorted by created_at DESC from API) and auto-select when needed
    useEffect(() => {
      if (availableFrames.length === 0) {
        setSortedFrames([])
        return
      }

      // Use frames as-is without reordering (already sorted by created_at DESC from API)
      const sortedFramesList = [...availableFrames]

      setSortedFrames(sortedFramesList)

      if (hasAutoSelectedFrame) {
        return
      }

      if (
        currentFrame &&
        availableFrames.some((frame) => frame.id === currentFrame.id)
      ) {
        // Respect the already-selected frame and stop auto-selection loops
        setHasAutoSelectedFrame(true)
        return
      }

      const targetFrame = preferredFrame || sortedFramesList[0]
      if (!targetFrame) {
        return
      }

      setCurrentFrame(targetFrame)
      onFrameChangeRef.current(targetFrame)
      setHasAutoSelectedFrame(true)
    }, [
      availableFrames,
      preferredFrame,
      hasAutoSelectedFrame,
      currentFrame,
      setCurrentFrame
    ])

    const handleFrameSelect = useCallback(
      (frameId: string): void => {
        const selectedFrame = sortedFrames.find((frame) => frame.id === frameId)
        if (selectedFrame) {
          setCurrentFrame(selectedFrame)
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
        await Promise.all([onRefreshFrames?.(), refreshFigmaMetadata()])
      } finally {
        setIsRefreshing(false)
      }
    }, [onRefreshFrames, refreshFigmaMetadata, setIsRefreshing])

    const handleOpenInFigma = useCallback((): void => {
      if (currentFrame) {
        onOpenInFigma(currentFrame)
      }
    }, [currentFrame, onOpenInFigma])

    // Always show full toolbar - handle both no frames and has frames cases
    return (
      <div
        className={`flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 ${className || ""}`}>
        {/* Left side - Frame selector or placeholder */}
        <div className="flex items-center gap-3">
          {sortedFrames.length === 0 ? (
            // No frames - show placeholder text
            <span className="text-sm text-gray-600">No frames available</span>
          ) : (
            // Has frames - show selector
            <>
              <Select
                value={
                  currentFrame?.id ??
                  preferredFrame?.id ??
                  sortedFrames[0]?.id ??
                  ""
                }
                onValueChange={(frameId) => {
                  void handleFrameSelect(frameId)
                }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select a frame" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="top"
                  sideOffset={8}
                  className="z-[2147483650]">
                  {sortedFrames.map((frame, index) => (
                    <SelectItem key={frame.id} value={frame.id}>
                      <div className="flex items-center gap-2">
                        {frame.imageUrl && (
                          <div className="h-4 w-6 overflow-hidden rounded border bg-gray-100">
                            <img
                              src={frame.imageUrl}
                              alt={frame.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <span className="flex items-center gap-1 truncate">
                          {frame.name}
                          {preference &&
                            hasPreferenceForWebsite(currentWebsiteUrl) &&
                            frame.figmaFrameId ===
                              preference.lastUsedFrameId && (
                              <span className="text-[10px] uppercase text-green-600">
                                Default
                              </span>
                            )}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          <Separator orientation="vertical" />
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

        {/* Right side - Actions (always visible) */}
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
