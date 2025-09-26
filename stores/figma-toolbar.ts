import { create } from "zustand"

export interface FigmaFrame {
  id: string
  name: string
  figmaUrl: string
  imageUrl?: string
  fileId: string
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
  addFrame: (frame: FigmaFrame) => void
  removeFrame: (frameId: string) => void
  setIsRefreshing: (refreshing: boolean) => void
  setIsAddingFrame: (adding: boolean) => void
  setIsFrameSelectorOpen: (open: boolean) => void
  refreshFrames: () => Promise<void>
  reset: () => void
}

export const useFigmaToolbarStore = create<FigmaToolbarState>((set, get) => ({
  // Initial state
  currentFrame: null,
  availableFrames: [],
  isRefreshing: false,
  isAddingFrame: false,
  isFrameSelectorOpen: false,

  // Actions
  setCurrentFrame: (frame) => set({ currentFrame: frame }),

  setAvailableFrames: (frames) =>
    set({
      availableFrames: frames,
      // Auto-select first frame if none selected
      currentFrame: get().currentFrame || frames[0] || null
    }),

  addFrame: (frame) =>
    set((state) => ({
      availableFrames: [...state.availableFrames, frame],
      currentFrame: state.currentFrame || frame // Auto-select if first frame
    })),

  removeFrame: (frameId) =>
    set((state) => {
      const newFrames = state.availableFrames.filter((f) => f.id !== frameId)
      const newCurrentFrame =
        state.currentFrame?.id === frameId
          ? newFrames[0] || null
          : state.currentFrame
      return {
        availableFrames: newFrames,
        currentFrame: newCurrentFrame
      }
    }),

  setIsRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
  setIsAddingFrame: (adding) => set({ isAddingFrame: adding }),
  setIsFrameSelectorOpen: (open) => set({ isFrameSelectorOpen: open }),

  refreshFrames: async () => {
    set({ isRefreshing: true })
    try {
      // This would be implemented to fetch fresh frame data
      // For now, just simulate the loading state
      await new Promise((resolve) => setTimeout(resolve, 1000))
      console.log("🔄 Refreshing frames...")
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
