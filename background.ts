/**
 * Background Service Worker
 *
 * This is the main entry point for the extension's background service worker.
 * All functionality has been refactored into dedicated service modules following
 * OOP and SOLID principles:
 *
 * Architecture:
 * - background/services/linear-service.ts - Linear integration
 * - background/services/figma-service.ts - Figma integration
 * - background/services/screenshot-service.ts - Screenshot capture
 * - background/services/issue-service.ts - Issue submission
 * - background/services/oauth-service.ts - OAuth flows
 * - background/handlers/message-handler.ts - Message routing
 * - background/utils/api-client.ts - HTTP client utilities
 * - background/utils/cache.ts - Caching utilities
 * - background/types/messages.ts - TypeScript interfaces
 *
 * Benefits:
 * - Single Responsibility: Each service handles one concern
 * - Open-Closed: New message types can be added without modifying existing code
 * - Dependency Inversion: Services depend on abstractions (ApiClient, Cache)
 * - Testability: Each service can be tested in isolation
 * - Maintainability: Changes are localized to specific service modules
 */

import { handleMessage } from "./background/handlers/message-handler"

// Register the main message listener
chrome.runtime.onMessage.addListener(handleMessage)

console.log("✅ Pixzlo background service worker initialized")
