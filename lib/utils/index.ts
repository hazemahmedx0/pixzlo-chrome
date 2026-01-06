/**
 * Shared Utilities Module
 *
 * Centralizes common utility functions and helpers used across the extension.
 */

// Chrome Extension Communication
export {
  sendMessageToBackground,
  sendMessageOrThrow,
  createMessageSender,
  isChromeRuntimeValid,
  promisifyChrome,
  type ChromeMessageResponse
} from "./chrome-messaging"

// Chrome Storage
export {
  getStorageValue,
  setStorageValue,
  removeStorageValue,
  getMultipleStorageValues,
  onStorageChange,
  watchStorageKey,
  isChromeStorageAvailable,
  STORAGE_KEYS,
  type StorageKey
} from "./chrome-storage"
