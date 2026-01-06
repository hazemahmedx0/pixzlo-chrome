/**
 * Message Handler Service
 *
 * Orchestrates message routing for the Chrome extension background script.
 * Follows the Single Responsibility Principle by delegating specific operations
 * to their respective services.
 *
 * This implements a Command Pattern where each message type is handled by
 * a specific handler method.
 */

import type {
  CaptureArea,
  ExtensionMessage,
  FigmaDesignLinkCreateRequest,
  FigmaPreferenceUpdateRequest,
  IFigmaService,
  IIssueSubmissionService,
  ILinearService,
  IMessageHandlerService,
  IScreenshotService,
  IWorkspaceService,
  IssueSubmissionPayload,
  LinearCreateIssueRequest,
  LinearPreferenceUpdateRequest
} from "./interfaces"

/**
 * Message type constants for type-safe message handling
 */
export const MESSAGE_TYPES = {
  // Extension state
  GET_PINNED_STATE: "GET_PINNED_STATE",
  OPEN_INTEGRATIONS_SETTINGS: "OPEN_INTEGRATIONS_SETTINGS",

  // Linear operations
  LINEAR_CHECK_STATUS: "linear-check-status",
  LINEAR_CREATE_ISSUE: "linear-create-issue",
  LINEAR_FETCH_OPTIONS: "linear-fetch-options",
  LINEAR_FETCH_METADATA: "linear-fetch-metadata",
  LINEAR_FETCH_PREFERENCE: "linear-fetch-preference",
  LINEAR_UPDATE_PREFERENCE: "linear-update-preference",

  // Figma operations
  FIGMA_FETCH_METADATA: "figma-fetch-metadata",
  FIGMA_FETCH_PREFERENCE: "figma-fetch-preference",
  FIGMA_UPDATE_PREFERENCE: "figma-update-preference",
  FIGMA_CREATE_DESIGN_LINK: "figma-create-design-link",
  FIGMA_DELETE_DESIGN_LINK: "figma-delete-design-link",
  FIGMA_OAUTH: "FIGMA_OAUTH",
  FIGMA_API_CALL: "FIGMA_API_CALL",
  FIGMA_RENDER_FRAME: "FIGMA_RENDER_FRAME",
  FIGMA_RENDER_ELEMENT: "FIGMA_RENDER_ELEMENT",
  FIGMA_GET_IMAGE: "FIGMA_GET_IMAGE",

  // Screenshot operations
  CAPTURE_ELEMENT_SCREENSHOT: "CAPTURE_ELEMENT_SCREENSHOT",
  CAPTURE_SCREEN: "capture-screen",
  FETCH_IMAGE_DATA_URL: "FETCH_IMAGE_DATA_URL",

  // Pages tree
  FETCH_PAGES_TREE: "FETCH_PAGES_TREE",

  // Issue submission
  SUBMIT_ISSUE: "SUBMIT_ISSUE",

  // API calls
  API_CALL: "API_CALL",
  DUMMY_API_CALL: "dummy-api-call"
} as const

/**
 * Message Handler Service Implementation
 */
export class MessageHandlerService implements IMessageHandlerService {
  readonly serviceName = "MessageHandlerService"

  private readonly workspaceService: IWorkspaceService
  private readonly linearService: ILinearService
  private readonly figmaService: IFigmaService
  private readonly screenshotService: IScreenshotService
  private readonly issueSubmissionService: IIssueSubmissionService
  private readonly apiBaseUrl: string

  constructor(
    workspaceService: IWorkspaceService,
    linearService: ILinearService,
    figmaService: IFigmaService,
    screenshotService: IScreenshotService,
    issueSubmissionService: IIssueSubmissionService,
    apiBaseUrl: string
  ) {
    this.workspaceService = workspaceService
    this.linearService = linearService
    this.figmaService = figmaService
    this.screenshotService = screenshotService
    this.issueSubmissionService = issueSubmissionService
    this.apiBaseUrl = apiBaseUrl
  }

  /**
   * Main message handler that routes messages to appropriate handlers
   */
  handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): boolean | void {
    console.log(`[${this.serviceName}] Received message:`, message.type)

    const handler = this.getHandler(message.type)

    if (handler) {
      handler(message, sender, sendResponse)
      return true // Keep message channel open for async response
    }

    // Message type not handled
    console.log(`[${this.serviceName}] Unhandled message type:`, message.type)
    return false
  }

  /**
   * Returns the appropriate handler function for a message type
   */
  private getHandler(
    messageType: string
  ): ((
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => void) | undefined {
    const handlers: Record<string, typeof this.getHandler extends (t: string) => infer R ? NonNullable<R> : never> = {
      // Extension state
      [MESSAGE_TYPES.GET_PINNED_STATE]: this.handleGetPinnedState.bind(this),
      [MESSAGE_TYPES.OPEN_INTEGRATIONS_SETTINGS]: this.handleOpenIntegrationsSettings.bind(this),

      // Linear operations
      [MESSAGE_TYPES.LINEAR_CHECK_STATUS]: this.handleLinearCheckStatus.bind(this),
      [MESSAGE_TYPES.LINEAR_CREATE_ISSUE]: this.handleLinearCreateIssue.bind(this),
      [MESSAGE_TYPES.LINEAR_FETCH_OPTIONS]: this.handleLinearFetchMetadata.bind(this),
      [MESSAGE_TYPES.LINEAR_FETCH_METADATA]: this.handleLinearFetchMetadata.bind(this),
      [MESSAGE_TYPES.LINEAR_FETCH_PREFERENCE]: this.handleLinearFetchPreference.bind(this),
      [MESSAGE_TYPES.LINEAR_UPDATE_PREFERENCE]: this.handleLinearUpdatePreference.bind(this),

      // Figma operations
      [MESSAGE_TYPES.FIGMA_FETCH_METADATA]: this.handleFigmaFetchMetadata.bind(this),
      [MESSAGE_TYPES.FIGMA_FETCH_PREFERENCE]: this.handleFigmaFetchPreference.bind(this),
      [MESSAGE_TYPES.FIGMA_UPDATE_PREFERENCE]: this.handleFigmaUpdatePreference.bind(this),
      [MESSAGE_TYPES.FIGMA_CREATE_DESIGN_LINK]: this.handleFigmaCreateDesignLink.bind(this),
      [MESSAGE_TYPES.FIGMA_DELETE_DESIGN_LINK]: this.handleFigmaDeleteDesignLink.bind(this),
      [MESSAGE_TYPES.FIGMA_OAUTH]: this.handleFigmaOAuth.bind(this),
      [MESSAGE_TYPES.FIGMA_API_CALL]: this.handleFigmaApiCall.bind(this),
      [MESSAGE_TYPES.FIGMA_RENDER_FRAME]: this.handleFigmaRenderFrame.bind(this),
      [MESSAGE_TYPES.FIGMA_RENDER_ELEMENT]: this.handleFigmaRenderElement.bind(this),
      [MESSAGE_TYPES.FIGMA_GET_IMAGE]: this.handleFigmaGetImage.bind(this),

      // Screenshot operations
      [MESSAGE_TYPES.CAPTURE_ELEMENT_SCREENSHOT]: this.handleCaptureElementScreenshot.bind(this),
      [MESSAGE_TYPES.CAPTURE_SCREEN]: this.handleCaptureScreen.bind(this),
      [MESSAGE_TYPES.FETCH_IMAGE_DATA_URL]: this.handleFetchImageDataUrl.bind(this),

      // Pages tree
      [MESSAGE_TYPES.FETCH_PAGES_TREE]: this.handleFetchPagesTree.bind(this),

      // Issue submission
      [MESSAGE_TYPES.SUBMIT_ISSUE]: this.handleSubmitIssue.bind(this),

      // API calls
      [MESSAGE_TYPES.API_CALL]: this.handleApiCall.bind(this),
      [MESSAGE_TYPES.DUMMY_API_CALL]: this.handleDummyApiCall.bind(this)
    }

    return handlers[messageType]
  }

  // ==========================================================================
  // Extension State Handlers
  // ==========================================================================

  private handleGetPinnedState(
    _message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    this.checkExtensionPinnedState()
      .then((isPinned) => sendResponse({ success: true, isPinned }))
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      )
  }

  private handleOpenIntegrationsSettings(
    _message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    this.openIntegrationsSettings()
      .then((url) => sendResponse({ success: true, url }))
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to open settings"
        })
      )
  }

  // ==========================================================================
  // Linear Handlers
  // ==========================================================================

  private handleLinearCheckStatus(
    _message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    this.linearService
      .checkStatus()
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      )
  }

  private handleLinearCreateIssue(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    this.linearService
      .createIssue(message.data as LinearCreateIssueRequest)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      )
  }

  private handleLinearFetchMetadata(
    _message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    this.linearService
      .fetchMetadata()
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      )
  }

  private handleLinearFetchPreference(
    _message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    this.linearService
      .fetchPreference()
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      )
  }

  private handleLinearUpdatePreference(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    this.linearService
      .updatePreference(message.data as LinearPreferenceUpdateRequest)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      )
  }

  // ==========================================================================
  // Figma Handlers
  // ==========================================================================

  private handleFigmaFetchMetadata(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    const data = (message.data || {}) as { websiteUrl?: string; force?: boolean; workspaceId?: string }
    this.figmaService
      .fetchMetadata(data.websiteUrl, { force: data.force, workspaceId: data.workspaceId })
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      )
  }

  private handleFigmaFetchPreference(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    const data = message.data as { websiteUrl: string }
    this.figmaService
      .fetchPreference(data.websiteUrl)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      )
  }

  private handleFigmaUpdatePreference(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    this.figmaService
      .updatePreference(message.data as FigmaPreferenceUpdateRequest)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      )
  }

  private handleFigmaCreateDesignLink(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    this.figmaService
      .createDesignLink(message.data as FigmaDesignLinkCreateRequest)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      )
  }

  private handleFigmaDeleteDesignLink(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    const data = message.data as { linkId: string }
    this.figmaService
      .deleteDesignLink(data.linkId)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      )
  }

  private handleFigmaOAuth(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    const data = message.data as { workspaceId?: string } | undefined
    this.handleFigmaOAuthFlow(data?.workspaceId, sendResponse)
  }

  private handleFigmaApiCall(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    const method = message.method as string

    if (method === "GET_FILE") {
      const fileId = message.fileId as string
      this.figmaService
        .fetchFile(fileId)
        .then(sendResponse)
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch Figma file"
          })
        )
    }
  }

  private handleFigmaRenderFrame(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    const figmaUrl = message.figmaUrl as string
    this.figmaService
      .renderFrame(figmaUrl)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to render Figma frame"
        })
      )
  }

  private handleFigmaRenderElement(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    const { fileId, nodeId } = message as unknown as { fileId: string; nodeId: string }
    this.figmaService
      .renderElement(fileId, nodeId)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to render element"
        })
      )
  }

  private handleFigmaGetImage(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    const { fileId, nodeId } = message as unknown as { fileId: string; nodeId: string }
    this.figmaService
      .renderElement(fileId, nodeId)
      .then((result) => {
        if (result.success && result.data) {
          sendResponse({ success: true, data: { imageUrl: result.data.imageUrl } })
        } else {
          sendResponse(result)
        }
      })
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch image"
        })
      )
  }

  // ==========================================================================
  // Screenshot Handlers
  // ==========================================================================

  private handleCaptureElementScreenshot(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    const area = message.area as CaptureArea
    this.screenshotService
      .captureElementScreenshot(area)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to capture screenshot"
        })
      )
  }

  private handleCaptureScreen(
    _message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    if (!sender.tab?.windowId) {
      sendResponse({
        success: false,
        error: "Capture denied: no active tab context"
      })
      return
    }

    this.screenshotService
      .captureVisibleTab(sender.tab.windowId)
      .then((result) => {
        if (result.success && result.data) {
          sendResponse({ dataUrl: result.data.dataUrl, success: true })
        } else {
          sendResponse(result)
        }
      })
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to capture screen"
        })
      )
  }

  private handleFetchImageDataUrl(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    const url = message.url as string
    console.log(`[${this.serviceName}] Fetching image data URL:`, url)

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
        }
        return response.blob()
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = (): void => {
              if (typeof reader.result === "string") {
                resolve(reader.result)
              } else {
                reject(new Error("Failed to convert blob to data URL"))
              }
            }
            reader.onerror = (): void => reject(new Error("Failed to read image blob"))
            reader.readAsDataURL(blob)
          })
      )
      .then((dataUrl) => sendResponse({ success: true, dataUrl }))
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      )
  }

  // ==========================================================================
  // Pages Tree Handler
  // ==========================================================================

  private handleFetchPagesTree(
    _message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    this.fetchPagesTree()
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to fetch pages tree"
        })
      )
  }

  // ==========================================================================
  // Issue Submission Handler
  // ==========================================================================

  private handleSubmitIssue(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    const payload = (message.payload || {}) as IssueSubmissionPayload
    this.issueSubmissionService
      .submitIssue(payload)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Submit failed"
        })
      )
  }

  // ==========================================================================
  // API Call Handlers
  // ==========================================================================

  private handleApiCall(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    const { endpoint, options } = message as unknown as {
      endpoint: string
      options: { method?: string; headers?: Record<string, string>; body?: string }
    }
    const url = `${this.apiBaseUrl}${endpoint}`

    console.log(`[${this.serviceName}] Making API call:`, url)

    fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      body: options.body,
      credentials: "include"
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: `HTTP ${response.status} ${response.statusText}`
          }))
          sendResponse({
            success: false,
            error: (errorData as { error?: string }).error || `HTTP ${response.status}`
          })
          return
        }

        const data = await response.json()
        sendResponse({ success: true, data })
      })
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Network error"
        })
      )
  }

  private handleDummyApiCall(
    _message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): void {
    fetch("https://jsonplaceholder.typicode.com/posts/1")
      .then((response) => response.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((error) =>
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      )
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async checkExtensionPinnedState(): Promise<boolean> {
    try {
      const settings = await chrome.action.getUserSettings()
      return settings.isOnToolbar
    } catch (error) {
      console.error(`[${this.serviceName}] Failed to check pinned state:`, error)
      return false
    }
  }

  private async openIntegrationsSettings(): Promise<string> {
    const workspaceSlug = await this.workspaceService.getSelectedWorkspaceSlug()
    const url = workspaceSlug
      ? `${this.apiBaseUrl}/${workspaceSlug}/settings/integrations`
      : `${this.apiBaseUrl}/settings/integrations`

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

    return url
  }

  private async fetchPagesTree(): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const workspaceId = await this.workspaceService.getUserActiveWorkspaceId()

      let url = `${this.apiBaseUrl}/api/websites/tree`
      if (workspaceId) {
        url += `?workspace_id=${encodeURIComponent(workspaceId)}`
      }

      const response = await fetch(url, {
        method: "GET",
        credentials: "include"
      })

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error: "Please log in to Pixzlo to access pages."
          }
        }

        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error:
            (errorData as { error?: string }).error ||
            `Failed to fetch pages (${response.status})`
        }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error(`[${this.serviceName}] Pages tree fetch error:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch pages tree"
      }
    }
  }

  private handleFigmaOAuthFlow(
    workspaceId: string | undefined,
    sendResponse: (response: unknown) => void
  ): void {
    const startTime = Date.now()

    const workspaceIdPromise = workspaceId
      ? Promise.resolve(workspaceId)
      : this.workspaceService.getUserActiveWorkspaceId()

    workspaceIdPromise
      .then((resolvedWorkspaceId) => {
        if (!resolvedWorkspaceId) {
          throw new Error(
            "No workspace selected. Open the Pixzlo extension popup and select a workspace."
          )
        }
        return this.figmaService.startOAuth(resolvedWorkspaceId)
      })
      .then((result) => {
        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to start OAuth")
        }

        const elapsed = Date.now() - startTime
        console.log(`[${this.serviceName}] Got auth URL in ${elapsed}ms`)

        this.launchOAuthWindow(result.data.authUrl, startTime, sendResponse)
      })
      .catch((error) => {
        console.error(`[${this.serviceName}] OAuth failed:`, error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Failed to setup OAuth"
        })
      })
  }

  private launchOAuthWindow(
    authUrl: string,
    startTime: number,
    sendResponse: (response: unknown) => void
  ): void {
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
          sendResponse({
            success: false,
            error: "Failed to create auth window"
          })
          return
        }

        this.setupOAuthListeners(authWindow, startTime, sendResponse)
      }
    )
  }

  private setupOAuthListeners(
    authWindow: chrome.windows.Window,
    startTime: number,
    sendResponse: (response: unknown) => void
  ): void {
    let responded = false

    const onTabUpdated = (
      tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ): void => {
      if (responded || tab.windowId !== authWindow.id || !tab.url) {
        return
      }

      const url = tab.url.toLowerCase()
      const isSettingsPage =
        url.includes("/settings/connected") || url.includes("/settings/integrations")
      const hasResultParam = url.includes("success=") || url.includes("error=")
      const isFigmaCallbackWithCode =
        url.includes("/figma-callback") && url.includes("code=")

      if (isFigmaCallbackWithCode) {
        console.log(`[${this.serviceName}] Figma OAuth code received, waiting for redirect...`)
        return
      }

      if (isSettingsPage && hasResultParam) {
        const totalTime = Date.now() - startTime
        console.log(`[${this.serviceName}] Figma OAuth completed in ${totalTime}ms`)

        responded = true
        chrome.tabs.onUpdated.removeListener(onTabUpdated)
        chrome.windows.onRemoved.removeListener(onWindowRemoved)
        chrome.windows.remove(authWindow.id!)

        const urlObj = new URL(tab.url!)
        const successParam = urlObj.searchParams.get("success")
        const errorParam = urlObj.searchParams.get("error")

        if (successParam) {
          this.figmaService.clearMetadataCache()
          sendResponse({ success: true })
        } else if (errorParam) {
          sendResponse({
            success: false,
            error: decodeURIComponent(errorParam)
          })
        } else {
          sendResponse({
            success: false,
            error: "OAuth failed or was cancelled"
          })
        }
      } else if (isSettingsPage && !hasResultParam) {
        // Settings page loaded but no result params - wait briefly
        setTimeout(() => {
          if (responded) return
          responded = true
          chrome.tabs.onUpdated.removeListener(onTabUpdated)
          chrome.windows.onRemoved.removeListener(onWindowRemoved)
          chrome.windows.remove(authWindow.id!)
          this.figmaService.clearMetadataCache()
          sendResponse({ success: true })
        }, 500)
      }
    }

    const onWindowRemoved = (windowId: number): void => {
      if (responded || windowId !== authWindow.id) {
        return
      }
      responded = true
      chrome.tabs.onUpdated.removeListener(onTabUpdated)
      chrome.windows.onRemoved.removeListener(onWindowRemoved)
      sendResponse({
        success: false,
        error: "OAuth cancelled by user"
      })
    }

    chrome.tabs.onUpdated.addListener(onTabUpdated)
    chrome.windows.onRemoved.addListener(onWindowRemoved)
  }
}
