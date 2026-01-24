/**
 * Message Handler Registry
 *
 * This module implements the Open/Closed Principle (OCP) by providing a
 * centralized message handler registry. New message handlers can be added
 * without modifying the existing code.
 *
 * Features:
 * - Typed message handlers
 * - Handler registration and lookup
 * - Error handling wrapper
 * - Async response support
 */

import type { BackgroundMessage, MessageResponse } from "@/types/background"

// ============================================================================
// Types
// ============================================================================

/**
 * Message handler function type
 */
export type MessageHandlerFn<T = unknown> = (
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender
) => Promise<MessageResponse<T>>

/**
 * Handler registration entry
 */
interface HandlerEntry {
  handler: MessageHandlerFn
  description?: string
}

// ============================================================================
// Message Handler Registry Class
// ============================================================================

/**
 * MessageHandlerRegistry provides a centralized way to register and dispatch
 * message handlers. It follows the Open/Closed Principle - you can add new
 * handlers without modifying existing code.
 */
class MessageHandlerRegistry {
  private static instance: MessageHandlerRegistry
  private handlers: Map<string, HandlerEntry> = new Map()

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of MessageHandlerRegistry
   */
  public static getInstance(): MessageHandlerRegistry {
    if (!MessageHandlerRegistry.instance) {
      MessageHandlerRegistry.instance = new MessageHandlerRegistry()
    }
    return MessageHandlerRegistry.instance
  }

  /**
   * Register a message handler
   * 
   * @param type - The message type to handle
   * @param handler - The handler function
   * @param description - Optional description for debugging
   */
  public register<T = unknown>(
    type: string,
    handler: MessageHandlerFn<T>,
    description?: string
  ): void {
    if (this.handlers.has(type)) {
      console.warn(
        `[MessageHandler] Overwriting existing handler for type: ${type}`
      )
    }
    this.handlers.set(type, {
      handler: handler as MessageHandlerFn,
      description
    })
  }

  /**
   * Unregister a message handler
   * 
   * @param type - The message type to unregister
   */
  public unregister(type: string): boolean {
    return this.handlers.delete(type)
  }

  /**
   * Check if a handler is registered for a type
   * 
   * @param type - The message type to check
   */
  public hasHandler(type: string): boolean {
    return this.handlers.has(type)
  }

  /**
   * Get the handler for a message type
   * 
   * @param type - The message type
   */
  public getHandler(type: string): MessageHandlerFn | undefined {
    return this.handlers.get(type)?.handler
  }

  /**
   * Handle a message by dispatching to the registered handler
   * 
   * @param message - The message to handle
   * @param sender - The message sender
   * @returns Promise with the response, or undefined if no handler found
   */
  public async handle(
    message: BackgroundMessage,
    sender: chrome.runtime.MessageSender
  ): Promise<MessageResponse | undefined> {
    const entry = this.handlers.get(message.type)
    if (!entry) {
      return undefined
    }

    try {
      return await entry.handler(message, sender)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }

  /**
   * Create a Chrome runtime message listener that uses this registry
   * 
   * @returns A listener function for chrome.runtime.onMessage
   */
  public createListener(): (
    message: BackgroundMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ) => boolean {
    return (message, sender, sendResponse) => {
      const entry = this.handlers.get(message.type)
      if (!entry) {
        // No handler found - don't prevent other listeners
        return false
      }

      // Execute handler and send response
      entry
        .handler(message, sender)
        .then((response) => {
          try {
            sendResponse(response)
          } catch {
            // Error sending response - channel may be closed
          }
        })
        .catch((error) => {
          try {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error"
            })
          } catch {
            // Error sending error response - channel may be closed
          }
        })

      // Return true to indicate async response
      return true
    }
  }

  /**
   * Get all registered handler types
   */
  public getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * Clear all handlers (useful for testing)
   */
  public clear(): void {
    this.handlers.clear()
  }
}

// ============================================================================
// Exported Singleton Instance
// ============================================================================

export const messageHandlerRegistry = MessageHandlerRegistry.getInstance()

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wrap a handler function with error handling
 */
export function wrapHandler<T>(
  handler: (
    message: BackgroundMessage,
    sender: chrome.runtime.MessageSender
  ) => Promise<T>
): MessageHandlerFn<T> {
  return async (message, sender) => {
    try {
      const data = await handler(message, sender)
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }
}

/**
 * Create a simple handler that just returns a result
 */
export function createSimpleHandler<T>(
  fn: (message: BackgroundMessage) => Promise<{ success: boolean; data?: T; error?: string }>
): MessageHandlerFn<T> {
  return async (message) => {
    const result = await fn(message)
    return result
  }
}
