import type { CaptureOptions, CaptureType, Screenshot } from "@/types/capture"

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

  async captureElement(
    element: HTMLElement,
    options: CaptureOptions = { type: "element" }
  ): Promise<Screenshot[]> {
    console.log("🚀 BRAND NEW APPROACH - Canvas-based highlighting")

    const rect = element.getBoundingClientRect()
    const MARGIN = 40
    const area = {
      startX: rect.left + window.scrollX - MARGIN,
      startY: rect.top + window.scrollY - MARGIN,
      width: rect.width + MARGIN * 2,
      height: rect.height + MARGIN * 2
    }

    console.log("📏 Capture area:", area)
    console.log("📦 Element rect:", rect)

    // STEP 1: Hide ALL extension UI during capture (using existing comprehensive method)
    console.log("🙈 Hiding ALL UI elements...")
    this.hideUIElements()

    // STEP 2: Capture clean screenshot
    console.log("📸 Capturing clean screenshot...")
    const cleanScreenshot = await this.captureArea(area, {
      ...options,
      type: "element"
    })

    // STEP 3: Create highlighted version using Canvas
    console.log("🎨 Creating highlighted version with Canvas...")
    const highlightedDataUrl = await this.addHighlightToImage(
      cleanScreenshot.dataUrl,
      rect,
      area
    )

    const highlightedScreenshot: Screenshot = {
      dataUrl: highlightedDataUrl,
      timestamp: Date.now(),
      type: "element",
      metadata: cleanScreenshot.metadata
    }

    // STEP 4: Restore UI elements (using existing comprehensive method)
    console.log("👁️ Restoring ALL UI elements...")
    this.showUIElements()

    console.log(
      "✅ SUCCESS - Returning [clean, highlighted] with Canvas approach"
    )
    return [cleanScreenshot, highlightedScreenshot]
  }

  private async addHighlightToImage(
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

          // Set canvas size to the actual cropped area (no forced aspect ratio)
          canvas.width = area.width * dpr
          canvas.height = area.height * dpr

          // Scale the canvas context to handle high DPI displays
          ctx.scale(dpr, dpr)

          // Draw the cropped portion of the image
          ctx.drawImage(
            img,
            area.startX * dpr, // source x
            area.startY * dpr, // source y
            area.width * dpr, // source width
            area.height * dpr, // source height
            0, // destination x
            0, // destination y
            area.width, // destination width
            area.height // destination height
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
    const userAgent = navigator.userAgent
    if (userAgent.includes("Chrome")) {
      return "Chrome"
    } else if (userAgent.includes("Firefox")) {
      return "Firefox"
    } else if (userAgent.includes("Safari")) {
      return "Safari"
    } else if (userAgent.includes("Edge")) {
      return "Edge"
    }
    return "Unknown"
  }

  private detachedElements: {
    element: HTMLElement
    parent: Node
    nextSibling: Node | null
  }[] = []

  private hideUIElements(): void {
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

  private showUIElements(): void {
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
}
