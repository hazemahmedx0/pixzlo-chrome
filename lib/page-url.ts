import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"

/**
 * Get the current page URL, accounting for the tab-page context where
 * `window.location.href` points to the extension page rather than the
 * original capture source.
 *
 * Falls back to `window.location.href` when the store is not initialised
 * or no `sourcePageUrl` has been set.
 */
export function getPageUrl(): string {
  try {
    const dialogState = usePixzloDialogStore.getState()
    return dialogState.sourcePageUrl || window.location.href
  } catch {
    // Store might not be initialised in some contexts (e.g. background script)
    return window.location.href
  }
}
