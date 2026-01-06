import { ChevronDown, ChevronRight, Globe } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/cn"

/**
 * Page node in the tree
 */
export interface PageTreeNode {
  id: string
  name: string
  url: string
  path_segment: string | null
  full_path: string | null
  environment: string | null
  favicon_url: string | null
  figma_links_count: number
  children: PageTreeNode[]
}

/**
 * Domain with pages
 */
export interface DomainTree {
  id: string
  base_domain: string
  favicon_url: string | null
  environments: string[]
  pages: PageTreeNode[]
}

interface TreeSelectProps {
  domains: DomainTree[]
  selectedPageId: string | undefined
  onSelect: (page: PageTreeNode) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * Tree-based select component for hierarchical page selection
 */
export function TreeSelect({
  domains,
  selectedPageId,
  onSelect,
  placeholder = "Select page...",
  className,
  disabled = false
}: TreeSelectProps): JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false)
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(
    () => new Set()
  )
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Find selected page
  const selectedPage = React.useMemo(() => {
    if (!selectedPageId) return null

    const findPage = (nodes: PageTreeNode[]): PageTreeNode | null => {
      for (const node of nodes) {
        if (node.id === selectedPageId) return node
        if (node.children.length > 0) {
          const found = findPage(node.children)
          if (found) return found
        }
      }
      return null
    }

    for (const domain of domains) {
      const found = findPage(domain.pages)
      if (found) return { page: found, domain }
    }
    return null
  }, [domains, selectedPageId])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const toggleExpanded = React.useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const handleSelect = React.useCallback(
    (page: PageTreeNode) => {
      onSelect(page)
      setIsOpen(false)
    },
    [onSelect]
  )

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border px-3 py-2",
          "bg-white text-left text-sm dark:bg-gray-900",
          "border-gray-200 dark:border-gray-700",
          "hover:border-gray-300 dark:hover:border-gray-600",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {selectedPage ? (
          <>
            {/* Favicon */}
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              {selectedPage.domain.favicon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedPage.domain.favicon_url}
                  alt=""
                  className="h-4 w-4 object-contain"
                />
              ) : (
                <Globe className="h-3.5 w-3.5 text-gray-400" />
              )}
            </span>

            {/* Selected value */}
            <span className="flex-1 truncate">
              {selectedPage.domain.base_domain}
              {selectedPage.page.full_path || ""}
            </span>

            {/* Environment badge */}
            {selectedPage.page.environment && (
              <EnvironmentBadge environment={selectedPage.page.environment} />
            )}
          </>
        ) : (
          <span className="flex-1 text-gray-400">{placeholder}</span>
        )}

        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border",
            "bg-white shadow-lg dark:bg-gray-900",
            "border-gray-200 dark:border-gray-700"
          )}
        >
          {domains.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No pages available
            </div>
          ) : (
            domains.map((domain) => (
              <DomainNode
                key={domain.id}
                domain={domain}
                selectedPageId={selectedPageId}
                expandedNodes={expandedNodes}
                onSelect={handleSelect}
                onToggleExpand={toggleExpanded}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface DomainNodeProps {
  domain: DomainTree
  selectedPageId: string | undefined
  expandedNodes: Set<string>
  onSelect: (page: PageTreeNode) => void
  onToggleExpand: (nodeId: string) => void
}

function DomainNode({
  domain,
  selectedPageId,
  expandedNodes,
  onSelect,
  onToggleExpand
}: DomainNodeProps): JSX.Element {
  const isExpanded = expandedNodes.has(domain.id)
  const hasPages = domain.pages.length > 0

  return (
    <div>
      {/* Domain header */}
      <button
        type="button"
        onClick={() => onToggleExpand(domain.id)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2",
          "hover:bg-gray-50 dark:hover:bg-gray-800",
          "text-left text-sm font-medium text-gray-700 dark:text-gray-300"
        )}
      >
        {hasPages ? (
          isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )
        ) : (
          <span className="w-3" />
        )}

        {/* Favicon */}
        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
          {domain.favicon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={domain.favicon_url}
              alt=""
              className="h-4 w-4 object-contain"
            />
          ) : (
            <Globe className="h-3.5 w-3.5 text-gray-400" />
          )}
        </span>

        <span className="flex-1 truncate">{domain.base_domain}</span>

        {/* Environment badges */}
        {domain.environments.length > 0 && (
          <span className="flex gap-1">
            {domain.environments.slice(0, 2).map((env) => (
              <EnvironmentBadge key={env} environment={env} />
            ))}
          </span>
        )}
      </button>

      {/* Pages */}
      {isExpanded && hasPages && (
        <div className="ml-4">
          {domain.pages.map((page) => (
            <PageNode
              key={page.id}
              page={page}
              depth={0}
              selectedPageId={selectedPageId}
              expandedNodes={expandedNodes}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface PageNodeProps {
  page: PageTreeNode
  depth: number
  selectedPageId: string | undefined
  expandedNodes: Set<string>
  onSelect: (page: PageTreeNode) => void
  onToggleExpand: (nodeId: string) => void
}

function PageNode({
  page,
  depth,
  selectedPageId,
  expandedNodes,
  onSelect,
  onToggleExpand
}: PageNodeProps): JSX.Element {
  const isExpanded = expandedNodes.has(page.id)
  const isSelected = selectedPageId === page.id
  const hasChildren = page.children.length > 0

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(page)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-1.5",
          "hover:bg-gray-50 dark:hover:bg-gray-800",
          "text-left text-sm",
          isSelected
            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            : "text-gray-600 dark:text-gray-400"
        )}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(page.id)
            }}
            className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {/* Path */}
        <span className="flex-1 truncate">
          {page.path_segment ? `/${page.path_segment}` : page.name}
        </span>

        {/* Environment badge */}
        {page.environment && (
          <EnvironmentBadge environment={page.environment} />
        )}

        {/* Figma count */}
        {page.figma_links_count > 0 && (
          <span className="text-xs text-gray-400">{page.figma_links_count}</span>
        )}
      </button>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {page.children.map((child) => (
            <PageNode
              key={child.id}
              page={child}
              depth={depth + 1}
              selectedPageId={selectedPageId}
              expandedNodes={expandedNodes}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Environment badge component
 */
interface EnvironmentBadgeProps {
  environment: string
  className?: string
}

function EnvironmentBadge({
  environment,
  className
}: EnvironmentBadgeProps): JSX.Element {
  const colorMap: Record<string, string> = {
    app: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    dev: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    staging:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    prod: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    test: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    local: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
  }

  const colorClass =
    colorMap[environment.toLowerCase()] ??
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium",
        colorClass,
        className
      )}
    >
      {environment}
    </span>
  )
}

export { EnvironmentBadge }

