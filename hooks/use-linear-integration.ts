import { useLinearDataStore } from "@/stores/linear-data"
import type { IntegrationStatusResponse } from "@/types/integration"
import { useCallback, useEffect } from "react"

export function useLinearIntegration(): {
  isConnected: boolean
  isLoading: boolean
  error?: string
  integration?: IntegrationStatusResponse["integration"]
  checkStatus: () => Promise<void>
  retryConnection: () => Promise<void>
} {
  const {
    isConnected,
    isLoadingStatus,
    statusError,
    checkStatus,
    setStatusDebugHelpers
  } = useLinearDataStore()

  const retryConnection = useCallback(async (): Promise<void> => {
    await checkStatus()
  }, [checkStatus])

  useEffect(() => {
    if (typeof window !== "undefined") {
      setStatusDebugHelpers({ checkStatus, retryConnection })
    }
  }, [checkStatus, retryConnection, setStatusDebugHelpers])

  useEffect(() => {
    void checkStatus()
  }, [checkStatus])

  return {
    isConnected,
    isLoading: isLoadingStatus,
    error: statusError,
    integration: undefined,
    checkStatus,
    retryConnection
  }
}

export interface LinearIssueOptions {
  teamId?: string
  projectId?: string
  assigneeId?: string
  stateId?: string
}

export async function createLinearIssue(issueData: {
  title: string
  description: string
  priority?: number
  options?: LinearIssueOptions
}): Promise<{ success: boolean; issueUrl?: string; error?: string }> {
  try {
    console.log("📡 Creating Linear issue via background script...")

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
        {
          type: "linear-create-issue",
          data: {
            ...issueData,
            linearOptions: issueData.options
          }
        },
        (backgroundResponse) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error:
                chrome.runtime.lastError.message ||
                "Extension communication error"
            })
          } else {
            resolve(backgroundResponse)
          }
        }
      )
    })

    if (!response.success) {
      console.error("❌ Linear issue creation failed:", response.error)
      return { success: false, error: response.error }
    }

    const issueUrl = response.data?.issue?.url
    return {
      success: true,
      issueUrl
    }
  } catch (error) {
    console.error("❌ Error creating Linear issue:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}
