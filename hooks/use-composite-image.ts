import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"
import { useCallback, useEffect, useRef, useState } from "react"

export interface CompositeImageOptions {
  originalImageUrl: string
  aspectRatio?: [number, number]
  minWidth?: number
  minHeight?: number
  backgroundColor?: string
  paddingPercent?: number
  enabled?: boolean
}

export interface CompositeImageResult {
  compositeImageUrl: string | null
  isLoading: boolean
  error: string | null
  regenerate: () => void
}

export const useCompositeImage = (
  options: CompositeImageOptions
): CompositeImageResult => {
  const {
    originalImageUrl,
    aspectRatio = [16, 9],
    minWidth = 300,
    minHeight = 168,
    backgroundColor = "#e5e7eb", // gray-200
    paddingPercent = 0.1, // 10% padding
    enabled = true
  } = options

  const setCompositeImageUrlForStore = usePixzloDialogStore(
    (state) => state.setCompositeImageUrl
  )

  const [compositeImageUrl, setCompositeImageUrl] = useState<string | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastProcessedImageRef = useRef<string>("")

  const createCompositeImage = useCallback(async (): Promise<void> => {
    if (!originalImageUrl || !enabled) return

    // Skip if already processing the same image or if it's already processed
    if (isLoading || lastProcessedImageRef.current === originalImageUrl) return

    setIsLoading(true)
    setError(null)

    try {
      // Load the original image
      const img = await loadImage(originalImageUrl)

      // Create canvas for composite
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        throw new Error("Failed to get canvas context")
      }

      // Calculate canvas dimensions maintaining aspect ratio
      const aspectRatioValue = aspectRatio[0] / aspectRatio[1]
      const naturalAspectRatio = img.naturalWidth / img.naturalHeight

      let canvasWidth = Math.max(minWidth, img.naturalWidth)
      let canvasHeight = Math.max(minHeight, img.naturalHeight)

      // Ensure canvas maintains specified aspect ratio
      if (canvasWidth / canvasHeight !== aspectRatioValue) {
        if (canvasWidth / aspectRatioValue > canvasHeight) {
          canvasHeight = canvasWidth / aspectRatioValue
        } else {
          canvasWidth = canvasHeight * aspectRatioValue
        }
      }

      canvas.width = canvasWidth
      canvas.height = canvasHeight

      // Draw gray background
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      // Calculate image position with padding
      const padding = Math.min(canvasWidth, canvasHeight) * paddingPercent
      const imageAreaWidth = canvasWidth - padding * 2
      const imageAreaHeight = canvasHeight - padding * 2

      // Calculate image size to fit in the available area while maintaining aspect ratio
      let imageWidth = imageAreaWidth
      let imageHeight = imageAreaHeight

      if (naturalAspectRatio > imageAreaWidth / imageAreaHeight) {
        // Image is wider, fit to width
        imageHeight = imageWidth / naturalAspectRatio
      } else {
        // Image is taller, fit to height
        imageWidth = imageHeight * naturalAspectRatio
      }

      // Center the image in the available area
      const imageX = padding + (imageAreaWidth - imageWidth) / 2
      const imageY = padding + (imageAreaHeight - imageHeight) / 2

      // Draw the image
      ctx.drawImage(img, imageX, imageY, imageWidth, imageHeight)

      // Convert to data URL
      const dataUrl = canvas.toDataURL("image/png")
      setCompositeImageUrl(dataUrl)
      lastProcessedImageRef.current = originalImageUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      setCompositeImageUrl(null)
    } finally {
      setIsLoading(false)
    }
  }, [
    originalImageUrl,
    aspectRatio,
    minWidth,
    minHeight,
    backgroundColor,
    paddingPercent,
    enabled
  ])

  const regenerate = useCallback((): void => {
    lastProcessedImageRef.current = "" // Force regeneration
    createCompositeImage()
  }, [createCompositeImage])

  // Create composite image when options change
  useEffect(() => {
    createCompositeImage()
  }, [createCompositeImage])

  // Update store and compositeImageUrl when it's generated
  useEffect(() => {
    if (compositeImageUrl) {
      setCompositeImageUrlForStore(originalImageUrl, compositeImageUrl)
    }
  }, [compositeImageUrl, originalImageUrl, setCompositeImageUrlForStore])

  // Cleanup previous URL when creating new one
  useEffect(() => {
    return () => {
      if (compositeImageUrl && compositeImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(compositeImageUrl)
      }
    }
  }, [compositeImageUrl])

  return {
    compositeImageUrl,
    isLoading,
    error,
    regenerate
  }
}

// Helper function to load image
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
