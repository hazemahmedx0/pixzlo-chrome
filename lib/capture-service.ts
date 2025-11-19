import type { CaptureOptions, CaptureType, Screenshot } from "@/types/capture"

const PADDING_BACKGROUND_COLOR = "#f3f4f6"

export class CaptureService {
  private static instance: CaptureService

  static getInstance(): CaptureService {
    if (!CaptureService.instance) {
      CaptureService.instance = new CaptureService()
    }
    return CaptureService.instance
  }

  async captureScreen(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if chrome extension context is still valid
      if (typeof chrome === "undefined" || !chrome.runtime) {
        reject(new Error("Extension context invalidated"))
        return
      }

      try {
        // Hide floating toolbar and other UI elements before capture
        this.hideUIElements()

        // Reduced delay for better performance
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: "capture-screen" }, (response) => {
            // Show UI elements again after capture
            this.showUIElements()

            if (chrome.runtime.lastError) {
              const error = chrome.runtime.lastError.message
              if (error.includes("Extension context invalidated")) {
                console.log("Extension context invalidated during capture")
                reject(new Error("Extension context invalidated"))
              } else {
                reject(new Error(error))
              }
              return
            }
            if (response?.dataUrl) {
              resolve(response.dataUrl)
            } else {
              reject(new Error("Failed to capture screen"))
            }
          })
        }, 25) // 25ms delay
      } catch (error) {
        this.showUIElements() // Ensure UI elements are shown even if error occurs
        reject(new Error("Extension context invalidated"))
      }
    })
  }

  async captureFullScreen(
    options: CaptureOptions = { type: "fullscreen" }
  ): Promise<Screenshot> {
    const dataUrl = await this.captureScreen()
    const metadata =
      options.includeMetadata !== false ? this.getMetadata() : undefined

    return {
      dataUrl,
      timestamp: Date.now(),
      type: "fullscreen",
      metadata
    }
  }

  async captureArea(
    area: { startX: number; startY: number; width: number; height: number },
    options: CaptureOptions = { type: "area" }
  ): Promise<Screenshot> {
    const fullScreenDataUrl = await this.captureScreen()
    const croppedDataUrl = await this.cropImage(fullScreenDataUrl, area)
    const metadata =
      options.includeMetadata !== false ? this.getMetadata() : undefined

    return {
      dataUrl: croppedDataUrl,
      timestamp: Date.now(),
      type: options.type || "area",
      metadata
    }
  }

  /**
   * Convert captured image to 16:9 aspect ratio with smart gray padding
   * Only adds gray where needed - fills one dimension completely, pads the other
   */
  async convertTo16x9WithSmartPadding(
    imageDataUrl: string,
    originalArea: { width: number; height: number }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Failed to get canvas context"))
            return
          }

          const aspectRatio = 16 / 9
          const currentRatio = originalArea.width / originalArea.height
          const dpr = window.devicePixelRatio || 1

          let canvasWidth: number
          let canvasHeight: number
          let drawX = 0
          let drawY = 0
          let drawWidth = originalArea.width
          let drawHeight = originalArea.height

          if (currentRatio > aspectRatio) {
            // Image is wider than 16:9 - use width as base, add gray on top/bottom
            canvasWidth = originalArea.width
            canvasHeight = originalArea.width / aspectRatio
            drawX = 0
            drawY = (canvasHeight - originalArea.height) / 2
          } else {
            // Image is taller than 16:9 - use height as base, add gray on left/right
            canvasHeight = originalArea.height
            canvasWidth = originalArea.height * aspectRatio
            drawX = (canvasWidth - originalArea.width) / 2
            drawY = 0
          }

          // Set canvas size with device pixel ratio - use Math.round to avoid sub-pixels
          canvas.width = Math.round(canvasWidth * dpr)
          canvas.height = Math.round(canvasHeight * dpr)

          // Calculate exact pixel positions to avoid gaps
          const imageX = Math.round(drawX * dpr)
          const imageY = Math.round(drawY * dpr)
          const imageWidth = Math.round(drawWidth * dpr)
          const imageHeight = Math.round(drawHeight * dpr)

          console.log("📐 Converting to 16:9:", {
            original: {
              width: originalArea.width,
              height: originalArea.height
            },
            final: { width: canvasWidth, height: canvasHeight },
            canvas: { width: canvas.width, height: canvas.height },
            imagePosition: {
              x: imageX,
              y: imageY,
              w: imageWidth,
              h: imageHeight
            },
            currentRatio,
            aspectRatio
          })

          // Fill entire canvas with the standard padding color first
          ctx.fillStyle = PADDING_BACKGROUND_COLOR
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Draw the original image
          ctx.drawImage(img, imageX, imageY, imageWidth, imageHeight)

          resolve(canvas.toDataURL("image/png"))
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = imageDataUrl
    })
  }

  /**
   * Add highlight to 16:9 image with smart positioning
   */
  async addHighlightTo16x9Smart(
    imageDataUrl: string,
    elementRect: DOMRect,
    baseArea: { startX: number; startY: number; width: number; height: number }
  ): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")!

        // Set canvas size to match the 16:9 image
        canvas.width = img.width
        canvas.height = img.height

        // Draw the original 16:9 image
        ctx.drawImage(img, 0, 0)

        const dpr = window.devicePixelRatio || 1
        const aspectRatio = 16 / 9
        const currentRatio = baseArea.width / baseArea.height

        // Calculate where the original content was drawn in the 16:9 canvas
        let contentOffsetX = 0
        let contentOffsetY = 0

        if (currentRatio > aspectRatio) {
          // Content was wider - gray added on top/bottom, content at x=0
          contentOffsetX = 0
          contentOffsetY = (baseArea.width / aspectRatio - baseArea.height) / 2
        } else {
          // Content was taller - gray added on left/right, content at y=0
          contentOffsetX = (baseArea.height * aspectRatio - baseArea.width) / 2
          contentOffsetY = 0
        }

        // Position of element within the original base area
        const elementOffsetX =
          elementRect.left + window.scrollX - baseArea.startX
        const elementOffsetY =
          elementRect.top + window.scrollY - baseArea.startY

        // Final position in the 16:9 canvas
        const highlightX = (contentOffsetX + elementOffsetX) * dpr
        const highlightY = (contentOffsetY + elementOffsetY) * dpr
        const highlightWidth = elementRect.width * dpr
        const highlightHeight = elementRect.height * dpr

        console.log("🎯 Smart highlight positioning:", {
          contentOffset: { x: contentOffsetX, y: contentOffsetY },
          elementOffset: { x: elementOffsetX, y: elementOffsetY },
          finalPosition: {
            x: highlightX,
            y: highlightY,
            w: highlightWidth,
            h: highlightHeight
          },
          currentRatio,
          aspectRatio
        })

        // Draw highlight background
        ctx.fillStyle = "rgba(59, 130, 246, 0.2)"
        ctx.fillRect(highlightX, highlightY, highlightWidth, highlightHeight)

        // Draw highlight border
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 3 * dpr
        ctx.strokeRect(highlightX, highlightY, highlightWidth, highlightHeight)

        resolve(canvas.toDataURL("image/png"))
      }
      img.src = imageDataUrl
    })
  }

  async addHighlightToImage(
    imageDataUrl: string,
    elementRect: DOMRect,
    captureArea: {
      startX: number
      startY: number
      width: number
      height: number
    }
  ): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")!

        // Set canvas size to match the captured image
        canvas.width = img.width
        canvas.height = img.height

        // Draw the original image
        ctx.drawImage(img, 0, 0)

        // Calculate highlight position relative to the captured area
        const dpr = window.devicePixelRatio || 1
        const highlightX =
          (elementRect.left + window.scrollX - captureArea.startX) * dpr
        const highlightY =
          (elementRect.top + window.scrollY - captureArea.startY) * dpr
        const highlightWidth = elementRect.width * dpr
        const highlightHeight = elementRect.height * dpr

        console.log("🎯 Drawing highlight at:", {
          highlightX,
          highlightY,
          highlightWidth,
          highlightHeight
        })

        // Draw highlight background
        ctx.fillStyle = "rgba(59, 130, 246, 0.2)"
        ctx.fillRect(highlightX, highlightY, highlightWidth, highlightHeight)

        // Draw highlight border
        ctx.strokeStyle = "#3b82f6"
        ctx.lineWidth = 3 * dpr
        ctx.strokeRect(highlightX, highlightY, highlightWidth, highlightHeight)

        resolve(canvas.toDataURL("image/png"))
      }
      img.src = imageDataUrl
    })
  }

  private async cropImage(
    dataUrl: string,
    area: { startX: number; startY: number; width: number; height: number }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Failed to get canvas context"))
            return
          }

          const dpr = window.devicePixelRatio || 1

          // The source image (`img`) is a screenshot of the viewport.
          // The `area` coordinates are relative to the document.
          // We need to convert the document coordinates to viewport coordinates for cropping.

          const sx = (area.startX - window.scrollX) * dpr
          const sy = (area.startY - window.scrollY) * dpr
          const sWidth = area.width * dpr
          const sHeight = area.height * dpr

          // The destination canvas will have the size of the cropped area.
          canvas.width = area.width * dpr
          canvas.height = area.height * dpr

          console.log("📸 Cropping image:", {
            source: { sx, sy, sWidth, sHeight },
            destination: { width: canvas.width, height: canvas.height },
            scroll: { scrollX: window.scrollX, scrollY: window.scrollY },
            area
          })

          // Draw the cropped portion of the image from the viewport screenshot
          ctx.drawImage(
            img,
            sx, // source x (from viewport)
            sy, // source y (from viewport)
            sWidth, // source width
            sHeight, // source height
            0, // destination x
            0, // destination y
            canvas.width, // destination width
            canvas.height // destination height
          )

          resolve(canvas.toDataURL("image/png"))
        } catch (error) {
          reject(error)
        }
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = dataUrl
    })
  }

  private getMetadata() {
    return {
      url: window.location.href,
      device: this.getDeviceInfo(),
      browser: this.getBrowserInfo(),
      screenResolution: `${screen.width}×${screen.height}px`,
      viewportSize: `${window.innerWidth}×${window.innerHeight}px`
    }
  }

  private getDeviceInfo(): string {
    const userAgent = navigator.userAgent
    if (/Mobi|Android/i.test(userAgent)) {
      return "Mobile"
    } else if (/Tablet|iPad/i.test(userAgent)) {
      return "Tablet"
    } else if (/Mac/i.test(userAgent)) {
      return "Desktop: macOS"
    } else if (/Win/i.test(userAgent)) {
      return "Desktop: Windows"
    } else if (/Linux/i.test(userAgent)) {
      return "Desktop: Linux"
    }
    return "Desktop"
  }

  private getBrowserInfo(): string {
    // cast navigator to any to silence TS
    const uaData = (navigator as any).userAgentData

    const brands = uaData?.brands || uaData?.uaList
    if (Array.isArray(brands)) {
      const brandNames = brands.map((b: any) => b.brand.toLowerCase())
      if (brandNames.some((b) => b.includes("dia"))) return "Dia"
      if (brandNames.some((b) => b.includes("arc"))) return "Arc"
      if (brandNames.some((b) => b.includes("edge"))) return "Microsoft Edge"
      if (brandNames.some((b) => b.includes("chrome"))) return "Google Chrome"
      if (brandNames.some((b) => b.includes("opera") || b.includes("opr")))
        return "Opera"
    }

    // fallback to classic UA
    const ua = navigator.userAgent
    if (/Dia/i.test(ua)) return "Dia"
    if (/Arc/i.test(ua)) return "Arc"
    if (/Edg/i.test(ua)) return "Microsoft Edge"
    if (/OPR|Opera/i.test(ua)) return "Opera"
    if (/Firefox/i.test(ua)) return "Mozilla Firefox"
    if (/Chrome/i.test(ua))
      return /CriOS/i.test(ua) ? "Google Chrome (iOS)" : "Google Chrome"
    if (/Safari/i.test(ua)) return "Apple Safari"

    return "Unknown Browser"
  }

  private detachedElements: {
    element: HTMLElement
    parent: Node
    nextSibling: Node | null
  }[] = []

  hideUIElements(): void {
    console.log("🚀 NUCLEAR APPROACH - DETACHING PLASMO UI FROM DOM")

    // STEP 1: Find and DETACH Plasmo elements completely from DOM
    const plasmoElements = document.querySelectorAll("plasmo-csui")
    console.log(`🎯 Found ${plasmoElements.length} plasmo-csui elements`)

    plasmoElements.forEach((element) => {
      const htmlElement = element as HTMLElement
      console.log("🔥 DETACHING plasmo-csui element:", htmlElement)

      // Store reference for restoration
      this.detachedElements.push({
        element: htmlElement,
        parent: htmlElement.parentNode!,
        nextSibling: htmlElement.nextSibling
      })

      // COMPLETELY REMOVE from DOM
      htmlElement.remove()
    })

    // STEP 2: Hide other extension UI by selectors
    const selectors = [
      "[id*='plasmo']", // Any element with plasmo in ID
      "[class*='plasmo']", // Any element with plasmo in class
      "#plasmo-shadow-container", // Plasmo shadow container
      "[data-pixzlo-ui]", // Data attribute for extension UI
      '[class*="floating-toolbar"]',
      '[class*="z-[2147483647]"]',
      '[style*="z-index: 2147483647"]',
      '[style*="z-index:2147483647"]',
      '.pointer-events-auto[class*="fixed"]',
      'div[style*="position: fixed"][style*="z-index"]'
    ]

    let hiddenCount = 0
    selectors.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector)
        elements.forEach((element) => {
          const htmlElement = element as HTMLElement
          if (!htmlElement.dataset.originalVisibility) {
            htmlElement.dataset.originalVisibility =
              htmlElement.style.visibility || ""
            htmlElement.dataset.originalDisplay =
              htmlElement.style.display || ""
            htmlElement.style.visibility = "hidden !important"
            htmlElement.style.display = "none !important"
            htmlElement.style.opacity = "0 !important"
            hiddenCount++
          }
        })
      } catch (error) {
        console.warn(`Invalid selector: ${selector}`)
      }
    })

    // STEP 3: Hide high z-index elements
    const allElements = document.querySelectorAll("*")
    allElements.forEach((element) => {
      const htmlElement = element as HTMLElement
      const computedStyle = window.getComputedStyle(htmlElement)
      const zIndex = computedStyle.zIndex
      const position = computedStyle.position

      if (
        zIndex &&
        parseInt(zIndex) >= 999999 &&
        (position === "fixed" || position === "absolute")
      ) {
        if (!htmlElement.dataset.originalVisibility) {
          htmlElement.dataset.originalVisibility =
            htmlElement.style.visibility || ""
          htmlElement.dataset.originalDisplay = htmlElement.style.display || ""
          htmlElement.style.visibility = "hidden !important"
          htmlElement.style.display = "none !important"
          hiddenCount++
        }
      }
    })

    console.log(`🚀 DETACHED ${this.detachedElements.length} plasmo elements`)
    console.log(`🙈 HIDDEN ${hiddenCount} additional UI elements`)
  }

  showUIElements(): void {
    console.log("🔄 RESTORING UI ELEMENTS...")

    // STEP 1: REATTACH detached Plasmo elements to DOM
    console.log(
      `🔄 Reattaching ${this.detachedElements.length} detached elements`
    )
    this.detachedElements.forEach(({ element, parent, nextSibling }) => {
      try {
        if (nextSibling) {
          parent.insertBefore(element, nextSibling)
        } else {
          parent.appendChild(element)
        }
        console.log("✅ Reattached plasmo-csui element")
      } catch (error) {
        console.error("❌ Failed to reattach element:", error)
      }
    })

    // Clear the detached elements array
    this.detachedElements = []

    // STEP 2: Restore hidden elements
    const elementsWithStoredVisibility = document.querySelectorAll(
      "[data-original-visibility]"
    )
    let restoredCount = 0

    elementsWithStoredVisibility.forEach((element) => {
      const htmlElement = element as HTMLElement

      // Restore original visibility
      const originalVisibility = htmlElement.dataset.originalVisibility || ""
      const originalDisplay = htmlElement.dataset.originalDisplay || ""

      htmlElement.style.visibility = originalVisibility
      htmlElement.style.display = originalDisplay
      htmlElement.style.opacity = ""

      // Clean up data attributes
      delete htmlElement.dataset.originalVisibility
      delete htmlElement.dataset.originalDisplay

      restoredCount++
    })

    console.log(`🔄 Successfully restored ${restoredCount} UI elements`)
  }

  /**
   * Find Konva canvases within an element - prioritize canvases with actual content
   */

  /**
   * Add simple border to transparent Konva canvas (preserves transparency)
   */
  private async addSimpleBorderToKonva(konvaDataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const konvaImg = new Image()
      konvaImg.onload = () => {
        const highlightCanvas = document.createElement("canvas")
        const ctx = highlightCanvas.getContext("2d")!

        // Use the original Konva canvas size
        highlightCanvas.width = konvaImg.width
        highlightCanvas.height = konvaImg.height

        // Draw the original transparent Konva content
        ctx.drawImage(konvaImg, 0, 0)

        // Add only a border highlight (preserves transparency)
        ctx.strokeStyle = "rgba(59, 130, 246, 1.0)"
        ctx.lineWidth = 3
        ctx.strokeRect(
          1,
          1,
          highlightCanvas.width - 2,
          highlightCanvas.height - 2
        )

        console.log("🎯 Added simple border to transparent Konva canvas")
        resolve(highlightCanvas.toDataURL("image/png"))
      }
      konvaImg.src = konvaDataUrl
    })
  }

  /**
   * Creates a final Konva image with proper background detection
   * and optionally adding a highlight.
   */
  private async compositeKonvaImage(
    konvaDataUrl: string,
    { withHighlight }: { withHighlight: boolean }
  ): Promise<string> {
    return new Promise((resolve) => {
      const konvaImg = new Image()
      konvaImg.onload = () => {
        const finalCanvas = document.createElement("canvas")
        const ctx = finalCanvas.getContext("2d")!

        // Use the original Konva canvas size
        finalCanvas.width = konvaImg.width
        finalCanvas.height = konvaImg.height

        // DEBUG: Let's see what background colors we're getting
        const bodyBg = window.getComputedStyle(document.body).backgroundColor
        const htmlBg = window.getComputedStyle(
          document.documentElement
        ).backgroundColor

        // Look for Konva container background
        const konvaContainer = document.querySelector(".konvajs-content")
        const containerBg = konvaContainer
          ? window.getComputedStyle(konvaContainer as HTMLElement)
              .backgroundColor
          : "transparent"

        console.log("🎨 Background color debug:", {
          bodyBg,
          htmlBg,
          containerBg,
          konvaContainerFound: !!konvaContainer
        })

        // Try to get the most appropriate background color
        let backgroundColorToUse = "white" // Safe default

        if (
          containerBg !== "transparent" &&
          containerBg !== "rgba(0, 0, 0, 0)"
        ) {
          backgroundColorToUse = containerBg
          console.log(
            "🎯 Using Konva container background:",
            backgroundColorToUse
          )
        } else if (bodyBg !== "transparent" && bodyBg !== "rgba(0, 0, 0, 0)") {
          backgroundColorToUse = bodyBg
          console.log("🎯 Using body background:", backgroundColorToUse)
        } else if (htmlBg !== "transparent" && htmlBg !== "rgba(0, 0, 0, 0)") {
          backgroundColorToUse = htmlBg
          console.log("🎯 Using html background:", backgroundColorToUse)
        }

        // 1. Fill canvas with detected background color
        ctx.fillStyle = backgroundColorToUse
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height)

        // 2. Draw the original Konva content
        ctx.drawImage(konvaImg, 0, 0)

        // 3. Optionally add a border highlight
        if (withHighlight) {
          ctx.strokeStyle = "rgba(59, 130, 246, 1.0)"
          ctx.lineWidth = 3
          ctx.strokeRect(1, 1, finalCanvas.width - 2, finalCanvas.height - 2)
          console.log("🎯 Added border highlight")
        }

        console.log(
          `✅ Final Konva composite: ${finalCanvas.width}x${finalCanvas.height} with background: ${backgroundColorToUse}`
        )
        resolve(finalCanvas.toDataURL("image/png"))
      }
      konvaImg.src = konvaDataUrl
    })
  }

  /**
   * Add border-only highlight to Konva canvas (no fill, no overlay)
   */
  private async addBorderHighlightToKonva(
    konvaDataUrl: string
  ): Promise<string> {
    return new Promise((resolve) => {
      const konvaImg = new Image()
      konvaImg.onload = () => {
        const highlightCanvas = document.createElement("canvas")
        const ctx = highlightCanvas.getContext("2d")!

        // Use the original Konva canvas size
        highlightCanvas.width = konvaImg.width
        highlightCanvas.height = konvaImg.height

        // Draw the original Konva content (which already has the background)
        ctx.drawImage(konvaImg, 0, 0)

        // Add only a border highlight (no fill or overlay)
        ctx.strokeStyle = "rgba(59, 130, 246, 1.0)" // Solid blue
        ctx.lineWidth = 3
        ctx.strokeRect(
          1,
          1,
          highlightCanvas.width - 2,
          highlightCanvas.height - 2
        )

        // NO overlay - preserve original content exactly

        console.log("🎯 Added border-only highlight to Konva canvas")
        resolve(highlightCanvas.toDataURL("image/png"))
      }
      konvaImg.src = konvaDataUrl
    })
  }
}
