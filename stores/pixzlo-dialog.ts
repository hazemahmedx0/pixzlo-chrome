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

export interface LocalFigmaDesign {
  id: string
  figma_file_id: string
  figma_frame_id: string
  frame_name?: string
  frame_url: string
  thumbnail_url?: string
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
  [key: string]: string | number | boolean | undefined
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

  // Source Page Context (for tab page mode)
  // This is the URL of the page where the capture was taken
  sourcePageUrl: string | null

  // Form State
  title: string
  description: string

  // Data State
  screenshots: Screenshot[]
  selectedElement: HTMLElement | null
  extractedCSS: ExtractedCSS | null
  drawingElements: DrawingElement[]
  drawingOverlayDataUrl: string | null
  drawingOverlayExporter: (() => string | null) | null
  figmaDesign: FigmaDesignData | null
  figmaContext: FigmaContextData | null // Store Figma URL and frame context
  isFigmaPopupOpen: boolean // New state for Figma popup
  isFigmaFlowActive: boolean
  figmaDesigns: FigmaDesignLink[]
  figmaDesignsLoading: boolean
  localFigmaDesigns: LocalFigmaDesign[]
  needsFigmaMetadataRefresh: boolean
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
  setDrawingOverlayExporter: (exporter: (() => string | null) | null) => void
  setFigmaDesign: (design: FigmaDesignData | null) => void
  setFigmaContext: (context: FigmaContextData | null) => void // Store Figma context
  setIsFigmaPopupOpen: (isOpen: boolean) => void // New action
  setIsFigmaFlowActive: (active: boolean) => void
  setFigmaDesigns: (designs: FigmaDesignLink[]) => void
  setFigmaDesignsLoading: (loading: boolean) => void
  addLocalFigmaDesign: (design: LocalFigmaDesign) => void
  clearLocalFigmaDesigns: () => void
  setNeedsFigmaMetadataRefresh: (needs: boolean) => void
  setSelectedProperties: (properties: Set<string>) => void
  toggleProperty: (propertyName: string) => void
  toggleSelectAll: () => void
  resetPropertySelection: () => void

  // Source Page Context
  setSourcePageUrl: (url: string | null) => void

  // Complex Actions
  openDialog: (
    screenshots: Screenshot[],
    selectedElement?: HTMLElement,
    sourcePageUrl?: string
  ) => void
  closeDialog: () => void
  resetForm: () => void
  createIssueData: () => IssueData | null
  setCompositeImageUrl: (originalUrl: string, compositeUrl: string) => void

  // Utility to get the current page URL (uses sourcePageUrl if in tab mode, else window.location.href)
  getPageUrl: () => string
}

export const usePixzloDialogStore = create<PixzloDialogState>((set, get) => ({
  // Initial State
  isOpen: false,
  activeTab: "styling",
  activeImageIndex: 0,
  includeFullscreen: true,
  sourcePageUrl: null, // Set when opening from tab page
  title: "",
  description: "",
  screenshots: [],
  selectedElement: null,
  extractedCSS: null,
  drawingElements: [],
  drawingOverlayDataUrl: null,
  drawingOverlayExporter: null,
  figmaDesign: null,
  figmaContext: null, // Initial state
  isFigmaPopupOpen: false, // Initial state
  isFigmaFlowActive: false,
  figmaDesigns: [],
  figmaDesignsLoading: false,
  localFigmaDesigns: [],
  needsFigmaMetadataRefresh: false,
  selectedProperties: new Set<string>(), // All properties selected by default

  // Basic Setters
  setIsOpen: (isOpen: boolean) => set({ isOpen }),
  setSourcePageUrl: (sourcePageUrl: string | null) => set({ sourcePageUrl }),
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
  setDrawingOverlayExporter: (drawingOverlayExporter) =>
    set({ drawingOverlayExporter }),
  setFigmaDesign: (figmaDesign: FigmaDesignData | null) => set({ figmaDesign }),
  setFigmaContext: (figmaContext: FigmaContextData | null) =>
    set({ figmaContext }),
  setIsFigmaPopupOpen: (isFigmaPopupOpen: boolean) => set({ isFigmaPopupOpen }),
  setIsFigmaFlowActive: (isFigmaFlowActive: boolean) =>
    set({ isFigmaFlowActive }),
  setFigmaDesigns: (figmaDesigns: FigmaDesignLink[]) => set({ figmaDesigns }),
  setFigmaDesignsLoading: (figmaDesignsLoading: boolean) =>
    set({ figmaDesignsLoading }),
  addLocalFigmaDesign: (design: LocalFigmaDesign) =>
    set((state) => {
      const existingIndex = state.localFigmaDesigns.findIndex(
        (existing) =>
          existing.figma_frame_id === design.figma_frame_id ||
          existing.frame_url === design.frame_url
      )
      if (existingIndex >= 0) {
        const existing = state.localFigmaDesigns[existingIndex]
        const updated = {
          ...existing,
          ...design,
          id: existing.id
        }
        return {
          localFigmaDesigns: state.localFigmaDesigns.map((item, index) =>
            index === existingIndex ? updated : item
          )
        }
      }
      return {
        localFigmaDesigns: [...state.localFigmaDesigns, design]
      }
    }),
  clearLocalFigmaDesigns: () => set({ localFigmaDesigns: [] }),
  setNeedsFigmaMetadataRefresh: (needsFigmaMetadataRefresh: boolean) =>
    set({ needsFigmaMetadataRefresh }),
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
  openDialog: (
    screenshots: Screenshot[],
    selectedElement?: HTMLElement,
    sourcePageUrl?: string
  ) => {
    const currentScreenshot = screenshots[0]
    const isElementCapture = currentScreenshot?.type === "element"
    const showStylingTab = isElementCapture

    set({
      isOpen: true,
      screenshots,
      selectedElement: selectedElement || null,
      activeTab: showStylingTab ? "styling" : "info",
      activeImageIndex: 0,
      sourcePageUrl: sourcePageUrl || null
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
      drawingOverlayExporter: null,
      figmaDesign: null,
      figmaContext: null,
      isFigmaPopupOpen: false,
      isFigmaFlowActive: false,
      figmaDesigns: [],
      figmaDesignsLoading: false,
      localFigmaDesigns: [],
      selectedProperties: new Set<string>(),
      sourcePageUrl: null
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
      priority: "low",
      screenshots: state.screenshots,
      metadata: currentScreenshot.metadata
    }
  },

  // Utility to get the current page URL
  // Uses sourcePageUrl if set (tab page mode), otherwise falls back to window.location.href
  getPageUrl: (): string => {
    const state = get()
    return state.sourcePageUrl || window.location.href
  }
}))
