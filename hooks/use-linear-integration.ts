import type { IntegrationStatusResponse } from "@/types/integration"
import { useCallback, useEffect, useState } from "react"

interface LinearIntegrationState {
  isConnected: boolean
  isLoading: boolean
  error?: string
  integration?: IntegrationStatusResponse["integration"]
}

export function useLinearIntegration(): LinearIntegrationState & {
  checkStatus: () => Promise<void>
  retryConnection: () => Promise<void>
} {
  const [state, setState] = useState<LinearIntegrationState>({
    isConnected: false,
    isLoading: true,
    error: undefined,
    integration: undefined
  })

  const checkStatus = useCallback(async (): Promise<void> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: undefined }))

      console.log("📡 Checking Linear status via background script...")

      // Send message to background script to check Linear integration status
      const response = await new Promise<{
        success: boolean
        data?: IntegrationStatusResponse
        error?: string
      }>((resolve) => {
        chrome.runtime.sendMessage(
          { type: "linear-check-status" },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error:
                  chrome.runtime.lastError.message ||
                  "Extension communication error"
              })
            } else {
              resolve(response)
            }
          }
        )
      })

      if (!response.success) {
        if (response.error?.includes("log in")) {
          setState({
            isConnected: false,
            isLoading: false,
            error: response.error,
            integration: undefined
          })
        } else {
          setState({
            isConnected: false,
            isLoading: false,
            error: undefined, // Hide technical errors from users
            integration: undefined
          })
        }
        return
      }

      const data = response.data!
      console.log("🔗 Linear integration status:", data) // Debug logging

      setState({
        isConnected: data.connected,
        isLoading: false,
        error: undefined,
        integration: data.integration
      })
    } catch (error) {
      console.error("❌ Error checking Linear integration status:", error)

      setState({
        isConnected: false,
        isLoading: false,
        error: undefined, // Hide errors from users
        integration: undefined
      })
    }
  }, [])

  // Retry connection function for manual refresh
  const retryConnection = useCallback(async (): Promise<void> => {
    console.log("🔄 Manually retrying Linear connection check...")
    await checkStatus()
  }, [checkStatus])

  useEffect(() => {
    // Only run status check once on mount
    void checkStatus()
  }, [checkStatus])

  // Set up debug functions once, separate from status checking
  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).__pixzlo_debug_linear = {
        checkStatus,
        retryConnection,
        getCurrentState: () => state, // Function to get current state instead of direct reference
        testBackgroundScript: async () => {
          console.log("🧪 Testing Linear integration via background script...")

          try {
            const response = await new Promise<any>((resolve) => {
              chrome.runtime.sendMessage(
                { type: "linear-check-status" },
                (response) => {
                  if (chrome.runtime.lastError) {
                    resolve({
                      success: false,
                      error: chrome.runtime.lastError.message
                    })
                  } else {
                    resolve(response)
                  }
                }
              )
            })
            console.log("📡 Background script response:", response)
            return response
          } catch (error) {
            console.error("📡 Background script test failed:", error)
            return null
          }
        }
      }
      console.log("🛠️ Debug tools available: window.__pixzlo_debug_linear")
      console.log(
        "🛠️ Test background script: window.__pixzlo_debug_linear.testBackgroundScript()"
      )
      console.log(
        "🛠️ Get current state: window.__pixzlo_debug_linear.getCurrentState()"
      )
    }
  }, [checkStatus, retryConnection]) // Only depend on stable functions, not state

  return {
    ...state,
    checkStatus,
    retryConnection
  }
}

export async function createLinearIssue(issueData: {
  title: string
  description: string
  priority?: number
}): Promise<{ success: boolean; issueUrl?: string; error?: string }> {
  try {
    console.log("📡 Creating Linear issue via background script...")

    // Send message to background script to create Linear issue
    const response = await new Promise<{
      success: boolean
      data?: {
        success: boolean
        issue?: { url: string; identifier: string }
        error?: string
      }
      error?: string
    }>((resolve) => {
      chrome.runtime.sendMessage(
        { type: "linear-create-issue", data: issueData },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error:
                chrome.runtime.lastError.message ||
                "Extension communication error"
            })
          } else {
            resolve(response)
          }
        }
      )
    })

    if (!response.success) {
      return {
        success: false,
        error: response.error || "Failed to create Linear issue"
      }
    }

    const data = response.data!
    console.log("🎯 Linear issue created:", data) // Debug logging

    return {
      success: data.success,
      issueUrl: data.issue?.url,
      error: data.error
    }
  } catch (error) {
    console.error("❌ Error creating Linear issue:", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create Linear issue"
    }
  }
}
