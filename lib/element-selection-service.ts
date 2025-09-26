import type { CaptureOptions, Screenshot } from "@/types/capture"

import { CaptureService } from "./capture-service"

export interface ElementBounds {
  startX: number
  startY: number
  width: number
  height: number
}

export interface ElementSelectionResult {
  element: HTMLElement
  bounds: ElementBounds
  rect: DOMRect
}

export class ElementSelectionService {
  private static instance: ElementSelectionService
  private captureService: CaptureService

  private constructor() {
    this.captureService = CaptureService.getInstance()
  }

  static getInstance(): ElementSelectionService {
    if (!ElementSelectionService.instance) {
      ElementSelectionService.instance = new ElementSelectionService()
    }
    return ElementSelectionService.instance
  }

  /**
   * Adjusts the given bounds to ensure they are within the visible viewport.
   * This clips the area to what's currently visible on screen.
   */
  private adjustBoundsToViewport(bounds: ElementBounds): ElementBounds {
    const viewport = {
      left: window.scrollX,
      top: window.scrollY,
      right: window.scrollX + window.innerWidth,
      bottom: window.scrollY + window.innerHeight
    }

    const intersection = {
      startX: Math.max(bounds.startX, viewport.left),
      startY: Math.max(bounds.startY, viewport.top),
      endX: Math.min(bounds.startX + bounds.width, viewport.right),
      endY: Math.min(bounds.startY + bounds.height, viewport.bottom)
    }

    const adjustedBounds = {
      startX: intersection.startX,
      startY: intersection.startY,
      width: Math.max(0, intersection.endX - intersection.startX),
      height: Math.max(0, intersection.endY - intersection.startY)
    }

    if (
      adjustedBounds.width !== bounds.width ||
      adjustedBounds.height !== bounds.height
    ) {
      console.log("✂️ Element bounds clipped to viewport:", {
        original: bounds,
        adjusted: adjustedBounds,
        viewport
      })
    }

    return adjustedBounds
  }

  /**
   * Calculate element bounds with margin, accounting for scroll position
   */
  calculateElementBounds(
    element: HTMLElement,
    margin: number = 40
  ): ElementBounds {
    const rect = element.getBoundingClientRect()
    return this.calculateElementBoundsFromRect(rect, margin)
  }

  /**
   * Calculate element bounds from a provided DOMRect with margin, accounting for scroll position
   */
  calculateElementBoundsFromRect(
    rect: DOMRect,
    margin: number = 40
  ): ElementBounds {
    // Convert viewport coordinates to document coordinates
    return {
      startX: rect.left + window.scrollX - margin,
      startY: rect.top + window.scrollY - margin,
      width: rect.width + margin * 2,
      height: rect.height + margin * 2
    }
  }

  /**
   * Find Konva canvases within an element
   */
  findKonvaCanvases(element: HTMLElement): HTMLCanvasElement[] {
    const canvases: HTMLCanvasElement[] = []

    // Check if the element itself is a canvas
    if (element.tagName === "CANVAS") {
      const canvas = element as HTMLCanvasElement
      if (this.isKonvaCanvas(canvas)) {
        canvases.push(canvas)
      }
    }

    // Check all canvas elements within the element
    const childCanvases = element.querySelectorAll("canvas")
    childCanvases.forEach((canvas) => {
      if (this.isKonvaCanvas(canvas)) {
        canvases.push(canvas)
      }
    })

    return canvases
  }

  /**
   * Check if a canvas is a Konva canvas
   */
  private isKonvaCanvas(canvas: HTMLCanvasElement): boolean {
    return (
      canvas.className.includes("konva") ||
      (canvas as any)._konvaStage ||
      canvas.style.position === "absolute"
    )
  }

  /**
   * Capture an element with its context
   */
  async captureElement(
    element: HTMLElement,
    options: CaptureOptions = { type: "element" },
    providedRect?: DOMRect
  ): Promise<Screenshot[]> {
    console.log(
      "🚀 ElementSelectionService - capturing element with 16:9 aspect ratio"
    )

    // Use the provided rect (captured at selection time) or fall back to current rect
    const rect = providedRect || element.getBoundingClientRect()
    const rawBaseArea = this.calculateElementBoundsFromRect(rect, 40)
    const baseArea = this.adjustBoundsToViewport(rawBaseArea)

    // After adjusting, if the area has no size, the element is not visible.
    if (baseArea.width <= 0 || baseArea.height <= 0) {
      throw new Error(
        "Invalid element selection - element is completely outside the viewport."
      )
    }

    console.log("📏 Base area (element + 40px margin):", baseArea)
    console.log("📦 Element rect:", rect)
    console.log(
      "🎯 Using provided rect:",
      !!providedRect,
      providedRect ? "from selection time" : "recalculated"
    )

    // Check if element contains Konva canvas
    const konvaCanvases = this.findKonvaCanvases(element)
    console.log("🔍 Checking for Konva canvases:", {
      elementTag: element.tagName,
      elementClasses: Array.from(element.classList),
      konvaCanvasesFound: konvaCanvases.length
    })

    if (konvaCanvases.length > 0) {
      console.log("🎨 Konva canvas detected, using special capture method...")
      return await this.captureKonvaElement(
        element,
        rect,
        konvaCanvases,
        options
      )
    }

    console.log("📸 No Konva canvas found, using regular capture method...")
    return await this.captureRegularElement(element, rect, baseArea, options)
  }

  /**
   * Capture regular (non-Konva) element
   */
  private async captureRegularElement(
    element: HTMLElement,
    rect: DOMRect,
    baseArea: ElementBounds,
    options: CaptureOptions
  ): Promise<Screenshot[]> {
    // Hide UI elements during capture
    console.log("🙈 Hiding UI elements...")
    this.captureService.hideUIElements()

    try {
      // Capture the base area (element + margin)
      console.log("📸 Capturing base area...")
      const baseScreenshot = await this.captureService.captureArea(baseArea, {
        ...options,
        type: "element"
      })

      // Convert to 16:9 with smart padding
      console.log("🎨 Converting to 16:9 with smart padding...")
      const screenshot16x9 =
        await this.captureService.convertTo16x9WithSmartPadding(
          baseScreenshot.dataUrl,
          baseArea
        )

      const cleanScreenshot: Screenshot = {
        dataUrl: screenshot16x9,
        timestamp: Date.now(),
        type: "element",
        metadata: baseScreenshot.metadata
      }

      // Create highlighted version
      console.log("🎯 Adding highlight to 16:9 image...")
      const highlightedDataUrl =
        await this.captureService.addHighlightTo16x9Smart(
          screenshot16x9,
          rect,
          baseArea
        )

      const highlightedScreenshot: Screenshot = {
        dataUrl: highlightedDataUrl,
        timestamp: Date.now(),
        type: "element",
        metadata: baseScreenshot.metadata
      }

      console.log("✅ SUCCESS - Element captured with proper 16:9 ratio")
      return [cleanScreenshot, highlightedScreenshot]
    } finally {
      // Always restore UI elements
      console.log("👁️ Restoring UI elements...")
      this.captureService.showUIElements()
    }
  }

  /**
   * Capture Konva element with special handling
   */
  private async captureKonvaElement(
    element: HTMLElement,
    rect: DOMRect,
    konvaCanvases: HTMLCanvasElement[],
    options: CaptureOptions
  ): Promise<Screenshot[]> {
    console.log(
      "🎨 Capturing Konva canvas - pure content, transparent background..."
    )

    try {
      const canvas = konvaCanvases[0]
      console.log("🎯 Found Konva canvas:", {
        canvasSize: { width: canvas.width, height: canvas.height },
        canvasRect: canvas.getBoundingClientRect()
      })

      // Hide all extension UI for clean capture
      this.captureService.hideUIElements()

      // Try to get the Konva stage directly
      const stage =
        (canvas as any)._konvaStage ||
        ((window as any).Konva &&
          (window as any).Konva.stages?.find(
            (s: any) => s.container().querySelector("canvas") === canvas
          ))

      let konvaDataUrl: string | null = null

      if (stage) {
        console.log("🎯 Found Konva stage, extracting pure canvas content...")
        try {
          konvaDataUrl = stage.toDataURL({
            mimeType: "image/png",
            quality: 1.0,
            pixelRatio: window.devicePixelRatio || 1
          })
          console.log("✅ Successfully extracted Konva stage content")
        } catch (stageError) {
          console.warn("⚠️ Failed to extract stage content:", stageError)
        }
      }

      // Fallback: regular screen capture
      if (!konvaDataUrl) {
        console.log("📸 Falling back to screen capture...")
        const bounds = this.calculateElementBounds(element, 40)
        const fallbackScreenshot = await this.captureService.captureArea(
          bounds,
          options
        )
        konvaDataUrl = fallbackScreenshot.dataUrl
      }

      // Convert to 16:9 and add highlights (only if preserveOriginalAspect is not true)
      let finalDataUrl = konvaDataUrl
      if (!options.preserveOriginalAspect) {
        finalDataUrl = await this.captureService.convertTo16x9WithSmartPadding(
          konvaDataUrl,
          {
            width: canvas.width,
            height: canvas.height
          }
        )
      }

      const cleanScreenshot: Screenshot = {
        dataUrl: finalDataUrl,
        timestamp: Date.now(),
        type: "element",
        metadata: {
          url: window.location.href,
          device: "Desktop",
          browser: "Chrome",
          screenResolution: `${screen.width}x${screen.height}px`,
          viewportSize: `${window.innerWidth}x${window.innerHeight}px`
        }
      }

      // Add highlight (use appropriate method based on aspect ratio preservation)
      let highlightedDataUrl: string
      if (options.preserveOriginalAspect) {
        // For preserved aspect ratio, use simple highlight without 16:9 conversion
        highlightedDataUrl = await this.captureService.addHighlightToImage(
          konvaDataUrl,
          rect,
          this.calculateElementBounds(element, 40)
        )
      } else {
        highlightedDataUrl = await this.captureService.addHighlightTo16x9Smart(
          finalDataUrl,
          rect,
          this.calculateElementBounds(element, 40)
        )
      }

      const highlightedScreenshot: Screenshot = {
        dataUrl: highlightedDataUrl,
        timestamp: Date.now(),
        type: "element",
        metadata: cleanScreenshot.metadata
      }

      console.log("✅ SUCCESS - Konva element captured")
      return [cleanScreenshot, highlightedScreenshot]
    } finally {
      this.captureService.showUIElements()
    }
  }
}
