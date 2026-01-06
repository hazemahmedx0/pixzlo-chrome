import {
  getStorageValue,
  removeStorageValue,
  setStorageValue,
  STORAGE_KEYS
} from "@/lib/utils/chrome-storage"
import type { Workspace } from "@/types/profile"

/**
 * Workspace Store - Manages the selected workspace across the extension
 *
 * Uses the centralized chrome-storage utilities for consistent storage access.
 */

/**
 * Get the currently selected workspace ID from storage
 */
export async function getSelectedWorkspaceId(): Promise<string | undefined> {
  return getStorageValue<string>(STORAGE_KEYS.WORKSPACE_ID)
}

/**
 * Set the selected workspace ID in storage
 */
export async function setSelectedWorkspaceId(workspaceId: string): Promise<void> {
  await setStorageValue(STORAGE_KEYS.WORKSPACE_ID, workspaceId)
}

/**
 * Clear the selected workspace ID from storage
 */
export async function clearSelectedWorkspaceId(): Promise<void> {
  await removeStorageValue(STORAGE_KEYS.WORKSPACE_ID)
}

// Helper to get workspace ID (supports both API formats)
const getWsId = (ws: Workspace): string => ws.workspace_id ?? ws.id

/**
 * Get the active workspace from a list of workspaces
 * Priority: 1. Stored selection 2. First active workspace
 */
export async function getActiveWorkspace(
  workspaces: Workspace[]
): Promise<Workspace | undefined> {
  if (!workspaces || workspaces.length === 0) {
    return undefined
  }

  // First, check if we have a stored selection
  const storedId = await getSelectedWorkspaceId()
  if (storedId) {
    const storedWorkspace = workspaces.find(
      (w) => getWsId(w) === storedId && w.status === "active"
    )
    if (storedWorkspace) {
      return storedWorkspace
    }
  }

  // Fall back to first active workspace
  const activeWorkspace = workspaces.find((w) => w.status === "active")
  if (activeWorkspace) {
    // Auto-save this as the selected workspace
    await setSelectedWorkspaceId(getWsId(activeWorkspace))
    return activeWorkspace
  }

  return undefined
}

