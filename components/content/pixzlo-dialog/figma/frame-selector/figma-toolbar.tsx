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
import { usePagesTreeStore, type PageTreeNode } from "@/stores/pages-tree"
import {
  ArrowsClockwiseIcon,
  ArrowUpRightIcon,
  PlusIcon
} from "@phosphor-icons/react"
import { Globe, Plus } from "lucide-react"
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
 * Now includes page/website selection with hierarchical tree
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

    return (
      <div
        className={`flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 ${className ?? ""}`}>
        {/* Left side - Page selector + Design selector */}
        <div className="flex items-center gap-3">
          {/* Page selector (website/path dropdowns) */}
          <PageSelector />

          <Separator orientation="vertical" className="h-6" />

          {/* Design selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Design:</span>
            {sortedFrames.length === 0 ? (
              <span className="text-sm text-gray-400">No frames</span>
            ) : (
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
                <SelectTrigger className="h-7 w-40 border-gray-200 bg-white">
                  <SelectValue placeholder="Select design" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="top"
                  sideOffset={8}
                  className="z-[2147483650]">
                  {sortedFrames.map((frame) => (
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

// ============================================================================
// Page Selector Component (inline for toolbar)
// ============================================================================

/**
 * Page selector with site (environment) display and path dropdown
 * Shows current URL environment and allows switching to saved pages
 * When page changes, updates the design/frame selector
 */
function PageSelector(): JSX.Element {
  const {
    sites,
    isLoading,
    selectedPageId,
    fetchPagesTree,
    setSelectedPage,
    parseCurrentUrl,
    getSiteForCurrentUrl,
    getPageForCurrentUrl
  } = usePagesTreeStore()

  // Get figma data store to refresh designs when page changes
  const { fetchMetadata } = useFigmaDataStore()

  // Current URL info
  const currentUrl = useMemo(() => window.location.href, [])
  const currentUrlInfo = useMemo(
    () => parseCurrentUrl(currentUrl),
    [currentUrl, parseCurrentUrl]
  )

  // Check if current page exists in tree
  // IMPORTANT: Include `sites` in deps so this re-runs when data loads
  const currentPageInTree = useMemo(() => {
    if (sites.length === 0) return undefined
    return getPageForCurrentUrl(currentUrl)
  }, [getPageForCurrentUrl, currentUrl, sites])

  const currentSiteInTree = useMemo(() => {
    if (sites.length === 0) return undefined
    return getSiteForCurrentUrl()
  }, [getSiteForCurrentUrl, sites])

  // Fetch pages tree on mount
  useEffect(() => {
    void fetchPagesTree()
  }, [fetchPagesTree])

  // Auto-select current page if it exists
  useEffect(() => {
    if (currentPageInTree && !selectedPageId) {
      setSelectedPage(currentPageInTree.id)
    }
  }, [currentPageInTree, selectedPageId, setSelectedPage])

  // Handle using current URL (new page)
  const handleUseCurrentPage = useCallback(() => {
    setSelectedPage(undefined)
    // Refresh designs for current URL
    void fetchMetadata(currentUrl, { force: true })
  }, [setSelectedPage, fetchMetadata, currentUrl])

  // Handle page selection from dropdown - refresh designs for that page
  const handlePageSelect = useCallback(
    (page: PageTreeNode) => {
      setSelectedPage(page.id)
      // Fetch designs for the selected page's URL
      if (page.url) {
        void fetchMetadata(page.url, { force: true })
      }
    },
    [setSelectedPage, fetchMetadata]
  )

  // Display info - show origin (full subdomain.domain)
  const displayOrigin = currentUrlInfo?.origin ?? currentUrlInfo?.domain ?? ""

  // Loading state - AFTER all hooks
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500" />
        Loading...
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">page:</span>

      {/* Site display (shows full origin like dev.domain.com) */}
      <div className="flex h-8 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3">
        {currentSiteInTree?.favicon_url ? (
          <img
            src={currentSiteInTree.favicon_url}
            alt=""
            className="h-4 w-4 object-contain"
          />
        ) : (
          <Globe className="h-4 w-4 text-gray-400" />
        )}
        <span className="max-w-[160px] truncate font-medium text-gray-700">
          {displayOrigin}
        </span>
      </div>

      <span className="text-gray-300">/</span>

      {/* Path selector */}
      <PagePathSelector
        sites={sites}
        currentSite={currentSiteInTree}
        currentUrlInfo={currentUrlInfo}
        currentPageInTree={currentPageInTree}
        selectedPageId={selectedPageId}
        onUseCurrentPage={handleUseCurrentPage}
        onSelectPage={handlePageSelect}
      />

      {/* Show indicator if current page is new */}
      {!currentPageInTree && !selectedPageId && (
        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
          NEW
        </span>
      )}
    </div>
  )
}

// ============================================================================
// Page Path Selector (flat Select dropdown with full paths)
// ============================================================================

interface PagePathSelectorProps {
  sites: ReturnType<typeof usePagesTreeStore.getState>["sites"]
  currentSite:
    | ReturnType<typeof usePagesTreeStore.getState>["sites"][0]
    | undefined
  currentUrlInfo: ReturnType<
    typeof usePagesTreeStore.getState
  >["currentUrlInfo"]
  currentPageInTree: PageTreeNode | undefined
  selectedPageId: string | undefined
  onUseCurrentPage: () => void
  onSelectPage: (page: PageTreeNode) => void
}

function PagePathSelector({
  sites,
  currentSite,
  currentUrlInfo,
  currentPageInTree,
  selectedPageId,
  onUseCurrentPage,
  onSelectPage
}: PagePathSelectorProps): JSX.Element {
  // Flatten pages into a list with full paths
  // ONLY show pages from the current site (matching origin/domain)
  // Do NOT show pages from other websites
  const flattenedPages = useMemo(() => {
    // If current site is not found in tree, return empty array
    // This prevents showing pages from unrelated websites
    if (!currentSite) {
      return []
    }

    const result: PageTreeNode[] = []

    const flatten = (pages: PageTreeNode[]): void => {
      for (const page of pages) {
        result.push(page)
        if (page.children.length > 0) {
          flatten(page.children)
        }
      }
    }

    // Only show pages from the current site
    flatten(currentSite.pages)

    // Sort by full_path for consistent ordering
    result.sort((a, b) => (a.full_path ?? "").localeCompare(b.full_path ?? ""))

    return result
  }, [currentSite])

  // Handle value change
  const handleValueChange = useCallback(
    (value: string) => {
      if (value === "__current__") {
        onUseCurrentPage()
        return
      }

      const found = flattenedPages.find((p) => p.id === value)
      if (found) {
        onSelectPage(found)
      }
    },
    [flattenedPages, onUseCurrentPage, onSelectPage]
  )

  // Determine current value
  const currentValue = useMemo(() => {
    if (selectedPageId) {
      return selectedPageId
    }
    if (currentPageInTree) {
      return currentPageInTree.id
    }
    return "__current__"
  }, [currentPageInTree, selectedPageId])

  // Get actual page title from document
  const pageTitle = useMemo(() => {
    return document.title || "Untitled Page"
  }, [])

  // Display text for selected item
  // Use actual page title for root path, otherwise show the path
  const displayText = useMemo(() => {
    if (currentValue === "__current__") {
      const path = currentUrlInfo?.path ?? "/"
      // For root path, use the actual page title from document.title
      return path === "/" ? pageTitle : path.replace(/^\//, "")
    }
    const found = flattenedPages.find((p) => p.id === currentValue)
    if (found) {
      // Use saved page name for root, otherwise show the path
      return found.full_path === "/"
        ? found.name || pageTitle
        : found.full_path?.replace(/^\//, "") ?? found.name
    }
    return currentUrlInfo?.path?.replace(/^\//, "") ?? pageTitle
  }, [currentValue, currentUrlInfo, flattenedPages, pageTitle])

  return (
    <Select value={currentValue} onValueChange={handleValueChange}>
      <SelectTrigger className="h-8 w-auto min-w-[180px] rounded-md border-gray-200 bg-white px-3">
        <span className="max-w-[240px] truncate text-sm font-medium">
          {displayText}
        </span>
      </SelectTrigger>
      <SelectContent
        position="popper"
        side="top"
        sideOffset={8}
        className="z-[2147483650] max-h-72">
        {/* Current page option (NEW) - only if not in tree */}
        {!currentPageInTree && (
          <SelectItem value="__current__">
            <div className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-medium text-blue-600">
                {currentUrlInfo?.path === "/"
                  ? pageTitle
                  : currentUrlInfo?.path?.replace(/^\//, "") ?? "Current page"}
              </span>
            </div>
          </SelectItem>
        )}

        {/* Separator */}
        {!currentPageInTree && flattenedPages.length > 0 && (
          <div className="my-1.5 border-t border-gray-100" />
        )}

        {/* Saved pages - show page name for root, otherwise show path */}
        {flattenedPages.map((page) => (
          <SelectItem key={page.id} value={page.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="truncate">
                {page.full_path === "/"
                  ? page.name || "Homepage"
                  : page.full_path?.replace(/^\//, "") ?? page.name}
              </span>
              {page.figma_links_count > 0 && (
                <span className="text-xs text-gray-400">
                  {page.figma_links_count}
                </span>
              )}
            </div>
          </SelectItem>
        ))}

        {flattenedPages.length === 0 && !currentPageInTree && (
          <div className="p-3 text-center text-sm text-gray-400">
            No saved pages yet
          </div>
        )}
      </SelectContent>
    </Select>
  )
}

export default FigmaToolbar
