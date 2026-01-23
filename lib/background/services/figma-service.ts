/**
 * Figma Service (Background)
 *
 * Handles all Figma integration operations in the background script including:
 * - Metadata fetching
 * - Preference management
 * - Design link operations
 * - OAuth flow
 *
 * Follows Single Responsibility Principle by handling only Figma-related concerns.
 */

import { PIXZLO_WEB_URL } from "~lib/constants"
import { clearTokenCache } from "~lib/figma-direct-api"

import type { FigmaMetadataResponse, FigmaPreference, MessageResponse } from "../types"
import { getUserActiveWorkspaceId, getSelectedWorkspaceSlug } from "./workspace-service"

/**
 * Cache for Figma metadata (includes token)
 */
interface FigmaMetadataCache {
  data: FigmaMetadataResponse | undefined
  expiresAt: Date | undefined
}

let figmaMetadataCache: FigmaMetadataCache = {
  data: undefined,
  expiresAt: undefined
}

/**
 * Clear the Figma metadata cache
 */
export function clearFigmaMetadataCache(): void {
  figmaMetadataCache.data = undefined
  figmaMetadataCache.expiresAt = undefined
}

/**
 * Handle workspace change - clear caches
 */
export function handleWorkspaceChange(): void {
  clearTokenCache()
  clearFigmaMetadataCache()
}

/**
 * Fetch Figma metadata
 */
export async function fetchFigmaMetadata(data: {
  websiteUrl?: string | undefined
  force?: boolean | undefined
  workspaceId?: string | undefined
}): Promise<MessageResponse<FigmaMetadataResponse>> {
  try {
    if (data.force) {
      clearFigmaMetadataCache()
    }

    // Get workspace ID from data, or try to get stored/active workspace ID
    let workspaceId = data.workspaceId
    if (!workspaceId) {
      workspaceId = await getUserActiveWorkspaceId()
    }

    if (!workspaceId) {
      return {
        success: false,
        error:
          "No workspace selected. Open the Pixzlo extension popup and select a workspace."
      }
    }

    // Build URL with query parameters
    const urlParams = new URLSearchParams()
    if (data.websiteUrl) {
      urlParams.set("websiteUrl", data.websiteUrl)
    }
    if (workspaceId) {
      urlParams.set("workspaceId", workspaceId)
    }

    const queryString = urlParams.toString()
    const url = `${PIXZLO_WEB_URL}/api/integrations/figma/metadata${
      queryString ? `?${queryString}` : ""
    }`

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use this feature."
        }
      }

      return {
        success: false,
        error: errorData.error || "Failed to fetch Figma metadata"
      }
    }

    const result = (await response.json()) as {
      success: boolean
      data?: FigmaMetadataResponse
      error?: string
    }

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch Figma metadata"
      }
    }

    // Cache metadata for subsequent requests
    figmaMetadataCache.data = result.data
    figmaMetadataCache.expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    return { success: true, data: result.data }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch Figma metadata"
    }
  }
}

/**
 * Fetch Figma preference
 */
export async function fetchFigmaPreference(data: {
  websiteUrl: string
}): Promise<MessageResponse<{ preference?: FigmaPreference }>> {
  try {
    const workspaceId = await getUserActiveWorkspaceId()
    if (!workspaceId) {
      return {
        success: false,
        error:
          "No workspace selected. Open the Pixzlo extension popup and select a workspace."
      }
    }

    const url = new URL(`${PIXZLO_WEB_URL}/api/integrations/figma/preferences`)
    url.searchParams.set("websiteUrl", data.websiteUrl)
    url.searchParams.set("workspaceId", workspaceId)

    const response = await fetch(url.toString(), {
      method: "GET",
      credentials: "include"
    })

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use this feature."
        }
      }

      return {
        success: false,
        error: errorData.error || "Failed to fetch Figma preference"
      }
    }

    const result = await response.json()
    return { success: true, data: { preference: result.preference } }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch Figma preference"
    }
  }
}

/**
 * Update Figma preference
 */
export async function updateFigmaPreference(data: {
  websiteUrl: string
  frameId: string
  frameName?: string
  fileId?: string
  frameUrl?: string
  frameImageUrl?: string
}): Promise<MessageResponse<FigmaMetadataResponse>> {
  try {
    const workspaceId = await getUserActiveWorkspaceId()
    if (!workspaceId) {
      return {
        success: false,
        error:
          "No workspace selected. Open the Pixzlo extension popup and select a workspace."
      }
    }

    const response = await fetch(
      `${PIXZLO_WEB_URL}/api/integrations/figma/preferences`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, workspaceId })
      }
    )

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use this feature."
        }
      }

      return {
        success: false,
        error: errorData.error || "Failed to update Figma preference"
      }
    }

    // After updating the preference retrieve metadata again
    return fetchFigmaMetadata({ websiteUrl: data.websiteUrl })
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update Figma preference"
    }
  }
}

/**
 * Create a Figma design link
 */
export async function createFigmaDesignLink(data: {
  websiteUrl?: string | undefined
  pageTitle?: string | undefined
  faviconUrl?: string | undefined
  linkData: {
    figma_file_id: string
    figma_frame_id: string
    frame_name?: string
    frame_url: string
    thumbnail_url?: string
  }
}): Promise<MessageResponse<FigmaMetadataResponse>> {
  try {
    const websiteUrl = data.websiteUrl ?? ""
    const url = `${PIXZLO_WEB_URL}/api/websites/figma-links`

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        websiteUrl,
        pageTitle: data.pageTitle,
        faviconUrl: data.faviconUrl,
        ...data.linkData
      })
    })

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use this feature."
        }
      }

      return {
        success: false,
        error: errorData.error || "Failed to create Figma design link"
      }
    }

    // Force refresh metadata to include the new link
    return fetchFigmaMetadata({ websiteUrl, force: true })
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create design link"
    }
  }
}

/**
 * Delete a Figma design link
 */
export async function deleteFigmaDesignLink(data: {
  websiteUrl?: string | undefined
  linkId: string
}): Promise<MessageResponse<FigmaMetadataResponse>> {
  try {
    const websiteUrl = data.websiteUrl ?? ""
    const url = `${PIXZLO_WEB_URL}/api/websites/figma-links/${data.linkId}`

    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use this feature."
        }
      }

      return {
        success: false,
        error: errorData.error || "Failed to delete Figma design link"
      }
    }

    // Force refresh metadata
    return fetchFigmaMetadata({ websiteUrl, force: true })
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete design link"
    }
  }
}

/**
 * Handle Figma OAuth flow
 */
export async function handleFigmaOAuth(
  workspaceId?: string
): Promise<MessageResponse<void>> {
  return new Promise((resolve) => {
    const workspaceIdPromise = workspaceId
      ? Promise.resolve(workspaceId)
      : getUserActiveWorkspaceId()

    workspaceIdPromise
      .then((wsId) => {
        if (!wsId) {
          throw new Error(
            "No workspace selected. Open the Pixzlo extension popup and select a workspace."
          )
        }
        return fetch(`${PIXZLO_WEB_URL}/api/integrations/figma/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ workspaceId: wsId })
        })
      })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        return data.authUrl
      })
      .then((authUrl) => {
        const popupWidth = 500
        const popupHeight = 700

        chrome.windows.create(
          {
            url: authUrl,
            type: "popup",
            width: popupWidth,
            height: popupHeight,
            focused: true
          },
          (authWindow) => {
            if (!authWindow) {
              resolve({
                success: false,
                error: "Failed to create auth window"
              })
              return
            }

            const onTabUpdated = (
              tabId: number,
              changeInfo: chrome.tabs.TabChangeInfo,
              tab: chrome.tabs.Tab
            ): void => {
              if (tab.windowId === authWindow.id && tab.url) {
                const url = tab.url.toLowerCase()
                const isSettingsPage =
                  url.includes("/settings/connected") ||
                  url.includes("/settings/integrations")
                const hasResultParam =
                  url.includes("success=") || url.includes("error=")
                const isFigmaCallbackWithCode =
                  url.includes("/figma-callback") && url.includes("code=")

                if (isFigmaCallbackWithCode) {
                  return
                }

                if (isSettingsPage && hasResultParam) {
                  chrome.tabs.onUpdated.removeListener(onTabUpdated)
                  chrome.windows.onRemoved.removeListener(onWindowRemoved)
                  chrome.windows.remove(authWindow.id)

                  const urlObj = new URL(tab.url)
                  const successParam = urlObj.searchParams.get("success")
                  const errorParam = urlObj.searchParams.get("error")

                  if (successParam) {
                    clearFigmaMetadataCache()
                    clearTokenCache()
                    resolve({ success: true })
                  } else if (errorParam) {
                    resolve({
                      success: false,
                      error: decodeURIComponent(errorParam)
                    })
                  } else {
                    resolve({
                      success: false,
                      error: "OAuth failed or was cancelled"
                    })
                  }
                } else if (isSettingsPage && !hasResultParam) {
                  setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(onTabUpdated)
                    chrome.windows.onRemoved.removeListener(onWindowRemoved)
                    chrome.windows.remove(authWindow.id)

                    clearFigmaMetadataCache()
                    clearTokenCache()
                    resolve({ success: true })
                  }, 500)
                }
              }
            }

            const onWindowRemoved = (windowId: number): void => {
              if (windowId === authWindow.id) {
                chrome.tabs.onUpdated.removeListener(onTabUpdated)
                chrome.windows.onRemoved.removeListener(onWindowRemoved)
                resolve({
                  success: false,
                  error: "OAuth cancelled by user"
                })
              }
            }

            chrome.tabs.onUpdated.addListener(onTabUpdated)
            chrome.windows.onRemoved.addListener(onWindowRemoved)
          }
        )
      })
      .catch((error) => {
        resolve({
          success: false,
          error: error.message || "Failed to setup OAuth"
        })
      })
  })
}

/**
 * Open integrations settings page
 */
export async function openIntegrationsSettings(): Promise<
  MessageResponse<{ url: string }>
> {
  try {
    const workspaceSlug = await getSelectedWorkspaceSlug()
    const url = workspaceSlug
      ? `${PIXZLO_WEB_URL}/${workspaceSlug}/settings/integrations`
      : `${PIXZLO_WEB_URL}/settings/integrations`

    await new Promise<void>((resolve, reject) => {
      chrome.tabs.create({ url }, () => {
        const lastError = chrome.runtime.lastError
        if (lastError) {
          reject(new Error(lastError.message))
          return
        }
        resolve()
      })
    })

    return { success: true, data: { url } }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to open settings"
    }
  }
}
