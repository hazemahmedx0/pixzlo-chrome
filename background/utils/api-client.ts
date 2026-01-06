/**
 * API Client utility for making HTTP requests from the background service.
 * Centralizes error handling and response parsing.
 * Follows Single Responsibility Principle - only handles HTTP communication.
 */

import { PIXZLO_WEB_URL } from "~lib/constants"

import type { ApiResponse } from "../types/messages"

export class ApiClient {
  private readonly baseUrl: string

  constructor(baseUrl: string = PIXZLO_WEB_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * Makes an authenticated GET request to the Pixzlo API
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" })
  }

  /**
   * Makes an authenticated POST request to the Pixzlo API
   */
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined
    })
  }

  /**
   * Makes an authenticated DELETE request to the Pixzlo API
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }

  /**
   * Generic request method with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers
        },
        credentials: "include"
      })

      return this.handleResponse<T>(response)
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error"
      }
    }
  }

  /**
   * Handles API response and normalizes error handling
   */
  private async handleResponse<T>(
    response: Response
  ): Promise<ApiResponse<T>> {
    // Handle 404 as a valid "not found" response
    if (response.status === 404) {
      return { success: true, data: undefined as T }
    }

    // Handle authentication errors
    if (response.status === 401) {
      return {
        success: false,
        error: "Please log in to Pixzlo to use this feature."
      }
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await this.parseErrorResponse(response)
      return {
        success: false,
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    // Parse successful response
    try {
      const data = await response.json()

      // Handle wrapped responses (common pattern in our API)
      if (data && typeof data === "object" && "success" in data) {
        if (!data.success) {
          return { success: false, error: data.error || "Request failed" }
        }
        return { success: true, data: data.data ?? data }
      }

      return { success: true, data }
    } catch {
      return { success: true, data: undefined as T }
    }
  }

  /**
   * Parses error response body safely
   */
  private async parseErrorResponse(
    response: Response
  ): Promise<{ error?: string }> {
    try {
      return await response.json()
    } catch {
      return { error: `HTTP ${response.status}` }
    }
  }
}

// Singleton instance for general use
export const apiClient = new ApiClient()

/**
 * Makes a direct Figma API call with authentication
 */
export async function fetchFigmaApi<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `https://api.figma.com/v1${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        ...options.headers
      }
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Figma API error: ${response.status}`
      }
    }

    const data = await response.json()

    if (data.err) {
      return { success: false, error: `Figma API error: ${data.err}` }
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Figma API error"
    }
  }
}
