/**
 * Workspace Service
 *
 * Handles workspace management including storage, retrieval, and user profile integration.
 * Implements the Single Responsibility Principle by focusing solely on workspace operations.
 */

import type {
  IUserProfileService,
  IWorkspaceService,
  ProfileResponse,
  ServiceResponse,
  WorkspaceData
} from "./interfaces"

const WORKSPACE_STORAGE_KEY = "pixzlo_selected_workspace_id"
const USER_PROFILE_CACHE_TTL_MS = 15_000

/**
 * User Profile Service Implementation
 *
 * Handles user profile fetching with caching to reduce API calls.
 */
export class UserProfileService implements IUserProfileService {
  readonly serviceName = "UserProfileService"

  private cache:
    | {
        data: ProfileResponse
        fetchedAt: number
      }
    | undefined

  private fetchInFlight: Promise<ProfileResponse | undefined> | undefined
  private readonly apiBaseUrl: string

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl
  }

  /**
   * Gets the user profile with caching support
   */
  async getProfile(): Promise<ProfileResponse | undefined> {
    const now = Date.now()

    // Return cached data if still valid
    if (this.cache && now - this.cache.fetchedAt < USER_PROFILE_CACHE_TTL_MS) {
      return this.cache.data
    }

    // Return in-flight request if exists
    if (this.fetchInFlight) {
      return this.fetchInFlight
    }

    // Fetch fresh data
    this.fetchInFlight = this.fetchProfile()
    return this.fetchInFlight
  }

  /**
   * Clears the profile cache
   */
  clearCache(): void {
    this.cache = undefined
    this.fetchInFlight = undefined
  }

  private async fetchProfile(): Promise<ProfileResponse | undefined> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/user/profile`, {
        method: "GET",
        credentials: "include"
      })

      if (!response.ok) {
        return undefined
      }

      const data = (await response.json()) as ProfileResponse
      this.cache = { data, fetchedAt: Date.now() }
      return data
    } catch {
      return undefined
    } finally {
      this.fetchInFlight = undefined
    }
  }
}

/**
 * Workspace Service Implementation
 *
 * Manages workspace selection and persistence using Chrome storage API.
 */
export class WorkspaceService implements IWorkspaceService {
  readonly serviceName = "WorkspaceService"

  private readonly userProfileService: IUserProfileService

  constructor(userProfileService: IUserProfileService) {
    this.userProfileService = userProfileService
  }

  /**
   * Gets the workspace ID stored in Chrome storage
   */
  async getStoredWorkspaceId(): Promise<string | undefined> {
    try {
      if (!this.isChromeStorageAvailable()) {
        return undefined
      }

      const result = await chrome.storage.local.get(WORKSPACE_STORAGE_KEY)
      return result[WORKSPACE_STORAGE_KEY] as string | undefined
    } catch (error) {
      console.error(`[${this.serviceName}] Error getting stored workspace ID:`, error)
      return undefined
    }
  }

  /**
   * Gets the user's active workspace ID
   *
   * Priority:
   * 1. Use the workspace selected in the extension popup (stored selection)
   * 2. If none selected/invalid: auto-pick the first active workspace and persist it
   */
  async getUserActiveWorkspaceId(): Promise<string | undefined> {
    try {
      // Check stored workspace first
      const storedId = await this.getStoredWorkspaceId()
      if (storedId) {
        return storedId
      }

      // Get user profile to find active workspaces
      const profileData = await this.userProfileService.getProfile()
      if (!profileData) {
        return undefined
      }

      const activeWorkspaces = this.getActiveWorkspaces(profileData)
      if (activeWorkspaces.length === 0) {
        return undefined
      }

      // Auto-select first active workspace and persist
      const firstActive = activeWorkspaces[0]
      const firstActiveId = this.getWorkspaceId(firstActive)

      if (firstActiveId) {
        await this.setWorkspaceId(firstActiveId)
      }

      return firstActiveId
    } catch (error) {
      console.error(`[${this.serviceName}] Error getting workspace ID:`, error)
      return undefined
    }
  }

  /**
   * Gets the slug for the selected workspace
   */
  async getSelectedWorkspaceSlug(): Promise<string | undefined> {
    const workspaceId = await this.getUserActiveWorkspaceId()
    if (!workspaceId) {
      return undefined
    }

    const profileData = await this.userProfileService.getProfile()
    const workspaces = profileData?.profile?.workspaces ?? []
    const matched = workspaces.find((w) => this.getWorkspaceId(w) === workspaceId)

    return matched ? this.getWorkspaceSlug(matched) : undefined
  }

  /**
   * Sets the workspace ID in Chrome storage
   */
  async setWorkspaceId(workspaceId: string): Promise<void> {
    try {
      if (!this.isChromeStorageAvailable()) {
        return
      }

      await chrome.storage.local.set({
        [WORKSPACE_STORAGE_KEY]: workspaceId
      })
    } catch (error) {
      console.error(`[${this.serviceName}] Failed to persist workspace selection:`, error)
    }
  }

  /**
   * Helper to check if Chrome storage is available
   */
  private isChromeStorageAvailable(): boolean {
    return typeof chrome !== "undefined" && !!chrome.storage?.local
  }

  /**
   * Extracts active workspaces from profile response
   */
  private getActiveWorkspaces(profileData: ProfileResponse): WorkspaceData[] {
    return profileData.profile?.workspaces?.filter((w) => w.status === "active") ?? []
  }

  /**
   * Gets workspace ID from workspace data (handles different field names)
   */
  private getWorkspaceId(workspace: WorkspaceData): string | undefined {
    return workspace.workspace_id ?? workspace.id
  }

  /**
   * Gets workspace slug from workspace data (handles different field names)
   */
  private getWorkspaceSlug(workspace: WorkspaceData): string | undefined {
    return workspace.workspace_slug ?? workspace.slug
  }
}

/**
 * Factory function to create workspace service with dependencies
 */
export function createWorkspaceService(apiBaseUrl: string): IWorkspaceService {
  const userProfileService = new UserProfileService(apiBaseUrl)
  return new WorkspaceService(userProfileService)
}

/**
 * Export the storage key for external use
 */
export { WORKSPACE_STORAGE_KEY }
