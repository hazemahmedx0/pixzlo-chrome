import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from "@/components/ui/select"
import { useFigmaDataStore } from "@/stores/figma-data"
import { usePagesTreeStore, type PageTreeNode } from "@/stores/pages-tree"
import { Globe, Plus } from "lucide-react"
import { useCallback, useEffect, useMemo } from "react"

/**
 * Page selector with site (environment) display and path dropdown
 * Shows current URL environment and allows switching to saved pages
 * When page changes, updates the design/frame selector
 */
export function PageSelector(): JSX.Element {
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
      <div className="flex items-center gap-2 text-label-sm text-gray-600">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500" />
        Loading...
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-label-sm text-gray-600">page:</span>

      {/* Site display (shows full origin like dev.domain.com) */}
      <div className="flex h-8 items-center gap-2 rounded-md bg-gray-100 px-3">
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
      <SelectTrigger className="h-8 w-auto min-w-[180px] rounded-md bg-gray-100 px-3">
        <span className="max-w-[240px] truncate text-sm font-medium">
          {displayText}
        </span>
      </SelectTrigger>
      <SelectContent
        position="popper"
        side="bottom"
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

export default PageSelector
