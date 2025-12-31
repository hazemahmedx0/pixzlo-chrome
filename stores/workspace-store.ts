import type { Workspace } from "@/types/profile"

const STORAGE_KEY = "pixzlo_selected_workspace_id"

/**
 * Workspace Store - Manages the selected workspace across the extension
 * Uses chrome.storage.local for background script compatibility
 */

/**
 * Get the currently selected workspace ID from chrome.storage
 */
export async function getSelectedWorkspaceId(): Promise<string | undefined> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      return result[STORAGE_KEY] as string | undefined
    }
    // Fallback to localStorage for popup context
    if (typeof localStorage !== "undefined") {
    return localStorage.getItem(STORAGE_KEY) ?? undefined
    }
    return undefined
  } catch (error) {
    console.error("[WorkspaceStore] Failed to get workspace ID:", error)
    return undefined
  }
}

/**
 * Set the selected workspace ID in storage
 */
export async function setSelectedWorkspaceId(
  workspaceId: string
): Promise<void> {
  try {
    // Save to both storages for cross-context compatibility
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEY]: workspaceId })
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, workspaceId)
    }
  } catch (error) {
    console.error("[WorkspaceStore] Failed to save workspace ID:", error)
  }
}

/**
 * Clear the selected workspace ID from storage
 */
export async function clearSelectedWorkspaceId(): Promise<void> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.remove(STORAGE_KEY)
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (error) {
    console.error("[WorkspaceStore] Failed to clear workspace ID:", error)
  }
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

