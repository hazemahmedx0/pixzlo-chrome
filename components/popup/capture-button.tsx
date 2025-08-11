import { Button } from "@/components/ui/button"
import type { CaptureType } from "@/types/capture"
import { Bug, Camera, Monitor } from "phosphor-react"
import { useCallback, useState } from "react"
import type { ReactNode } from "react"

interface CaptureButtonProps {
  mode: CaptureType
  className?: string
  children?: ReactNode
  icon?: boolean
}

const modeConfig = {
  element: {
    icon: Bug,
    label: "Select Element",
    description: "Click on any element to capture it"
  },
  area: {
    icon: Camera,
    label: "Capture Area",
    description: "Select a specific area to capture"
  },
  fullscreen: {
    icon: Monitor,
    label: "Full Screen",
    description: "Capture the entire visible page"
  }
}

export const CaptureButton = ({
  mode,
  className,
  children,
  icon = true
}: CaptureButtonProps): JSX.Element => {
  const [isSending, setIsSending] = useState(false)
  const config = modeConfig[mode]
  const Icon = config.icon

  const handleCapture = useCallback((): void => {
    if (isSending) return
    setIsSending(true)

    const pingContentScript = (tabId: number): Promise<boolean> => {
      return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: "ping" }, (response) => {
          if (chrome.runtime.lastError || !response?.pong) {
            console.log(
              "❌ Content script not ready:",
              chrome.runtime.lastError?.message
            )
            resolve(false)
          } else {
            console.log("✅ Content script is ready")
            resolve(true)
          }
        })
      })
    }

    const sendMessageWithRetry = async (
      tabId: number,
      retryCount = 0
    ): Promise<void> => {
      console.log(`🚀 Attempt ${retryCount + 1}: Checking content script...`)

      // First, ping to check if content script is ready
      const isReady = await pingContentScript(tabId)

      if (!isReady) {
        // Content script not ready, retry up to 5 times
        if (retryCount < 5) {
          setTimeout(
            () => {
              sendMessageWithRetry(tabId, retryCount + 1)
            },
            200 * (retryCount + 1)
          ) // 200ms, 400ms, 600ms, 800ms, 1000ms delays
          return
        }

        console.error("💥 Content script never became ready")
        setIsSending(false)
        return
      }

      // Content script is ready, send the actual message
      chrome.tabs.sendMessage(
        tabId,
        { type: "start-element-selection", mode },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn("❌ Message failed:", chrome.runtime.lastError.message)
            setIsSending(false)
            return
          }

          // Success!
          console.log("✅ Message sent successfully:", response)
          setIsSending(false)
          window.close()
        }
      )
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId === undefined) {
        console.error("❌ No active tab found")
        setIsSending(false)
        return
      }

      sendMessageWithRetry(tabId)
    })
  }, [mode, isSending])

  return (
    <Button
      onClick={handleCapture}
      disabled={isSending}
      className={className}
      variant="outline"
      title={config.description}>
      {icon && <Icon size={16} className="mr-2" />}
      {isSending ? "Starting…" : children ?? config.label}
    </Button>
  )
}
