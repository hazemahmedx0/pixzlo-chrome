import type { ExtractedCSS } from "@/lib/css-extractor"
import type { IssueData, Screenshot } from "@/types/capture"
import type { DrawingElement } from "@/types/drawing"
import type { FigmaDesignLink } from "@/types/figma"
import { create } from "zustand"

export type TabType = "styling" | "info"

interface FigmaDesignData {
  imageUrl: string
  designName: string
  figmaUrl: string
}

interface FigmaProperties {
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
  [key: string]: any // Allow for additional properties
}

interface FigmaContextData {
  figmaUrl: string
  fileId: string
  frameId: string
  frameData?: any
  selectedElementProperties?: FigmaProperties
  frameImageUrl?: string // Cache the frame image URL
  frameElements?: any[] // Cache the frame elements
  selectedElementId?: string // Store the selected element ID
}

interface PixzloDialogState {
  // UI State
  isOpen: boolean
  activeTab: TabType
  activeImageIndex: number
  includeFullscreen: boolean

  // Form State
  title: string
  description: string

  // Data State
  screenshots: Screenshot[]
  selectedElement: HTMLElement | null
  extractedCSS: ExtractedCSS | null
  drawingElements: DrawingElement[]
  drawingOverlayDataUrl: string | null
  figmaDesign: FigmaDesignData | null
  figmaContext: FigmaContextData | null // Store Figma URL and frame context
  isFigmaPopupOpen: boolean // New state for Figma popup
  isFigmaFlowActive: boolean
  figmaDesigns: FigmaDesignLink[]
  figmaDesignsLoading: boolean

  // Actions
  setIsOpen: (isOpen: boolean) => void
  setActiveTab: (tab: TabType) => void
  setActiveImageIndex: (index: number) => void
  setIncludeFullscreen: (include: boolean) => void
  setTitle: (title: string) => void
  setDescription: (description: string) => void
  setScreenshots: (screenshots: Screenshot[]) => void
  setSelectedElement: (element: HTMLElement | null) => void
  setExtractedCSS: (css: ExtractedCSS | null) => void
  setDrawingElements: (elements: DrawingElement[]) => void
  setDrawingOverlayDataUrl: (dataUrl: string | null) => void
  setFigmaDesign: (design: FigmaDesignData | null) => void
  setFigmaContext: (context: FigmaContextData | null) => void // Store Figma context
  setIsFigmaPopupOpen: (isOpen: boolean) => void // New action
  setIsFigmaFlowActive: (active: boolean) => void
  setFigmaDesigns: (designs: FigmaDesignLink[]) => void
  setFigmaDesignsLoading: (loading: boolean) => void

  // Complex Actions
  openDialog: (screenshots: Screenshot[], selectedElement?: HTMLElement) => void
  closeDialog: () => void
  resetForm: () => void
  createIssueData: () => IssueData | null
  setCompositeImageUrl: (originalUrl: string, compositeUrl: string) => void
}

export const usePixzloDialogStore = create<PixzloDialogState>((set, get) => ({
  // Initial State
  isOpen: false,
  activeTab: "styling",
  activeImageIndex: 0,
  includeFullscreen: true,
  title: "",
  description: "",
  screenshots: [],
  selectedElement: null,
  extractedCSS: null,
  drawingElements: [],
  drawingOverlayDataUrl: null,
  figmaDesign: null,
  figmaContext: null, // Initial state
  isFigmaPopupOpen: false, // Initial state
  isFigmaFlowActive: false,
  figmaDesigns: [],
  figmaDesignsLoading: false,

  // Basic Setters
  setIsOpen: (isOpen: boolean) => set({ isOpen }),
  setActiveTab: (activeTab: TabType) => set({ activeTab }),
  setActiveImageIndex: (activeImageIndex: number) => set({ activeImageIndex }),
  setIncludeFullscreen: (includeFullscreen: boolean) =>
    set({ includeFullscreen }),
  setTitle: (title: string) => set({ title }),
  setDescription: (description: string) => set({ description }),
  setScreenshots: (screenshots: Screenshot[]) => set({ screenshots }),
  setSelectedElement: (selectedElement: HTMLElement | null) =>
    set({ selectedElement }),
  setExtractedCSS: (extractedCSS: ExtractedCSS | null) => set({ extractedCSS }),
  setDrawingElements: (drawingElements: DrawingElement[]) =>
    set({ drawingElements }),
  setDrawingOverlayDataUrl: (drawingOverlayDataUrl: string | null) =>
    set({ drawingOverlayDataUrl }),
  setFigmaDesign: (figmaDesign: FigmaDesignData | null) => set({ figmaDesign }),
  setFigmaContext: (figmaContext: FigmaContextData | null) =>
    set({ figmaContext }),
  setIsFigmaPopupOpen: (isFigmaPopupOpen: boolean) => set({ isFigmaPopupOpen }),
  setIsFigmaFlowActive: (isFigmaFlowActive: boolean) =>
    set({ isFigmaFlowActive }),
  setFigmaDesigns: (figmaDesigns: FigmaDesignLink[]) => set({ figmaDesigns }),
  setFigmaDesignsLoading: (figmaDesignsLoading: boolean) =>
    set({ figmaDesignsLoading }),

  // Complex Actions
  openDialog: (screenshots: Screenshot[], selectedElement?: HTMLElement) => {
    console.log("🏪 Store openDialog called with:", {
      screenshotsLength: screenshots.length,
      selectedElement: selectedElement?.tagName,
      firstScreenshot: screenshots[0]?.type
    })

    const currentScreenshot = screenshots[0]
    const isElementCapture = currentScreenshot?.type === "element"
    const showStylingTab = isElementCapture

    set({
      isOpen: true,
      screenshots,
      selectedElement: selectedElement || null,
      activeTab: showStylingTab ? "styling" : "info",
      activeImageIndex: 0
    })

    console.log("✅ Store state updated - dialog should be open")
  },

  setCompositeImageUrl: (originalUrl: string, compositeUrl: string) => {
    set((state) => ({
      screenshots: state.screenshots.map((s) =>
        s.dataUrl === originalUrl
          ? { ...s, compositeImageUrl: compositeUrl }
          : s
      )
    }))
  },

  closeDialog: () => {
    console.log(
      "🔍 DEBUG: Store closeDialog called - resetting all dialog state"
    )
    set({
      isOpen: false,
      screenshots: [],
      selectedElement: null,
      extractedCSS: null,
      drawingElements: [],
      drawingOverlayDataUrl: null,
      figmaDesign: null,
      figmaContext: null,
      isFigmaPopupOpen: false,
      isFigmaFlowActive: false,
      figmaDesigns: [],
      figmaDesignsLoading: false
    })
  },

  resetForm: () => {
    set({
      title: "",
      description: "",
      activeImageIndex: 0,
      includeFullscreen: true
    })
  },

  createIssueData: (): IssueData | null => {
    const state = get()
    const currentScreenshot = state.screenshots[0]

    if (!currentScreenshot?.metadata) return null

    return {
      title: state.title || "Untitled Issue",
      description: state.description,
      priority: "urgent",
      screenshots: state.screenshots,
      metadata: currentScreenshot.metadata
    }
  }
}))
