import type { DrawingElement } from "@/types/drawing"

export interface ImageDownloadOptions {
  imageUrl: string
  drawings?: DrawingElement[]
  aspectRatio?: [number, number] // [width, height] like [16, 9]
  minWidth?: number
  minHeight?: number
  fileName?: string
  useComposite?: boolean // Whether the imageUrl is already a composite
  drawingOverlay?: string | null // Data URL of the drawing overlay from Konva export
}

export class ImageDownloader {
  /**
   * Downloads an image with gray background and drawings
   */
  static async downloadImage(options: ImageDownloadOptions): Promise<void> {
    const {
      imageUrl,
      drawings = [],
      aspectRatio = [16, 9],
      minWidth = 300,
      minHeight = 168,
      fileName = "pixzlo-capture.png",
      useComposite = false,
      drawingOverlay = null
    } = options

    try {
      // Create canvas
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        throw new Error("Failed to get canvas context")
      }

      // Load the image
      const img = await this.loadImage(imageUrl)

      if (useComposite) {
        // If using composite, the image already has gray background - just use it as-is
        // Use high resolution for better quality
        // No scaling for composite to prevent squishing - save at original resolution
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight

        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"

        // Draw the composite image at high resolution
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      } else {
        // Create composite from scratch (original behavior)
        const aspectRatioValue = aspectRatio[0] / aspectRatio[1]
        const naturalAspectRatio = img.naturalWidth / img.naturalHeight

        let canvasWidth = Math.max(minWidth, img.naturalWidth)
        let canvasHeight = Math.max(minHeight, img.naturalHeight)

        // Ensure canvas maintains aspect ratio
        if (canvasWidth / canvasHeight !== aspectRatioValue) {
          if (canvasWidth / aspectRatioValue > canvasHeight) {
            canvasHeight = canvasWidth / aspectRatioValue
          } else {
            canvasWidth = canvasHeight * aspectRatioValue
          }
        }

        // Apply high-resolution scaling for better quality
        const scale = Math.max(
          1,
          Math.min(2, 1200 / Math.max(canvasWidth, canvasHeight))
        )
        canvas.width = canvasWidth * scale
        canvas.height = canvasHeight * scale

        // Scale context for high-resolution rendering
        ctx.scale(scale, scale)

        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"

        // Draw gray background
        ctx.fillStyle = "#e5e7eb" // gray-200
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        // Calculate image position with padding
        const padding = Math.min(canvasWidth, canvasHeight) * 0.133
        const imageAreaWidth = canvasWidth - padding * 2
        const imageAreaHeight = canvasHeight - padding * 2

        // Calculate image size to fit while maintaining aspect ratio
        let imageWidth = imageAreaWidth
        let imageHeight = imageAreaHeight

        if (naturalAspectRatio > imageAreaWidth / imageAreaHeight) {
          imageHeight = imageWidth / naturalAspectRatio
        } else {
          imageWidth = imageHeight * naturalAspectRatio
        }

        // Center the image
        const imageX = padding + (imageAreaWidth - imageWidth) / 2
        const imageY = padding + (imageAreaHeight - imageHeight) / 2

        // Draw the image
        ctx.drawImage(img, imageX, imageY, imageWidth, imageHeight)
      }

      // Draw the drawing overlay if provided (preferred method)
      if (drawingOverlay) {
        const overlayImg = await this.loadImage(drawingOverlay)

        // When using composite, the overlay is already scaled, so draw 1:1
        ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height)
      } else if (drawings && drawings.length > 0) {
        // Fallback: manually draw annotations (legacy method)
        if (useComposite) {
          // For composite images, drawings are 1:1 with canvas coordinates
          this.drawAnnotations(
            ctx,
            drawings,
            0,
            0,
            canvas.width,
            canvas.height,
            canvas.width,
            canvas.height
          )
        } else {
          // For non-composite, map to full canvas
          this.drawAnnotations(
            ctx,
            drawings,
            0,
            0,
            canvas.width,
            canvas.height,
            canvas.width,
            canvas.height
          )
        }
      }

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error("Failed to create blob")
        }

        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, "image/png")
    } catch {
      throw new Error("Failed to download image")
    }
  }

  /**
   * Load an image and return a promise
   */
  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  /**
   * Draw annotations/drawings on the canvas
   */
  private static drawAnnotations(
    ctx: CanvasRenderingContext2D,
    drawings: DrawingElement[],
    imageX: number,
    imageY: number,
    imageWidth: number,
    imageHeight: number,
    originalImageWidth: number,
    originalImageHeight: number
  ): void {
    // Scale factor to map from original image coordinates to canvas coordinates
    const scaleX = imageWidth / originalImageWidth
    const scaleY = imageHeight / originalImageHeight

    drawings.forEach((element) => {
      ctx.save()

      switch (element.type) {
        case "pen":
          this.drawPenStroke(ctx, element, imageX, imageY, scaleX, scaleY)
          break
        case "text":
          this.drawText(ctx, element, imageX, imageY, scaleX, scaleY)
          break
        case "arrow":
          this.drawArrow(ctx, element, imageX, imageY, scaleX, scaleY)
          break
        case "rectangle":
          this.drawRectangle(ctx, element, imageX, imageY, scaleX, scaleY)
          break
        default:
          // Unknown drawing element type
          break
      }

      ctx.restore()
    })
  }

  private static drawPenStroke(
    ctx: CanvasRenderingContext2D,
    element: DrawingElement,
    offsetX: number,
    offsetY: number,
    scaleX: number,
    scaleY: number
  ): void {
    if (element.type !== "pen") return
    if (!element.points || element.points.length < 2) return

    ctx.strokeStyle = element.color || "#000000"
    ctx.lineWidth = (element.strokeWidth || 2) * Math.min(scaleX, scaleY)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    ctx.beginPath()
    const firstX = element.points[0]
    const firstY = element.points[1]
    ctx.moveTo(offsetX + firstX * scaleX, offsetY + firstY * scaleY)

    for (let i = 2; i < element.points.length; i += 2) {
      const x = element.points[i]
      const y = element.points[i + 1]
      ctx.lineTo(offsetX + x * scaleX, offsetY + y * scaleY)
    }

    ctx.stroke()
  }

  private static drawText(
    ctx: CanvasRenderingContext2D,
    element: DrawingElement,
    offsetX: number,
    offsetY: number,
    scaleX: number,
    scaleY: number
  ): void {
    if (element.type !== "text") return
    if (!element.text) return

    const fontSize = (element.fontSize || 16) * Math.min(scaleX, scaleY)
    ctx.font = `${fontSize}px Arial, sans-serif`
    ctx.fillStyle = element.color || "#000000"
    ctx.textAlign = "left"
    ctx.textBaseline = "top"

    ctx.fillText(
      element.text,
      offsetX + element.x * scaleX,
      offsetY + element.y * scaleY
    )
  }

  private static drawArrow(
    ctx: CanvasRenderingContext2D,
    element: DrawingElement,
    offsetX: number,
    offsetY: number,
    scaleX: number,
    scaleY: number
  ): void {
    if (element.type !== "arrow") return
    if (!element.points || element.points.length !== 4) return

    const [x1, y1, x2, y2] = element.points
    const startX = offsetX + x1 * scaleX
    const startY = offsetY + y1 * scaleY
    const endX = offsetX + x2 * scaleX
    const endY = offsetY + y2 * scaleY

    ctx.strokeStyle = element.color || "#000000"
    ctx.lineWidth = (element.strokeWidth || 2) * Math.min(scaleX, scaleY)
    ctx.lineCap = "round"

    // Draw line
    ctx.beginPath()
    ctx.moveTo(startX, startY)
    ctx.lineTo(endX, endY)
    ctx.stroke()

    // Draw arrowhead
    const angle = Math.atan2(endY - startY, endX - startX)
    const arrowLength = 15 * Math.min(scaleX, scaleY)
    const arrowAngle = Math.PI / 6

    ctx.beginPath()
    ctx.moveTo(endX, endY)
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle - arrowAngle),
      endY - arrowLength * Math.sin(angle - arrowAngle)
    )
    ctx.moveTo(endX, endY)
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle + arrowAngle),
      endY - arrowLength * Math.sin(angle + arrowAngle)
    )
    ctx.stroke()
  }

  private static drawRectangle(
    ctx: CanvasRenderingContext2D,
    element: DrawingElement,
    offsetX: number,
    offsetY: number,
    scaleX: number,
    scaleY: number
  ): void {
    if (element.type !== "rectangle") return
    if (!element.width || !element.height) return

    ctx.strokeStyle = element.color || "#000000"
    ctx.lineWidth = (element.strokeWidth || 2) * Math.min(scaleX, scaleY)

    ctx.strokeRect(
      offsetX + element.x * scaleX,
      offsetY + element.y * scaleY,
      element.width * scaleX,
      element.height * scaleY
    )
  }
}
