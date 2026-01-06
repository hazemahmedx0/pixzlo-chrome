/**
 * Chrome Extension Messaging Utilities
 *
 * Provides type-safe, consistent messaging between content scripts and background service worker.
 * Centralizes error handling and response formatting.
 */

/**
 * Standard response format for Chrome extension messages
 */
export interface ChromeMessageResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Checks if Chrome runtime context is valid
 * @returns True if Chrome runtime is available and valid
 */
export function isChromeRuntimeValid(): boolean {
  return typeof chrome !== "undefined" && chrome.runtime !== undefined
}

/**
 * Sends a message to the background service worker with proper error handling
 * @param message - The message to send (must include a 'type' field)
 * @returns Promise resolving to the response
 */
export async function sendMessageToBackground<T>(
  message: { type: string; [key: string]: unknown }
): Promise<ChromeMessageResponse<T>> {
  if (!isChromeRuntimeValid()) {
    return {
      success: false,
      error: "Extension context invalidated"
    }
  }

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          const errorMessage = chrome.runtime.lastError.message || "Extension communication error"

          if (errorMessage.includes("Extension context invalidated")) {
            console.warn("[ChromeMessaging] Extension context invalidated during message")
          }

          resolve({
            success: false,
            error: errorMessage
          })
          return
        }

        // Handle undefined response (background didn't respond)
        if (response === undefined) {
          resolve({
            success: false,
            error: "No response from background service worker"
          })
          return
        }

        // If response already has success/error format, use it directly
        if (typeof response === "object" && "success" in response) {
          resolve(response as ChromeMessageResponse<T>)
          return
        }

        // Wrap raw response in success format
        resolve({
          success: true,
          data: response as T
        })
      })
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : "Failed to send message"
      })
    }
  })
}

/**
 * Sends a message and extracts data, throwing on error
 * Useful when you want to use try/catch instead of checking success
 * @param message - The message to send
 * @returns Promise resolving to the data
 * @throws Error if the message fails
 */
export async function sendMessageOrThrow<T>(
  message: { type: string; [key: string]: unknown }
): Promise<T> {
  const response = await sendMessageToBackground<T>(message)

  if (!response.success) {
    throw new Error(response.error || "Message failed")
  }

  if (response.data === undefined) {
    throw new Error("No data in response")
  }

  return response.data
}

/**
 * Creates a message sender for a specific message type
 * Useful for creating typed API methods
 * @param messageType - The message type constant
 * @returns A function that sends messages of this type
 */
export function createMessageSender<TRequest, TResponse>(messageType: string) {
  return async (data?: TRequest): Promise<ChromeMessageResponse<TResponse>> => {
    return sendMessageToBackground<TResponse>({
      type: messageType,
      data
    })
  }
}

/**
 * Wraps a callback-based Chrome API in a Promise
 * @param apiCall - A function that takes a callback
 * @returns Promise resolving to the result
 */
export function promisifyChrome<T>(
  apiCall: (callback: (result: T) => void) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      apiCall((result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve(result)
      })
    } catch (error) {
      reject(error)
    }
  })
}
