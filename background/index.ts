/**
 * Background Service Worker Entry Point
 *
 * This is the new modular background script following OOP and SOLID principles.
 * All functionality has been split into dedicated service modules:
 *
 * - LinearService: Handles Linear integration (status, issues, preferences)
 * - FigmaBackgroundService: Handles Figma integration (auth, files, rendering)
 * - ScreenshotService: Handles screenshot capture
 * - IssueSubmissionService: Handles issue creation with batch upload
 * - OAuthService: Handles OAuth authentication flows
 *
 * Message routing is handled by the MessageHandler which follows the
 * Open-Closed Principle - new message types can be added without modification.
 */

import { handleMessage } from "./handlers/message-handler"

// Register the main message listener
chrome.runtime.onMessage.addListener(handleMessage)

console.log("✅ Pixzlo background service worker initialized (modular architecture)")

// Export services for direct use if needed
export { figmaBackgroundService } from "./services/figma-service"
export { issueSubmissionService } from "./services/issue-service"
export { linearService } from "./services/linear-service"
export { oauthService } from "./services/oauth-service"
export { screenshotService } from "./services/screenshot-service"

// Export types
export type * from "./types/messages"

// Export utilities
export { apiClient, fetchFigmaApi } from "./utils/api-client"
export { Cache, CachedRequestHandler, RequestDeduplicator } from "./utils/cache"
