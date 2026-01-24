/**
 * Workspace Service
 *
 * This service handles all workspace-related operations following the Single
 * Responsibility Principle (SRP). It manages workspace selection, caching,
 * and profile fetching.
 *
 * Features:
 * - Workspace ID storage and retrieval
 * - User profile caching with TTL
 * - Active workspace resolution
 * - Workspace slug lookup
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import type {
  ProfileResponse,
  ServiceResult,
  UserProfileCache,
  WorkspaceData
} from "@/types/background"

// ============================================================================
// Constants
// ============================================================================

const WORKSPACE_STORAGE_KEY = "pixzlo_selected_workspace_id"
const USER_PROFILE_CACHE_TTL_MS = 15_000

// ============================================================================
// Cache State
// ============================================================================

let userProfileCache: UserProfileCache | undefined
let userProfileFetchInFlight: Promise<ProfileResponse | undefined> | undefined

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get workspace ID from WorkspaceData (handles both API formats)
 */
function getWorkspaceId(workspace: WorkspaceData): string {
  return workspace.workspace_id ?? workspace.id
}

/**
 * Get workspace slug from WorkspaceData (handles both API formats)
 */
function getWorkspaceSlug(workspace: WorkspaceData): string | undefined {
  return workspace.workspace_slug ?? workspace.slug
}

// ============================================================================
// Workspace Service Class
// ============================================================================

/**
 * WorkspaceService handles all workspace-related operations.
 * Implements the Singleton pattern to ensure consistent state across the extension.
 */
class WorkspaceService {
  private static instance: WorkspaceService

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of WorkspaceService
   */
  public static getInstance(): WorkspaceService {
    if (!WorkspaceService.instance) {
      WorkspaceService.instance = new WorkspaceService()
    }
    return WorkspaceService.instance
  }

  /**
   * Check if Chrome storage is available
   */
  private isStorageAvailable(): boolean {
    return (
      typeof chrome !== "undefined" &&
      chrome.storage !== undefined &&
      chrome.storage.local !== undefined
    )
  }

  /**
   * Get the stored workspace ID from Chrome storage
   */
  public async getStoredWorkspaceId(): Promise<string | undefined> {
    try {
      if (!this.isStorageAvailable()) {
        return undefined
      }
      const result = await chrome.storage.local.get(WORKSPACE_STORAGE_KEY)
      return result[WORKSPACE_STORAGE_KEY] as string | undefined
    } catch {
      return undefined
    }
  }

  /**
   * Store a workspace ID in Chrome storage
   */
  public async setStoredWorkspaceId(workspaceId: string): Promise<void> {
    try {
      if (this.isStorageAvailable()) {
        await chrome.storage.local.set({
          [WORKSPACE_STORAGE_KEY]: workspaceId
        })
      }
    } catch {
      // Failed to persist workspace selection - silent fail
    }
  }

  /**
   * Fetch user profile with caching
   */
  public async getUserProfile(): Promise<ProfileResponse | undefined> {
    const now = Date.now()

    // Check cache validity
    if (
      userProfileCache &&
      now - userProfileCache.fetchedAt < USER_PROFILE_CACHE_TTL_MS
    ) {
      return userProfileCache.data
    }

    // Return in-flight request if exists
    if (userProfileFetchInFlight) {
      return userProfileFetchInFlight
    }

    // Fetch fresh profile
    userProfileFetchInFlight = this.fetchUserProfile()
    return userProfileFetchInFlight
  }

  /**
   * Internal method to fetch user profile from API
   */
  private async fetchUserProfile(): Promise<ProfileResponse | undefined> {
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
  }

  /**
   * Clear the user profile cache
   */
  public clearProfileCache(): void {
    userProfileCache = undefined
    userProfileFetchInFlight = undefined
  }

  /**
   * Get the user's active workspace ID
   *
   * Priority:
   * 1. Use the workspace selected in the extension popup (stored selection)
   * 2. If none selected/invalid: auto-pick the first active workspace and persist it
   */
  public async getActiveWorkspaceId(): Promise<string | undefined> {
    try {
      // First, check if we have a stored workspace selection
      const storedId = await this.getStoredWorkspaceId()
      if (storedId) {
        return storedId
      }

      // Fetch user profile to get workspaces
      const data = await this.getUserProfile()
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
      const firstActiveId = firstActive ? getWorkspaceId(firstActive) : undefined

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
   * Get the slug for the selected workspace
   */
  public async getSelectedWorkspaceSlug(): Promise<string | undefined> {
    const workspaceId = await this.getActiveWorkspaceId()
    if (!workspaceId) {
      return undefined
    }

    const data = await this.getUserProfile()
    const workspaces = data?.profile?.workspaces ?? []
    const matched = workspaces.find((w) => getWorkspaceId(w) === workspaceId)
    return matched ? getWorkspaceSlug(matched) : undefined
  }

  /**
   * Validate that a workspace ID exists and is active
   */
  public async validateWorkspaceId(workspaceId: string): Promise<boolean> {
    const data = await this.getUserProfile()
    if (!data?.profile?.workspaces) {
      return false
    }

    return data.profile.workspaces.some(
      (w) => getWorkspaceId(w) === workspaceId && w.status === "active"
    )
  }

  /**
   * Get workspace by ID
   */
  public async getWorkspaceById(
    workspaceId: string
  ): Promise<WorkspaceData | undefined> {
    const data = await this.getUserProfile()
    return data?.profile?.workspaces?.find(
      (w) => getWorkspaceId(w) === workspaceId
    )
  }

  /**
   * Get all active workspaces
   */
  public async getActiveWorkspaces(): Promise<WorkspaceData[]> {
    const data = await this.getUserProfile()
    return (
      data?.profile?.workspaces?.filter((w) => w.status === "active") ?? []
    )
  }

  /**
   * Require workspace ID - throws if not available
   */
  public async requireWorkspaceId(): Promise<ServiceResult<string>> {
    const workspaceId = await this.getActiveWorkspaceId()
    if (!workspaceId) {
      return {
        success: false,
        error:
          "No workspace selected. Open the Pixzlo extension popup and select a workspace."
      }
    }
    return { success: true, data: workspaceId }
  }
}

// ============================================================================
// Exported Singleton Instance
// ============================================================================

export const workspaceService = WorkspaceService.getInstance()

// ============================================================================
// Exported Constants
// ============================================================================

export { WORKSPACE_STORAGE_KEY }
