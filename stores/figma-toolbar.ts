import { create } from "zustand"

export interface FigmaFrame {
  id: string // Database link ID (unique per link, allows duplicate Figma frames)
  name: string
  figmaUrl: string
  imageUrl?: string
  fileId: string
  figmaFrameId?: string // Actual Figma frame ID (for preference matching)
}

interface FigmaToolbarState {
  // Current frame being viewed/selected
  currentFrame: FigmaFrame | null

  // List of available frames
  availableFrames: FigmaFrame[]

  // Loading states
  isRefreshing: boolean
  isAddingFrame: boolean

  // UI state
  isFrameSelectorOpen: boolean

  // Actions
  setCurrentFrame: (frame: FigmaFrame | null) => void
  setAvailableFrames: (frames: FigmaFrame[]) => void
  replaceFrames: (frames: FigmaFrame[]) => void
  addFrame: (frame: FigmaFrame) => void
  removeFrame: (frameId: string) => void
  setIsRefreshing: (refreshing: boolean) => void
  setIsAddingFrame: (adding: boolean) => void
  setIsFrameSelectorOpen: (open: boolean) => void
  refreshFrames: () => Promise<void>
  reset: () => void
}

function framesAreEqual(a: FigmaFrame[], b: FigmaFrame[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false
  }
  return true
}

export const useFigmaToolbarStore = create<FigmaToolbarState>((set, get) => ({
  // Initial state
  currentFrame: null,
  availableFrames: [],
  isRefreshing: false,
  isAddingFrame: false,
  isFrameSelectorOpen: false,

  // Actions
  setCurrentFrame: (frame) => {
    const state = get()
    if (
      state.currentFrame?.id === frame?.id &&
      state.currentFrame?.figmaUrl === frame?.figmaUrl
    ) {
      return
    }
    set({ currentFrame: frame })
  },

  setAvailableFrames: (frames) => {
    const state = get()
    if (framesAreEqual(state.availableFrames, frames)) {
      return
    }

    set({
      availableFrames: frames,
      currentFrame: state.currentFrame || frames[0] || null
    })
  },

  replaceFrames: (frames) => {
    const state = get()
    if (framesAreEqual(state.availableFrames, frames)) {
      return
    }
    set({ availableFrames: frames })
  },

  addFrame: (frame) => {
    const state = get()
    if (state.availableFrames.some((existing) => existing.id === frame.id)) {
      return
    }
    set({
      availableFrames: [...state.availableFrames, frame],
      currentFrame: state.currentFrame || frame
    })
  },

  removeFrame: (frameId) => {
    const state = get()
    if (!state.availableFrames.some((f) => f.id === frameId)) {
      return
    }

    const newFrames = state.availableFrames.filter((f) => f.id !== frameId)
    const newCurrentFrame =
      state.currentFrame?.id === frameId
        ? newFrames[0] || null
        : state.currentFrame

    set({
      availableFrames: newFrames,
      currentFrame: newCurrentFrame
    })
  },

  setIsRefreshing: (refreshing) => {
    if (get().isRefreshing === refreshing) return
    set({ isRefreshing: refreshing })
  },
  setIsAddingFrame: (adding) => {
    if (get().isAddingFrame === adding) return
    set({ isAddingFrame: adding })
  },
  setIsFrameSelectorOpen: (open) => {
    if (get().isFrameSelectorOpen === open) return
    set({ isFrameSelectorOpen: open })
  },

  refreshFrames: async () => {
    set({ isRefreshing: true })
    try {
      // This would be implemented to fetch fresh frame data
      // For now, just simulate the loading state
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } finally {
      set({ isRefreshing: false })
    }
  },

  reset: () =>
    set({
      currentFrame: null,
      availableFrames: [],
      isRefreshing: false,
      isAddingFrame: false,
      isFrameSelectorOpen: false
    })
}))
