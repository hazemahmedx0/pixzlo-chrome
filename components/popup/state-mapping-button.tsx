/**
 * State Mapping Button
 *
 * Button component in the popup that initiates the state mapping flow.
 * When clicked, it sends a message to the content script to start
 * the element selection mode for state mapping.
 */

import { Crosshair } from '@phosphor-icons/react'
import { useCallback, useState } from 'react'

interface StateMappingButtonProps {
  className?: string
}

export const StateMappingButton = ({
  className,
}: StateMappingButtonProps): JSX.Element => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if URL is restricted (Chrome doesn't allow extensions on these pages)
  const isRestrictedUrl = (url: string | undefined): boolean => {
    if (!url) return true
    const restrictedPatterns = [
      /^chrome:\/\//,
      /^chrome-extension:\/\//,
      /^edge:\/\//,
      /^about:/,
      /^chrome\.google\.com\/webstore/,
      /^microsoftedge\.microsoft\.com\/addons/,
      /^view-source:/,
      /^devtools:\/\//,
    ]
    return restrictedPatterns.some((pattern) => pattern.test(url))
  }

  const handleClick = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })

      if (!tab?.id) {
        setError('No active tab found')
        setIsLoading(false)
        return
      }

      // Check if the page is restricted
      if (isRestrictedUrl(tab.url)) {
        setError('Cannot run on browser pages. Try a regular website.')
        setIsLoading(false)
        return
      }

      // First, ensure content script is loaded
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'ping' })
      } catch {
        // Content script might not be loaded, try to inject it
        console.log('Content script not loaded, attempting to inject...')
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          })
          // Wait a bit for the script to initialize
          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (injectError) {
          console.error('Failed to inject content script:', injectError)
          setError('Cannot run on this page. Try refreshing.')
          setIsLoading(false)
          return
        }
      }

      // Send message to start state mapping selection
      chrome.tabs.sendMessage(
        tab.id,
        { type: 'start-state-mapping-selection', mode: 'state-mapping' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              'Failed to start state mapping:',
              chrome.runtime.lastError,
            )
            setError('Failed to start. Try refreshing the page.')
            setIsLoading(false)
            return
          }

          console.log('State mapping selection started:', response)

          // Close the popup after successfully starting
          window.close()
        },
      )
    } catch (err) {
      console.error('Error starting state mapping:', err)
      setError('Failed to start state mapping')
      setIsLoading(false)
    }
  }, [])

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
        {isLoading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-sky-500" />
            <span>Starting...</span>
          </>
        ) : (
          <>
            <Crosshair size={16} weight="bold" />
            <span>Map Page States</span>
          </>
        )}
      </button>

      {error && (
        <p className="mt-1.5 text-center text-xs text-red-500">{error}</p>
      )}

      <p className="mt-1.5 text-center text-xs text-neutral-400">
        Auto-select Figma frames based on page state
      </p>
    </div>
  )
}
