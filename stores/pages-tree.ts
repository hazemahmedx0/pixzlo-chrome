import { create } from "zustand"

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
 * Site represents a unique environment (e.g., dev.domain.com, app.domain.com)
 * Each environment is treated as a separate website
 */
export interface SiteTree {
  /** Site ID (homepage page ID or domain-env composite) */
  id: string
  /** Display name (e.g., "Development", "Production") */
  display_name: string
  /** Full origin (e.g., "dev.domain.com") */
  origin: string
  /** Base domain (e.g., "domain.com") */
  base_domain: string
  /** Environment identifier (e.g., "dev", "app", null for root) */
  environment: string | null
  /** Favicon URL */
  favicon_url: string | null
  /** Nested pages */
  pages: PageTreeNode[]
}

/**
 * @deprecated Use SiteTree instead
 */
export interface DomainTree {
  id: string
  base_domain: string
  favicon_url: string | null
  environments: string[]
  pages: PageTreeNode[]
}

/**
 * Current URL info extracted from window.location
 */
export interface CurrentUrlInfo {
  fullUrl: string
  domain: string
  subdomain: string | null
  environment: string | null
  path: string
  pathSegments: string[]
  origin: string
}

interface PagesTreeState {
  /** Sites grouped by environment */
  sites: SiteTree[]
  /** @deprecated Use sites instead */
  domains: DomainTree[]
  isLoading: boolean
  error: string | undefined
  lastFetchedAt: number | null
  selectedPageId: string | undefined
  currentUrlInfo: CurrentUrlInfo | undefined

  fetchPagesTree: () => Promise<void>
  setSelectedPage: (pageId: string | undefined) => void
  findPageById: (pageId: string) => PageTreeNode | undefined
  findSiteByPageId: (pageId: string) => SiteTree | undefined
  /** @deprecated Use findSiteByPageId instead */
  findDomainByPageId: (pageId: string) => DomainTree | undefined
  getPageForCurrentUrl: (url: string) => PageTreeNode | undefined
  getSiteForCurrentUrl: () => SiteTree | undefined
  /** @deprecated Use getSiteForCurrentUrl instead */
  getDomainForCurrentUrl: () => DomainTree | undefined
  parseCurrentUrl: (url: string) => CurrentUrlInfo
  isCurrentUrlInTree: () => boolean
  reset: () => void
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Helper to extract environment from subdomain
function extractEnvironment(hostname: string): string | null {
  const parts = hostname.split(".")
  if (parts.length >= 3) {
    const subdomain = parts[0]
    // Common environment subdomains
    if (
      ["dev", "staging", "stg", "test", "uat", "app", "www", "beta", "alpha", "preview", "demo", "supa", "local"].includes(
        subdomain ?? ""
      )
    ) {
      return subdomain ?? null
    }
  }
  return null
}

// Helper to extract base domain
function extractBaseDomain(hostname: string): string {
  const parts = hostname.replace(/^www\./, "").split(".")
  // For domains like app.pixzlo.com, we want pixzlo.com
  // For localhost, we return localhost
  if (parts.length <= 2) {
    return parts.join(".")
  }
  // Return last two parts (e.g., pixzlo.com from app.pixzlo.com)
  return parts.slice(-2).join(".")
}

// Helper to build origin from hostname
function buildOrigin(hostname: string): string {
  return hostname.replace(/^www\./, "")
}

// Convert sites to legacy domains format
function sitesToDomains(sites: SiteTree[]): DomainTree[] {
  const domainMap = new Map<string, DomainTree>()
  
  for (const site of sites) {
    if (!domainMap.has(site.base_domain)) {
      domainMap.set(site.base_domain, {
        id: site.id,
        base_domain: site.base_domain,
        favicon_url: site.favicon_url,
        environments: [],
        pages: [],
      })
    }
    
    const domain = domainMap.get(site.base_domain)
    if (domain) {
      if (site.environment) {
        domain.environments.push(site.environment)
      }
      domain.pages.push(...site.pages)
    }
  }
  
  return Array.from(domainMap.values())
}

export const usePagesTreeStore = create<PagesTreeState>((set, get) => ({
  sites: [],
  domains: [],
  isLoading: false,
  error: undefined,
  lastFetchedAt: null,
  selectedPageId: undefined,
  currentUrlInfo: undefined,

  parseCurrentUrl: (url: string): CurrentUrlInfo => {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.replace(/^www\./, "")
      const path = urlObj.pathname
      const pathSegments = path
        .split("/")
        .filter((s) => s.length > 0)

      const baseDomain = extractBaseDomain(hostname)
      const environment = extractEnvironment(hostname)
      const origin = buildOrigin(hostname)
      
      // Extract subdomain
      let subdomain: string | null = null
      if (hostname !== baseDomain) {
        subdomain = hostname.replace(`.${baseDomain}`, "")
      }

      const info: CurrentUrlInfo = {
        fullUrl: url,
        domain: baseDomain,
        subdomain,
        environment,
        path,
        pathSegments,
        origin
      }

      set({ currentUrlInfo: info })
      return info
    } catch {
      const fallback: CurrentUrlInfo = {
        fullUrl: url,
        domain: url,
        subdomain: null,
        environment: null,
        path: "/",
        pathSegments: [],
        origin: url
      }
      set({ currentUrlInfo: fallback })
      return fallback
    }
  },

  isCurrentUrlInTree: () => {
    const { sites, currentUrlInfo } = get()
    if (!currentUrlInfo) return false

    // Find matching site by origin
    const matchingSite = sites.find(
      (s) => s.origin === currentUrlInfo.origin
    )

    if (!matchingSite) return false

    // Check if current path exists
    const findPage = (nodes: PageTreeNode[]): boolean => {
      for (const node of nodes) {
        if (node.full_path === currentUrlInfo.path) {
          return true
        }
        if (node.children.length > 0 && findPage(node.children)) {
          return true
        }
      }
      return false
    }

    return findPage(matchingSite.pages)
  },

  getSiteForCurrentUrl: () => {
    const { sites, currentUrlInfo } = get()
    if (!currentUrlInfo) return undefined

    // Find site that matches the current origin
    return sites.find((s) => s.origin === currentUrlInfo.origin)
  },

  getDomainForCurrentUrl: () => {
    const { domains, currentUrlInfo } = get()
    if (!currentUrlInfo) return undefined

    return domains.find(
      (d) =>
        currentUrlInfo.domain === d.base_domain ||
        currentUrlInfo.domain.endsWith(`.${d.base_domain}`)
    )
  },

  fetchPagesTree: async () => {
    const state = get()

    // Skip if already loading
    if (state.isLoading) return

    // Use cache if fresh
    if (
      state.lastFetchedAt &&
      Date.now() - state.lastFetchedAt < CACHE_DURATION &&
      state.sites.length > 0
    ) {
      return
    }

    set({ isLoading: true, error: undefined })

    try {
      const response = await new Promise<{
        success: boolean
        data?: { sites: SiteTree[] }
        error?: string
      }>((resolve) => {
        if (!chrome?.runtime?.sendMessage) {
          resolve({ success: false, error: "Extension context not available" })
          return
        }

        chrome.runtime.sendMessage(
          { type: "FETCH_PAGES_TREE" },
          (backgroundResponse) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error:
                  chrome.runtime.lastError.message ||
                  "Extension communication error"
              })
            } else {
              resolve(backgroundResponse)
            }
          }
        )
      })

      if (response.success && response.data) {
        const sites = response.data.sites
        set({
          sites,
          domains: sitesToDomains(sites),
          lastFetchedAt: Date.now(),
          isLoading: false,
          error: undefined
        })
      } else {
        set({
          isLoading: false,
          error: response.error || "Failed to fetch pages tree"
        })
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    }
  },

  setSelectedPage: (pageId) => {
    set({ selectedPageId: pageId })
  },

  findPageById: (pageId) => {
    const { sites } = get()

    const findInNodes = (nodes: PageTreeNode[]): PageTreeNode | undefined => {
      for (const node of nodes) {
        if (node.id === pageId) return node
        if (node.children.length > 0) {
          const found = findInNodes(node.children)
          if (found) return found
        }
      }
      return undefined
    }

    for (const site of sites) {
      const found = findInNodes(site.pages)
      if (found) return found
    }

    return undefined
  },

  findSiteByPageId: (pageId) => {
    const { sites } = get()

    const isInNodes = (nodes: PageTreeNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === pageId) return true
        if (node.children.length > 0 && isInNodes(node.children)) return true
      }
      return false
    }

    for (const site of sites) {
      if (isInNodes(site.pages)) return site
    }

    return undefined
  },

  findDomainByPageId: (pageId) => {
    const { domains } = get()

    const isInNodes = (nodes: PageTreeNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === pageId) return true
        if (node.children.length > 0 && isInNodes(node.children)) return true
      }
      return false
    }

    for (const domain of domains) {
      if (isInNodes(domain.pages)) return domain
    }

    return undefined
  },

  getPageForCurrentUrl: (url) => {
    const { sites } = get()

    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.replace(/^www\./, "")
      const path = urlObj.pathname
      const origin = buildOrigin(hostname)

      // Find matching site by origin
      const matchingSite = sites.find((s) => s.origin === origin)

      if (!matchingSite) return undefined

      // Find matching page by path
      const findPage = (nodes: PageTreeNode[]): PageTreeNode | undefined => {
        for (const node of nodes) {
          if (node.full_path === path) {
            return node
          }

          // Check children
          if (node.children.length > 0) {
            const found = findPage(node.children)
            if (found) return found
          }
        }
        return undefined
      }

      return findPage(matchingSite.pages)
    } catch {
      return undefined
    }
  },

  reset: () => {
    set({
      sites: [],
      domains: [],
      isLoading: false,
      error: undefined,
      lastFetchedAt: null,
      selectedPageId: undefined,
      currentUrlInfo: undefined
    })
  }
}))
