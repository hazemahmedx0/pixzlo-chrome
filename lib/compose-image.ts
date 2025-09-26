export async function composeAnnotatedImage(
  baseImageUrl: string,
  overlayDataUrl?: string | null
): Promise<string> {
  const baseImg = await loadImage(baseImageUrl)

  let targetWidth = baseImg.naturalWidth
  let targetHeight = baseImg.naturalHeight

  // If overlay provided, prefer its dimensions to ensure 1:1 alignment
  if (overlayDataUrl) {
    try {
      const overlayImg = await loadImage(overlayDataUrl)
      if (overlayImg.naturalWidth > 0 && overlayImg.naturalHeight > 0) {
        targetWidth = overlayImg.naturalWidth
        targetHeight = overlayImg.naturalHeight
      }
    } catch {
      // Ignore overlay dimension errors; fall back to base image size
    }
  }

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Failed to get canvas context")

  canvas.width = targetWidth
  canvas.height = targetHeight

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  // Draw base scaled to target
  ctx.drawImage(baseImg, 0, 0, targetWidth, targetHeight)

  // Draw overlay if present
  if (overlayDataUrl) {
    try {
      const overlayImg = await loadImage(overlayDataUrl)
      ctx.drawImage(overlayImg, 0, 0, targetWidth, targetHeight)
    } catch {
      // Silently ignore overlay draw errors
    }
  }

  return canvas.toDataURL("image/png")
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
