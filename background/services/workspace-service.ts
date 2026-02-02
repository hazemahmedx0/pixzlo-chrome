/**
 * Workspace Service
 *
 * Manages workspace selection, caching, and retrieval for the extension.
 * This service handles the logic for determining which workspace the user
 * is currently working with, with support for multi-workspace scenarios.
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import type { ProfileResponse, WorkspaceData } from "../types"

/**
 * Storage key for persisting the user's selected workspace
 */
export const WORKSPACE_STORAGE_KEY = "pixzlo_selected_workspace_id"

/**
 * Cache time-to-live for user profile data (15 seconds)
 */
const USER_PROFILE_CACHE_TTL_MS = 15_000

/**
 * Cached user profile data with timestamp
 */
interface ProfileCache {
  data: ProfileResponse
  fetchedAt: number
}

/**
 * Service class for managing workspace operations.
 * Uses singleton pattern with static methods for service worker compatibility.
 */
export class WorkspaceService {
  private static profileCache: ProfileCache | undefined
  private static profileFetchInFlight: Promise<ProfileResponse | undefined> | undefined

  /**
   * Extracts the workspace ID from a workspace data object.
   * Handles both API formats: workspace_id (from RPC) and id (from direct query).
   */
  static getWorkspaceId(workspace: WorkspaceData): string {
    return workspace.workspace_id ?? workspace.id
  }

  /**
   * Extracts the workspace slug from a workspace data object.
   * Handles both API formats: workspace_slug and slug.
   */
  static getWorkspaceSlug(workspace: WorkspaceData): string | undefined {
    return workspace.workspace_slug ?? workspace.slug
  }

  /**
   * Retrieves the stored workspace ID from Chrome local storage.
   * Returns undefined if storage is not available or no workspace is stored.
   */
  static async getStoredWorkspaceId(): Promise<string | undefined> {
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
   * Persists the selected workspace ID to Chrome local storage.
   */
  static async setStoredWorkspaceId(workspaceId: string): Promise<void> {
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        await chrome.storage.local.set({
          [WORKSPACE_STORAGE_KEY]: workspaceId
        })
      }
    } catch {
      // Storage operation failed - continue without persisting
    }
  }

  /**
   * Fetches the user's profile with caching to reduce API calls.
   * Returns cached data if still valid, otherwise fetches fresh data.
   * Uses request deduplication to prevent concurrent fetches.
   */
  static async getUserProfileCached(): Promise<ProfileResponse | undefined> {
    const now = Date.now()

    // Return cached data if still valid
    if (
      this.profileCache &&
      now - this.profileCache.fetchedAt < USER_PROFILE_CACHE_TTL_MS
    ) {
      return this.profileCache.data
    }

    // Wait for in-flight request if one exists
    if (this.profileFetchInFlight) {
      return this.profileFetchInFlight
    }

    // Fetch fresh profile data
    this.profileFetchInFlight = (async (): Promise<
      ProfileResponse | undefined
    > => {
      try {
        const response = await fetch(`${PIXZLO_WEB_URL}/api/user/profile`, {
          method: "GET",
          credentials: "include"
        })

        if (!response.ok) {
          return undefined
        }

        const data = (await response.json()) as ProfileResponse
        this.profileCache = { data, fetchedAt: Date.now() }
        return data
      } catch {
        return undefined
      } finally {
        this.profileFetchInFlight = undefined
      }
    })()

    return this.profileFetchInFlight
  }

  /**
   * Determines the user's active workspace ID.
   * Priority:
   * 1. Use the workspace selected in the extension popup (stored selection)
   * 2. If none selected/invalid: auto-pick the first active workspace and persist it
   */
  static async getUserActiveWorkspaceId(): Promise<string | undefined> {
    try {
      // First, check if we have a stored workspace selection
      const storedId = await this.getStoredWorkspaceId()
      if (storedId) {
        return storedId
      }

      const data = await this.getUserProfileCached()
      if (!data) {
        return undefined
      }

      const activeWorkspaces =
        data.profile?.workspaces?.filter((w) => w.status === "active") ?? []

      if (activeWorkspaces.length === 0) {
        return undefined
      }

      // No stored selection (or invalid) -> pick first active and persist it
      const firstActive = activeWorkspaces[0]
      const firstActiveId = firstActive
        ? this.getWorkspaceId(firstActive)
        : undefined

      if (!firstActiveId) {
        return undefined
      }

      // Persist the auto-selected workspace
      await this.setStoredWorkspaceId(firstActiveId)

      return firstActiveId
    } catch {
      return undefined
    }
  }

  /**
   * Gets the slug of the currently selected workspace.
   * Useful for constructing workspace-scoped URLs.
   */
  static async getSelectedWorkspaceSlug(): Promise<string | undefined> {
    const workspaceId = await this.getUserActiveWorkspaceId()
    if (!workspaceId) {
      return undefined
    }

    const data = await this.getUserProfileCached()
    const workspaces = data?.profile?.workspaces ?? []
    const matched = workspaces.find(
      (w) => this.getWorkspaceId(w) === workspaceId
    )
    return matched ? this.getWorkspaceSlug(matched) : undefined
  }

  /**
   * Clears the profile cache. Called when workspace changes
   * to ensure fresh data is fetched.
   */
  static clearProfileCache(): void {
    this.profileCache = undefined
    this.profileFetchInFlight = undefined
  }
}
