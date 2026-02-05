/**
 * Workspace Service
 *
 * Handles workspace-related operations including:
 * - Fetching stored workspace ID
 * - Getting user's active workspace
 * - User profile caching
 *
 * Follows Single Responsibility Principle by handling only workspace concerns.
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import type { ProfileResponse, WorkspaceData } from "../types"

const WORKSPACE_STORAGE_KEY = "pixzlo_selected_workspace_id"
const USER_PROFILE_CACHE_TTL_MS = 15_000

/**
 * Cache for user profile data
 */
interface ProfileCache {
  data: ProfileResponse
  fetchedAt: number
}

let userProfileCache: ProfileCache | undefined
let userProfileFetchInFlight: Promise<ProfileResponse | undefined> | undefined

/**
 * Helper to get workspace ID from workspace data (handles both API formats)
 */
function getWsId(ws: WorkspaceData): string {
  return ws.workspace_id ?? ws.id
}

/**
 * Helper to get workspace slug from workspace data
 */
function getWsSlug(ws: WorkspaceData): string | undefined {
  return ws.workspace_slug ?? ws.slug
}

/**
 * Get the stored workspace ID from chrome storage
 */
export async function getStoredWorkspaceId(): Promise<string | undefined> {
  try {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.local
    ) {
      return undefined
    }
    const result = await chrome.storage.local.get(WORKSPACE_STORAGE_KEY)
    return result[WORKSPACE_STORAGE_KEY] as string | undefined
  } catch {
    return undefined
  }
}

/**
 * Store workspace ID in chrome storage
 */
export async function storeWorkspaceId(workspaceId: string): Promise<void> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({
        [WORKSPACE_STORAGE_KEY]: workspaceId
      })
    }
  } catch {
    // Failed to persist workspace selection
  }
}

/**
 * Get user profile with caching
 */
export async function getUserProfileCached(): Promise<ProfileResponse | undefined> {
  const now = Date.now()

  // Return cached data if still valid
  if (
    userProfileCache &&
    now - userProfileCache.fetchedAt < USER_PROFILE_CACHE_TTL_MS
  ) {
    return userProfileCache.data
  }

  // Return in-flight request if one exists
  if (userProfileFetchInFlight) {
    return userProfileFetchInFlight
  }

  // Create new fetch promise
  userProfileFetchInFlight = (async (): Promise<ProfileResponse | undefined> => {
    try {
      const response = await fetch(`${PIXZLO_WEB_URL}/api/user/profile`, {
        method: "GET",
        credentials: "include"
      })

      if (!response.ok) {
        return undefined
      }

      const data = (await response.json()) as ProfileResponse
      userProfileCache = { data, fetchedAt: Date.now() }
      return data
    } catch {
      return undefined
    } finally {
      userProfileFetchInFlight = undefined
    }
  })()

  return userProfileFetchInFlight
}

/**
 * Clear the user profile cache
 */
export function clearUserProfileCache(): void {
  userProfileCache = undefined
  userProfileFetchInFlight = undefined
}

/**
 * Get user's active workspace ID
 *
 * Priority:
 * 1. Use the workspace selected in the extension popup (stored selection)
 * 2. If none selected/invalid: auto-pick the first active workspace and persist it
 */
export async function getUserActiveWorkspaceId(): Promise<string | undefined> {
  try {
    // First, check if we have a stored workspace selection
    const storedId = await getStoredWorkspaceId()
    if (storedId) {
      return storedId
    }

    const data = await getUserProfileCached()
    if (!data) {
      return undefined
    }

    const activeWorkspaces =
      data.profile?.workspaces?.filter((w) => w.status === "active") ?? []

    if (activeWorkspaces.length === 0) {
      return undefined
    }

    // No stored selection -> pick first active and persist it
    const firstActive = activeWorkspaces[0]
    const firstActiveId = firstActive ? getWsId(firstActive) : undefined
    if (!firstActiveId) {
      return undefined
    }

    await storeWorkspaceId(firstActiveId)
    return firstActiveId
  } catch {
    return undefined
  }
}

/**
 * Get the slug of the selected workspace
 */
export async function getSelectedWorkspaceSlug(): Promise<string | undefined> {
  const workspaceId = await getUserActiveWorkspaceId()
  if (!workspaceId) {
    return undefined
  }

  const data = await getUserProfileCached()
  const workspaces = data?.profile?.workspaces ?? []
  const matched = workspaces.find((w) => getWsId(w) === workspaceId)
  return matched ? getWsSlug(matched) : undefined
}

/**
 * Listen for workspace changes in storage
 */
export function setupWorkspaceChangeListener(
  onWorkspaceChange: () => void
): void {
  if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes[WORKSPACE_STORAGE_KEY]) {
        onWorkspaceChange()
      }
    })
  }
}
