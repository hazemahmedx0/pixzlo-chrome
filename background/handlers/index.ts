/**
 * Background Handlers Module
 *
 * Central export point for all message handlers.
 */

// Extension handlers
export {
  checkExtensionPinnedState,
  handleGetPinnedState,
  handleOpenIntegrationsSettings,
  setupExtensionLifecycleHandlers
} from "./extension-handlers"

// Linear handlers
export {
  handleLinearCheckStatus,
  handleLinearCreateIssue,
  handleLinearFetchMetadata,
  handleLinearFetchPreference,
  handleLinearUpdatePreference
} from "./linear-handlers"

// Figma handlers
export {
  handleFigmaGetFile,
  handleFigmaRenderFrame,
  handleFigmaRenderElement,
  handleFigmaGetImage,
  handleFigmaOAuth,
  handleFigmaFetchPreference,
  handleFigmaUpdatePreference,
  handleFigmaFetchMetadata,
  handleFigmaCreateDesignLink,
  handleFigmaDeleteDesignLink
} from "./figma-handlers"

// Capture handlers
export {
  handleCaptureScreen,
  handleCaptureElementScreenshot,
  handleFetchImageDataUrl
} from "./capture-handlers"

// API handlers
export {
  handleApiCall,
  handleDummyApiCall,
  handleSubmitIssue,
  handleFetchPagesTree
} from "./api-handlers"
