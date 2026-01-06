/**
 * Chrome Storage Utilities
 *
 * Provides type-safe, consistent access to Chrome extension storage
 * with proper error handling and fallbacks.
 */

/**
 * Storage key constants
 */
export const STORAGE_KEYS = {
  WORKSPACE_ID: "pixzlo_selected_workspace_id",
  AUTH_TOKEN: "pixzlo_auth_token",
  USER_PREFERENCES: "pixzlo_user_preferences",
  LINEAR_CACHE: "pixzlo_linear_cache",
  FIGMA_CACHE: "pixzlo_figma_cache"
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

/**
 * Checks if Chrome storage is available
 */
export function isChromeStorageAvailable(): boolean {
  return typeof chrome !== "undefined" && chrome.storage?.local !== undefined
}

/**
 * Gets a value from Chrome local storage
 * @param key - The storage key
 * @returns Promise resolving to the value or undefined
 */
export async function getStorageValue<T>(key: StorageKey | string): Promise<T | undefined> {
  if (!isChromeStorageAvailable()) {
    // Fallback to localStorage if Chrome storage not available
    if (typeof localStorage !== "undefined") {
      try {
        const value = localStorage.getItem(key)
        return value ? (JSON.parse(value) as T) : undefined
      } catch {
        return undefined
      }
    }
    return undefined
  }

  try {
    const result = await chrome.storage.local.get(key)
    return result[key] as T | undefined
  } catch (error) {
    console.error(`[ChromeStorage] Failed to get ${key}:`, error)
    return undefined
  }
}

/**
 * Sets a value in Chrome local storage
 * @param key - The storage key
 * @param value - The value to store
 */
export async function setStorageValue<T>(key: StorageKey | string, value: T): Promise<void> {
  if (!isChromeStorageAvailable()) {
    // Fallback to localStorage if Chrome storage not available
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error(`[ChromeStorage] Failed to set ${key} in localStorage:`, error)
      }
    }
    return
  }

  try {
    await chrome.storage.local.set({ [key]: value })
  } catch (error) {
    console.error(`[ChromeStorage] Failed to set ${key}:`, error)
  }
}

/**
 * Removes a value from Chrome local storage
 * @param key - The storage key
 */
export async function removeStorageValue(key: StorageKey | string): Promise<void> {
  if (!isChromeStorageAvailable()) {
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error(`[ChromeStorage] Failed to remove ${key} from localStorage:`, error)
      }
    }
    return
  }

  try {
    await chrome.storage.local.remove(key)
  } catch (error) {
    console.error(`[ChromeStorage] Failed to remove ${key}:`, error)
  }
}

/**
 * Gets multiple values from Chrome local storage
 * @param keys - Array of storage keys
 * @returns Promise resolving to an object with the values
 */
export async function getMultipleStorageValues<T extends Record<string, unknown>>(
  keys: (StorageKey | string)[]
): Promise<Partial<T>> {
  if (!isChromeStorageAvailable()) {
    const result: Partial<T> = {}
    if (typeof localStorage !== "undefined") {
      for (const key of keys) {
        try {
          const value = localStorage.getItem(key)
          if (value) {
            ;(result as Record<string, unknown>)[key] = JSON.parse(value)
          }
        } catch {
          // Skip invalid values
        }
      }
    }
    return result
  }

  try {
    const result = await chrome.storage.local.get(keys)
    return result as Partial<T>
  } catch (error) {
    console.error("[ChromeStorage] Failed to get multiple values:", error)
    return {}
  }
}

/**
 * Listens for storage changes
 * @param callback - Function to call when storage changes
 * @returns Cleanup function to remove the listener
 */
export function onStorageChange(
  callback: (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => void
): () => void {
  if (!isChromeStorageAvailable() || !chrome.storage.onChanged) {
    return () => {}
  }

  chrome.storage.onChanged.addListener(callback)

  return () => {
    chrome.storage.onChanged.removeListener(callback)
  }
}

/**
 * Watches a specific storage key for changes
 * @param key - The storage key to watch
 * @param callback - Function to call when the value changes
 * @returns Cleanup function
 */
export function watchStorageKey<T>(
  key: StorageKey | string,
  callback: (newValue: T | undefined, oldValue: T | undefined) => void
): () => void {
  return onStorageChange((changes, areaName) => {
    if (areaName === "local" && changes[key]) {
      callback(changes[key].newValue as T | undefined, changes[key].oldValue as T | undefined)
    }
  })
}
