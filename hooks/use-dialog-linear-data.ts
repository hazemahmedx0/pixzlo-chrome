import { useFigmaDataStore } from "@/stores/figma-data"
import { useLinearDataStore } from "@/stores/linear-data"
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import { useEffect, useRef } from "react"

export function useDialogIntegrationData(): void {
  const { fetchAllData: fetchLinearData, checkStatus } = useLinearDataStore()
  const { fetchMetadata } = useFigmaDataStore()
  const { isOpen } = usePixzloDialogStore()

  // Use ref to track if data has been fetched for this dialog session
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (isOpen && !hasFetchedRef.current) {
      hasFetchedRef.current = true

      // Always check status when dialog opens (ignore cache for freshness)
      void checkStatus()
      void fetchLinearData()
      // Fetch Figma metadata once per dialog open; avoid repeated calls on focus/visibility
      void fetchMetadata()
    }

    // Reset flag when dialog closes
    if (!isOpen) {
      hasFetchedRef.current = false
    }
  }, [isOpen, fetchLinearData, fetchMetadata, checkStatus])
}
