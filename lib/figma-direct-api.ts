/**
 * Figma Direct API Client
 *
 * This module handles direct communication with the Figma API from the browser extension,
 * reducing server load by making API calls directly instead of proxying through the backend.
 *
 * Features:
 * - Fetches and caches Figma access token from backend
 * - Makes direct Figma API calls
 * - Handles token expiry and refresh
 * - Memory-only caching (no persistent storage for security)
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import type {
  FigmaBoundingBox,
  FigmaFile,
  FigmaNode
} from "@/types/figma"

// Token cache configuration
const TOKEN_CACHE_BUFFER_MS = 60 * 1000 // Refresh token 1 minute before expiry
const TOKEN_RETRY_DELAY_MS = 1000 // Wait 1s before retrying on failure

// In-memory token cache (never persisted for security)
interface TokenCache {
  accessToken: string
  expiresAt: Date
  workspaceId: string
}

let tokenCache: TokenCache | undefined = undefined
let tokenFetchPromise: Promise<TokenCache> | undefined = undefined

// Figma API response types
interface FigmaApiFileResponse {
  name: string
  lastModified: string
  thumbnailUrl: string
  document: {
    id: string
    name: string
    type: string
    children: FigmaNode[]
  }
}

interface FigmaApiImagesResponse {
  images: Record<string, string>
  err: string | null
}

interface TokenResponse {
  access_token: string
  expires_at: string | null
  workspace_id: string
}

/**
 * Get the cached workspace ID if available
 */
export function getCachedWorkspaceId(): string | undefined {
  return tokenCache?.workspaceId
}

/**
 * Fetch and cache the Figma access token from the backend
 */
async function fetchToken(workspaceId?: string): Promise<TokenCache> {
  // If there's already a fetch in progress, wait for it
  if (tokenFetchPromise) {
    return tokenFetchPromise
  }

  // Determine workspace ID - use provided or try to get from user profile
  let targetWorkspaceId = workspaceId

  if (!targetWorkspaceId) {
    // Try to get workspace ID from user profile
    const profileResponse = await fetch(`${PIXZLO_WEB_URL}/api/user/profile`, {
      method: "GET",
      credentials: "include"
    })

    if (!profileResponse.ok) {
      if (profileResponse.status === 401) {
        throw new Error("Please log in to Pixzlo to access Figma.")
      }
      throw new Error("Failed to get user profile")
    }

    interface ProfileApiResponse {
      success: boolean
      profile?: {
        workspaces?: Array<{
          workspace_id: string
          status: string
        }>
      }
      needsOnboarding?: boolean
    }

    const response: ProfileApiResponse = await profileResponse.json()
    
    if (!response.success || !response.profile) {
      throw new Error("Failed to get user profile")
    }

    const activeWorkspace = response.profile.workspaces?.find((w) => {
      const status = (w.status ?? "").toLowerCase()
      return status === "active"
    })

    if (!activeWorkspace) {
      if (response.needsOnboarding) {
        throw new Error("Please complete onboarding in Pixzlo first.")
      }
      throw new Error("No active workspace found. Please set up a workspace in Pixzlo.")
    }

    const resolvedWorkspaceId =
      // Newer shape: workspace_id
      activeWorkspace.workspace_id ??
      // Legacy shape from get_user_profile(): id
      (activeWorkspace as { id?: string }).id

    if (!resolvedWorkspaceId) {
      throw new Error("Workspace is missing an ID. Please re-open Pixzlo and try again.")
    }

    targetWorkspaceId = resolvedWorkspaceId
  }

  // Safety check - ensure we have a valid workspace ID before proceeding
  if (!targetWorkspaceId) {
    throw new Error("Failed to determine workspace. Please try again.")
  }

  const workspaceIdForRequest = targetWorkspaceId // Capture for closure

  // Create the fetch promise
  tokenFetchPromise = (async (): Promise<TokenCache> => {
    try {
      const response = await fetch(
        `${PIXZLO_WEB_URL}/api/integrations/figma/token?workspace_id=${encodeURIComponent(
          workspaceIdForRequest
        )}`,
        {
          method: "GET",
          credentials: "include"
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in to Pixzlo to access Figma.")
        }
        if (response.status === 429) {
          throw new Error(
            "Too many token requests. Please try again in a few minutes."
          )
        }

        const errorData = await response.json().catch(() => ({}))
        const errorMessage =
          (errorData as { error?: string }).error ||
          `Failed to get Figma token (${response.status})`
        throw new Error(errorMessage)
      }

      const data: TokenResponse = await response.json()

      if (!data.access_token) {
        throw new Error("No access token received from server")
      }

      // Calculate expiry time (use provided or default to 1 hour)
      const expiresAt = data.expires_at
        ? new Date(data.expires_at)
        : new Date(Date.now() + 60 * 60 * 1000)

      const cache: TokenCache = {
        accessToken: data.access_token,
        expiresAt,
        workspaceId: data.workspace_id
      }

      tokenCache = cache
      return cache
    } finally {
      tokenFetchPromise = undefined
    }
  })()

  return tokenFetchPromise
}

/**
 * Get a valid Figma access token, fetching/refreshing if needed
 */
async function getAccessToken(workspaceId?: string): Promise<string> {
  // Check if we have a valid cached token
  if (tokenCache) {
    const now = new Date()
    const expiryWithBuffer = new Date(
      tokenCache.expiresAt.getTime() - TOKEN_CACHE_BUFFER_MS
    )

    if (now < expiryWithBuffer) {
      // Token is still valid
      return tokenCache.accessToken
    }

    // Token is expired or about to expire, clear cache
    tokenCache = undefined
  }

  // Fetch a new token
  const cache = await fetchToken(workspaceId)
  return cache.accessToken
}

/**
 * Refresh the Figma token via the backend
 * This uses the backend's refresh endpoint which handles OAuth token refresh
 */
async function refreshToken(): Promise<void> {
  const response = await fetch(
    `${PIXZLO_WEB_URL}/api/integrations/figma/refresh`,
    {
      method: "POST",
      credentials: "include"
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      (errorData as { error?: string }).error ||
        `Failed to refresh Figma token (${response.status})`
    )
  }

  // Clear the cache so next request fetches the new token
  tokenCache = undefined
}

/**
 * Clear the token cache (e.g., on logout)
 */
export function clearTokenCache(): void {
  tokenCache = undefined
  tokenFetchPromise = undefined
}

/**
 * Make a direct request to the Figma API
 */
async function figmaApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOnUnauthorized = true
): Promise<T> {
  const accessToken = await getAccessToken()

  const response = await fetch(`https://api.figma.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Figma-Token": accessToken,
      ...options.headers
    }
  })

  if (!response.ok) {
    // Handle 401 - token might be expired, try refresh
    if (response.status === 401 && retryOnUnauthorized) {
      console.log(
        "[Figma Direct API] Got 401, attempting token refresh and retry..."
      )

      try {
        await refreshToken()
        await new Promise((resolve) => setTimeout(resolve, TOKEN_RETRY_DELAY_MS))
        return figmaApiRequest<T>(endpoint, options, false)
      } catch (refreshError) {
        throw new Error(
          "Figma token expired. Please reconnect your Figma integration."
        )
      }
    }

    // Handle 403 - likely permission issue
    if (response.status === 403) {
      throw new Error(
        "Access denied to this Figma file. Make sure the connected account has access."
      )
    }

    const errorText = await response.text().catch(() => "")
    throw new Error(
      `Figma API error: ${response.status} ${response.statusText}${
        errorText ? ` - ${errorText.slice(0, 200)}` : ""
      }`
    )
  }

  return response.json()
}

/**
 * Fetch a Figma file with optional depth limit
 */
export async function fetchFigmaFile(
  fileId: string,
  depth?: number
): Promise<FigmaFile> {
  const depthQuery = typeof depth === "number" ? `?depth=${depth}` : ""
  const figmaData = await figmaApiRequest<FigmaApiFileResponse>(
    `/files/${fileId}${depthQuery}`
  )

  // Transform to our FigmaFile format
  // Note: The Figma API document node structure is compatible with FigmaNode
  // but may not have all optional properties at the root level
  return {
    key: fileId,
    name: figmaData.name,
    thumbnail_url: figmaData.thumbnailUrl,
    last_modified: figmaData.lastModified,
    nodes: {
      [figmaData.document.id]: {
        ...figmaData.document,
        visible: true // Root document is always visible
      } as FigmaNode
    }
  }
}

/**
 * Fetch a specific node from a Figma file
 */
export async function fetchFigmaNode(
  fileId: string,
  nodeId: string
): Promise<FigmaNode | undefined> {
  interface FigmaNodesResponse {
    nodes: Record<string, { document: FigmaNode }>
  }

  const response = await figmaApiRequest<FigmaNodesResponse>(
    `/files/${fileId}/nodes?ids=${encodeURIComponent(nodeId)}`
  )

  const nodeData = response.nodes[nodeId]
  return nodeData?.document
}

/**
 * Render a Figma node as an image and return the URL
 */
export async function renderFigmaNode(
  fileId: string,
  nodeId: string,
  format: "png" | "jpg" | "svg" | "pdf" = "png",
  scale = 2
): Promise<string> {
  const response = await figmaApiRequest<FigmaApiImagesResponse>(
    `/images/${fileId}?ids=${encodeURIComponent(nodeId)}&format=${format}&scale=${scale}`
  )

  if (response.err) {
    throw new Error(`Figma image render error: ${response.err}`)
  }

  const imageUrl = response.images[nodeId]
  if (!imageUrl) {
    throw new Error("No image URL returned from Figma API")
  }

  return imageUrl
}

/**
 * Fetch images for multiple nodes at once
 */
export async function renderFigmaNodes(
  fileId: string,
  nodeIds: string[],
  format: "png" | "jpg" | "svg" | "pdf" = "png",
  scale = 2
): Promise<Record<string, string>> {
  const idsParam = nodeIds.join(",")
  const response = await figmaApiRequest<FigmaApiImagesResponse>(
    `/images/${fileId}?ids=${encodeURIComponent(idsParam)}&format=${format}&scale=${scale}`
  )

  if (response.err) {
    throw new Error(`Figma image render error: ${response.err}`)
  }

  return response.images
}

/**
 * Get file thumbnail
 */
export async function getFigmaThumbnail(fileId: string): Promise<string> {
  interface FigmaFileMetaResponse {
    thumbnailUrl: string
  }

  const response = await figmaApiRequest<FigmaFileMetaResponse>(
    `/files/${fileId}?depth=1`
  )

  return response.thumbnailUrl
}

/**
 * Helper to extract frame data from a Figma file response
 */
export function findNodeById(
  fileData: FigmaFile,
  nodeId: string
): FigmaNode | undefined {
  function searchNode(node: FigmaNode): FigmaNode | undefined {
    if (node.id === nodeId) {
      return node
    }
    if (node.children) {
      for (const child of node.children) {
        const found = searchNode(child)
        if (found) return found
      }
    }
    return undefined
  }

  // Search through all nodes in the file
  for (const rootNode of Object.values(fileData.nodes)) {
    if (rootNode.children) {
      for (const page of rootNode.children) {
        const found = searchNode(page)
        if (found) return found
      }
    }
    // Also check the root node itself
    const found = searchNode(rootNode)
    if (found) return found
  }

  return undefined
}

/**
 * Extract interactive elements from a node for overlay rendering
 */
export function extractElementsFromNode(
  node: FigmaNode,
  frameId: string
): Array<{
  id: string
  name: string
  type: string
  absoluteBoundingBox: FigmaBoundingBox | undefined
  relativeTransform: unknown
  constraints: unknown
  depth: number
}> {
  const elements: Array<{
    id: string
    name: string
    type: string
    absoluteBoundingBox: FigmaBoundingBox | undefined
    relativeTransform: unknown
    constraints: unknown
    depth: number
  }> = []

  interface NodeWithExtras extends FigmaNode {
    relativeTransform?: unknown
    constraints?: unknown
  }

  function traverseNode(currentNode: NodeWithExtras, depth = 0): void {
    // Only include visible elements (not the frame itself)
    if (currentNode.id !== frameId && currentNode.visible !== false) {
      const element = {
        id: currentNode.id,
        name: currentNode.name,
        type: currentNode.type,
        absoluteBoundingBox: currentNode.absoluteBoundingBox,
        relativeTransform: currentNode.relativeTransform,
        constraints: currentNode.constraints,
        depth: depth
      }

      // Add element if it has bounding box
      if (currentNode.absoluteBoundingBox) {
        elements.push(element)
      }
    }

    // Recursively traverse children
    if (currentNode.children) {
      currentNode.children.forEach((child) =>
        traverseNode(child as NodeWithExtras, depth + 1)
      )
    }
  }

  traverseNode(node as NodeWithExtras)
  return elements
}

