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
  selectedProperties: Set<string> // Store selected CSS properties

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
  setSelectedProperties: (properties: Set<string>) => void
  toggleProperty: (propertyName: string) => void
  toggleSelectAll: () => void
  resetPropertySelection: () => void

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
  selectedProperties: new Set<string>(), // All properties selected by default

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
  setSelectedProperties: (selectedProperties: Set<string>) =>
    set({ selectedProperties }),
  toggleProperty: (propertyName: string) => {
    const currentSelected = get().selectedProperties
    const newSelected = new Set(currentSelected)
    if (newSelected.has(propertyName)) {
      newSelected.delete(propertyName)
    } else {
      newSelected.add(propertyName)
    }
    set({ selectedProperties: newSelected })
  },
  toggleSelectAll: () => {
    const state = get()
    const allProperties =
      state.extractedCSS?.properties.map((p) => p.name) || []
    const currentSelected = state.selectedProperties
    const allSelected = allProperties.every((name) => currentSelected.has(name))

    if (allSelected) {
      // Deselect all
      set({ selectedProperties: new Set<string>() })
    } else {
      // Select all
      set({ selectedProperties: new Set(allProperties) })
    }
  },
  resetPropertySelection: () => {
    const state = get()
    const allProperties =
      state.extractedCSS?.properties.map((p) => p.name) || []
    set({ selectedProperties: new Set(allProperties) })
  },

  // Complex Actions
  openDialog: (screenshots: Screenshot[], selectedElement?: HTMLElement) => {
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

    // Initialize all properties as selected after a short delay to ensure extractedCSS is set
    setTimeout(() => {
      get().resetPropertySelection()
    }, 100)
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
      figmaDesignsLoading: false,
      selectedProperties: new Set<string>()
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
