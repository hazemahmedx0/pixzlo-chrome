/**
 * Utility functions for Figma-related operations
 */

// Helper function to create a 16:9 aspect ratio image with padding and gray background
export async function createPaddedAspectRatioImage({
  imageUrl,
  padding = 40,
  frameBoundingBox,
  elementBoundingBox
}: {
  imageUrl: string
  padding?: number
  frameBoundingBox: DOMRect
  elementBoundingBox: DOMRect
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        return reject(new Error("Failed to get canvas context"))
      }

      console.log("🎨 CROP DEBUG: Input data:", {
        imageSize: { width: img.width, height: img.height },
        frameBoundingBox,
        elementBoundingBox,
        padding
      })

      // Calculate scale factor between Figma coordinates and rendered image
      const scaleX = img.width / frameBoundingBox.width
      const scaleY = img.height / frameBoundingBox.height

      console.log("🎨 CROP DEBUG: Scale factors:", { scaleX, scaleY })

      // Calculate the crop area in image pixel coordinates
      const elementRelativeX = elementBoundingBox.x - frameBoundingBox.x
      const elementRelativeY = elementBoundingBox.y - frameBoundingBox.y

      const sourceX = Math.max(0, (elementRelativeX - padding) * scaleX)
      const sourceY = Math.max(0, (elementRelativeY - padding) * scaleY)
      const sourceWidth = Math.min(
        img.width - sourceX,
        (elementBoundingBox.width + padding * 2) * scaleX
      )
      const sourceHeight = Math.min(
        img.height - sourceY,
        (elementBoundingBox.height + padding * 2) * scaleY
      )

      console.log("🎨 CROP DEBUG: Source crop area (image pixels):", {
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight
      })

      // Define 16:9 aspect ratio dimensions
      const aspectRatio = 16 / 9
      const maxWidth = 1200
      const maxHeight = Math.round(maxWidth / aspectRatio)

      // Set canvas to 16:9 aspect ratio
      canvas.width = maxWidth
      canvas.height = maxHeight

      // Fill with gray background
      ctx.fillStyle = "#f3f4f6" // gray-100
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Calculate how to fit the cropped area into the 16:9 canvas
      const cropAspectRatio = sourceWidth / sourceHeight
      const canvasAspectRatio = canvas.width / canvas.height

      let drawWidth, drawHeight
      if (cropAspectRatio > canvasAspectRatio) {
        // Crop is wider, fit to width
        drawWidth = canvas.width
        drawHeight = canvas.width / cropAspectRatio
      } else {
        // Crop is taller, fit to height
        drawHeight = canvas.height
        drawWidth = canvas.height * cropAspectRatio
      }

      // Center the cropped image on the canvas
      const drawX = (canvas.width - drawWidth) / 2
      const drawY = (canvas.height - drawHeight) / 2

      console.log("🎨 CROP DEBUG: Final draw area:", {
        drawX,
        drawY,
        drawWidth,
        drawHeight
      })

      // Draw the cropped and scaled image onto the 16:9 canvas
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        drawX,
        drawY,
        drawWidth,
        drawHeight
      )

      console.log("🎨 CROP DEBUG: Image cropping completed successfully")

      // Convert to data URL
      resolve(canvas.toDataURL("image/png"))
    }

    img.onerror = () => {
      console.error("Failed to load image for processing:", imageUrl)
      // Fallback to the original URL if processing fails
      resolve(imageUrl)
    }

    img.src = imageUrl
  })
}

/**
 * Crop directly from source image (e.g. Figma frame image) using relative coordinates
 * This avoids viewport/scroll issues by working with the actual image data
 * 
 * Uses fetch to bypass CORS restrictions for cross-origin images
 * 
 * @param sourceImageUrl - The source image URL (e.g. Figma frame image)
 * @param cropArea - Crop area in relative coordinates to the displayed image
 * @param displayedWidth - Width of the displayed image in the DOM
 * @param displayedHeight - Height of the displayed image in the DOM
 * @returns Promise<string> - Cropped image as data URL
 */
async function fetchImageDataUrl(sourceImageUrl: string): Promise<string> {
  // Prefer background script fetch to bypass CORS (requires host permissions)
  if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
    try {
      console.log("🔄 Requesting background fetch for image...")
      const response = await new Promise<{
        success?: boolean
        dataUrl?: string
        error?: string
      }>((resolve, reject) => {
        try {
          chrome.runtime.sendMessage(
            {
              type: "FETCH_IMAGE_DATA_URL",
              url: sourceImageUrl
            },
            (resp) => {
              const lastError = chrome.runtime.lastError
              if (lastError) {
                reject(new Error(lastError.message))
                return
              }
              resolve(resp)
            }
          )
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      })

      if (response?.success && response.dataUrl) {
        console.log("✅ Background fetch succeeded")
        return response.dataUrl as string
      }

      console.warn(
        "⚠️ Background fetch failed, falling back to direct fetch:",
        response?.error
      )
    } catch (error) {
      console.warn("⚠️ Background fetch threw error, falling back:", error)
    }
  }

  // Fallback: direct fetch (may still fail due to CORS)
  console.log("🔍 Falling back to direct fetch...")
  const fallbackResponse = await fetch(sourceImageUrl, { mode: "cors" })
  if (!fallbackResponse.ok) {
    throw new Error(
      `Failed to fetch image: ${fallbackResponse.status} ${fallbackResponse.statusText}`
    )
  }
  const blob = await fallbackResponse.blob()

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Failed to read blob as data URL"))
      }
    }
    reader.onerror = () => {
      reject(new Error("Failed to read image blob"))
    }
    reader.readAsDataURL(blob)
  })
}

export async function cropImageFromSource(
  sourceImageUrl: string,
  cropArea: { x: number; y: number; width: number; height: number },
  displayedWidth: number,
  displayedHeight: number
): Promise<string> {
  try {
    const imageDataUrl = await fetchImageDataUrl(sourceImageUrl)

    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }

        // Calculate scale factor between displayed size and actual image size
        const scaleX = img.width / displayedWidth
        const scaleY = img.height / displayedHeight

        console.log("🔍 cropImageFromSource: Scale factors:", {
          imageSize: { width: img.width, height: img.height },
          displayedSize: { width: displayedWidth, height: displayedHeight },
          scale: { x: scaleX, y: scaleY }
        })

        // Convert crop area from displayed coordinates to actual image coordinates
        const sourceX = cropArea.x * scaleX
        const sourceY = cropArea.y * scaleY
        const sourceWidth = cropArea.width * scaleX
        const sourceHeight = cropArea.height * scaleY

        console.log("🔍 cropImageFromSource: Crop area:", {
          displayed: cropArea,
          actual: {
            x: sourceX,
            y: sourceY,
            width: sourceWidth,
            height: sourceHeight
          }
        })

        // Set canvas to the crop size
        canvas.width = sourceWidth
        canvas.height = sourceHeight

        // Draw the cropped portion
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          sourceWidth,
          sourceHeight
        )

        const croppedDataUrl = canvas.toDataURL("image/png")
        console.log("✅ cropImageFromSource: Crop complete")
        resolve(croppedDataUrl)
      }

      img.onerror = () => {
        console.error("❌ Failed to load image for cropping")
        reject(new Error("Failed to load source image"))
      }

      img.src = imageDataUrl
    })
  } catch (error) {
    console.error("❌ Error fetching image:", error)
    throw new Error(
      `Failed to fetch image: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

// Helper function to crop screenshot (based on @reviewit approach) - runs in content script with DOM access
export function processScreenshotCrop(
  dataUrl: string,
  area: any
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve(dataUrl) // Fallback
        return
      }

      const devicePixelRatio = window.devicePixelRatio || 1

      canvas.width = area.width
      canvas.height = area.height

      const sourceX = area.x * devicePixelRatio
      const sourceY = area.y * devicePixelRatio
      const sourceWidth = area.width * devicePixelRatio
      const sourceHeight = area.height * devicePixelRatio

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        area.width,
        area.height
      )

      const croppedDataUrl = canvas.toDataURL("image/png")
      resolve(croppedDataUrl)
    }
    img.onerror = () => resolve(dataUrl) // Fallback
    img.src = dataUrl
  })
}

// Helper function to convert any image to 16:9 aspect ratio with gray background (like @reviewit approach)
export async function convertTo16x9WithPadding(
  imageUrl: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        return reject(new Error("Failed to get canvas context"))
      }

      // Set 16:9 aspect ratio
      const aspectRatio = 16 / 9
      const maxWidth = 1200
      const maxHeight = Math.round(maxWidth / aspectRatio)

      canvas.width = maxWidth
      canvas.height = maxHeight

      // Fill with gray background
      ctx.fillStyle = "#f3f4f6"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Calculate how to fit the image while maintaining its aspect ratio
      const imgAspectRatio = img.width / img.height
      let drawWidth, drawHeight

      if (imgAspectRatio > aspectRatio) {
        // Image is wider than 16:9, fit to width
        drawWidth = canvas.width
        drawHeight = canvas.width / imgAspectRatio
      } else {
        // Image is taller than 16:9, fit to height
        drawHeight = canvas.height
        drawWidth = canvas.height * imgAspectRatio
      }

      // Center the image
      const drawX = (canvas.width - drawWidth) / 2
      const drawY = (canvas.height - drawHeight) / 2

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
      resolve(canvas.toDataURL("image/png"))
    }

    img.onerror = () => {
      console.error("Failed to load image for 16:9 conversion:", imageUrl)
      resolve(imageUrl) // Fallback to original
    }

    img.src = imageUrl
  })
}

// Helper function to extract properties from Figma element
export function extractFigmaProperties(element: any): Record<string, any> {
  const properties: Record<string, any> = {}

  // Extract dimensions
  if (element.absoluteBoundingBox) {
    properties.width = Math.round(element.absoluteBoundingBox.width)
    properties.height = Math.round(element.absoluteBoundingBox.height)
  }

  // Extract text properties
  if (element.style) {
    if (element.style.fontFamily)
      properties.fontFamily = element.style.fontFamily
    if (element.style.fontSize)
      properties.fontSize = Math.round(element.style.fontSize)
    if (element.style.fontWeight)
      properties.fontWeight = element.style.fontWeight
  }

  // Extract colors
  if (element.fills && element.fills.length > 0) {
    const fill = element.fills[0]
    if (fill.type === "SOLID" && fill.color) {
      const { r, g, b } = fill.color
      const alpha = fill.opacity !== undefined ? fill.opacity : 1
      properties.backgroundColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`
    }
  }

  // Extract text color
  if (element.fills && element.type === "TEXT" && element.fills.length > 0) {
    const fill = element.fills[0]
    if (fill.type === "SOLID" && fill.color) {
      const { r, g, b } = fill.color
      const alpha = fill.opacity !== undefined ? fill.opacity : 1
      properties.color = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`
    }
  }

  // Extract border radius
  if (element.cornerRadius !== undefined) {
    properties.borderRadius = Math.round(element.cornerRadius)
  }

  // Extract effects (for shadows, etc.)
  if (element.effects && element.effects.length > 0) {
    element.effects.forEach((effect: any) => {
      if (effect.type === "DROP_SHADOW") {
        properties.boxShadow = `${effect.offset?.x || 0}px ${effect.offset?.y || 0}px ${effect.radius || 0}px rgba(0,0,0,${effect.color?.a || 0.25})`
      }
    })
  }

  return properties
}

export interface FigmaProperties {
  width?: number
  height?: number
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  color?: string
  backgroundColor?: string
  borderRadius?: number
  padding?: number
  margin?: number
  [key: string]: any
}

export interface FigmaContextData {
  figmaUrl: string
  fileId: string
  frameId: string
  frameData?: any
  selectedElementProperties?: FigmaProperties | Record<string, any>
  frameImageUrl?: string // Cache the frame image URL
  frameElements?: any[] // Cache the frame elements
  selectedElementId?: string // Store the selected element ID
}
