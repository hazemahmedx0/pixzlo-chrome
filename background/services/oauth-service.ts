/**
 * OAuth Service
 * Handles OAuth authentication flows for integrations (Figma).
 *
 * Follows Single Responsibility Principle - only handles OAuth flows.
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import type { ApiResponse } from "../types/messages"
import { apiClient } from "../utils/api-client"

/**
 * Service class for OAuth operations
 */
export class OAuthService {
  private static instance: OAuthService

  static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService()
    }
    return OAuthService.instance
  }

  /**
   * Initiates Figma OAuth flow by opening a popup window
   */
  async initiateFigmaOAuth(
    sendResponse: (response: ApiResponse<void>) => void
  ): Promise<void> {
    const startTime = Date.now()

    try {
      // Get auth URL from server
      const response = await apiClient.post<{ authUrl: string }>(
        "/api/integrations/figma/auth"
      )

      if (!response.success || !response.data?.authUrl) {
        sendResponse({
          success: false,
          error: response.error || "Failed to get auth URL"
        })
        return
      }

      const authUrl = response.data.authUrl
      const elapsed = Date.now() - startTime
      console.log(`Background script - Got auth URL in ${elapsed}ms`)

      // Launch OAuth popup
      this.launchOAuthPopup(authUrl, startTime, sendResponse)
    } catch (error) {
      console.error("Background script - OAuth failed:", error)
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Failed to setup OAuth"
      })
    }
  }

  /**
   * Launches OAuth popup window and handles the callback
   */
  private launchOAuthPopup(
    authUrl: string,
    startTime: number,
    sendResponse: (response: ApiResponse<void>) => void
  ): void {
    const popupWidth = 500
    const popupHeight = 700

    chrome.system.display.getInfo((displays) => {
      const primaryDisplay =
        displays.find((display) => display.isPrimary) || displays[0]
      const screenWidth = primaryDisplay.bounds.width
      const screenHeight = primaryDisplay.bounds.height

      const left = Math.round((screenWidth - popupWidth) / 2)
      const top = Math.round((screenHeight - popupHeight) / 2)

      chrome.windows.create(
        {
          url: authUrl,
          type: "popup",
          width: popupWidth,
          height: popupHeight,
          left,
          top,
          focused: true
        },
        (authWindow) => {
          if (!authWindow) {
            sendResponse({
              success: false,
              error: "Failed to create auth window"
            })
            return
          }

          this.handleOAuthCallback(authWindow, startTime, sendResponse)
        }
      )
    })
  }

  /**
   * Handles OAuth callback by listening for URL changes in the auth window
   */
  private handleOAuthCallback(
    authWindow: chrome.windows.Window,
    startTime: number,
    sendResponse: (response: ApiResponse<void>) => void
  ): void {
    const onTabUpdated = (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) => {
      if (tab.windowId !== authWindow.id || !changeInfo.url || !tab.url) {
        return
      }

      // Check if this is the callback URL
      const isCallbackUrl =
        (tab.url.includes(`${PIXZLO_WEB_URL}/settings/integrations`) ||
          tab.url.includes("pixzlo.com/settings/integrations")) &&
        (tab.url.includes("success=") || tab.url.includes("error="))

      if (isCallbackUrl) {
        const totalTime = Date.now() - startTime
        console.log(
          `Background script - OAuth completed in ${totalTime}ms. URL: ${tab.url}`
        )

        // Clean up listeners
        chrome.tabs.onUpdated.removeListener(onTabUpdated)
        chrome.windows.onRemoved.removeListener(onWindowRemoved)

        // Close auth window
        chrome.windows.remove(authWindow.id!)

        // Parse URL to get success/error status
        const result = this.parseOAuthResult(tab.url)
        sendResponse(result)
      }
    }

    const onWindowRemoved = (windowId: number) => {
      if (windowId === authWindow.id) {
        chrome.tabs.onUpdated.removeListener(onTabUpdated)
        chrome.windows.onRemoved.removeListener(onWindowRemoved)
        sendResponse({
          success: false,
          error: "OAuth cancelled by user"
        })
      }
    }

    chrome.tabs.onUpdated.addListener(onTabUpdated)
    chrome.windows.onRemoved.addListener(onWindowRemoved)
  }

  /**
   * Parses OAuth callback URL to extract success/error status
   */
  private parseOAuthResult(url: string): ApiResponse<void> {
    try {
      const urlObj = new URL(url)
      const successParam = urlObj.searchParams.get("success")
      const errorParam = urlObj.searchParams.get("error")

      if (successParam) {
        console.log(`OAuth success: ${successParam}`)
        return { success: true }
      } else if (errorParam) {
        console.log(`OAuth error: ${errorParam}`)
        return {
          success: false,
          error: decodeURIComponent(errorParam)
        }
      } else {
        return {
          success: false,
          error: "OAuth failed or was cancelled"
        }
      }
    } catch {
      return {
        success: false,
        error: "Failed to parse OAuth callback"
      }
    }
  }
}

// Export singleton instance
export const oauthService = OAuthService.getInstance()
