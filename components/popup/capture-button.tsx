import { Button } from "@/components/ui/button"
import type { CaptureType } from "@/types/capture"
import { BugIcon, CameraIcon, MonitorIcon } from "@phosphor-icons/react"
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
    icon: BugIcon,
    label: "Select Element",
    description: "Click on any element to capture it"
  },
  area: {
    icon: CameraIcon,
    label: "Capture Area",
    description: "Select a specific area to capture"
  },
  fullscreen: {
    icon: MonitorIcon,
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

  const pingContentScript = (tabId: number): Promise<boolean> => {
    return new Promise((resolve) => {
      // Set a timeout for the message
      const timeoutId = setTimeout(() => {
        resolve(false)
      }, 1000) // 1 second timeout

      chrome.tabs.sendMessage(tabId, { type: "ping" }, (response) => {
        clearTimeout(timeoutId)

        if (chrome.runtime.lastError) {
          resolve(false)
        } else if (!response?.pong) {
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  const sendMessageWithRetry = async (
    tabId: number,
    retryCount = 0
  ): Promise<void> => {
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

      // Get current tab info for debugging
      chrome.tabs.query(
        { active: true, currentWindow: true },
        ([currentTab]) => {
          alert(
            "Extension cannot communicate with this page.\n\n" +
              "Troubleshooting steps:\n" +
              "1. Refresh this page and wait 2-3 seconds\n" +
              "2. Try a regular website (google.com, github.com)\n" +
              "3. Check extension permissions in chrome://extensions/\n" +
              "4. Make sure content scripts are enabled\n\n" +
              "Current page: " +
              (currentTab?.url || "unknown")
          )
        }
      )
      setIsSending(false)
      return
    }

    // Content script is ready, send the actual message
    chrome.tabs.sendMessage(
      tabId,
      { type: "start-element-selection", mode },
      (response) => {
        if (chrome.runtime.lastError) {
          setIsSending(false)
          return
        }

        // Success!
        setIsSending(false)
        window.close()
      }
    )
  }

  const handleCapture = useCallback(async (): Promise<void> => {
    // Check if chrome APIs are available
    if (!chrome || !chrome.tabs) {
      setIsSending(false)
      return
    }

    if (isSending) {
      return
    }

    // Get the active tab first
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })

      if (!tab?.id) {
        setIsSending(false)
        return
      }

      // Check if this is a restricted page
      const restrictedPages = [
        "chrome://",
        "chrome-extension://",
        "moz-extension://",
        "about:",
        "edge://",
        "opera://"
      ]

      const isRestrictedPage = restrictedPages.some((prefix) =>
        tab.url?.startsWith(prefix)
      )

      if (isRestrictedPage) {
        alert(
          "Cannot capture on this page type.\n\n" +
            "Browser restrictions prevent extensions from working on:\n" +
            "• Settings pages (chrome://)\n" +
            "• Extension pages\n" +
            "• About pages\n\n" +
            "Please try on a regular website instead."
        )
        setIsSending(false)
        return
      }

      setIsSending(true)

      // Continue with the rest of the process
      await sendMessageWithRetry(tab.id)
    } catch {
      setIsSending(false)
      return
    }
  }, [mode, isSending])

  return (
    <Button
      onClick={handleCapture}
      disabled={isSending}
      className={className}
      variant={mode === "element" ? "sky" : "outline"}
      size={"lg"}
      title={config.description}>
      {icon && <Icon size={16} className="mr-2" />}
      {isSending ? "Starting…" : children ?? config.label}
    </Button>
  )
}
