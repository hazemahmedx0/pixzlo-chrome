import { DRAWING_CONSTANTS } from "@/components/content/drawing/drawing-utils"
import type { DrawingElement, DrawingState, DrawingTool } from "@/types/drawing"
import { create } from "zustand"

interface DrawingHistory {
  states: DrawingState[]
  currentIndex: number
}

/**
 * Deep clones any object to prevent reference sharing
 * Includes error handling for circular references and invalid data
 */
const deepClone = <T>(obj: T): T => {
  try {
    return JSON.parse(JSON.stringify(obj))
  } catch {
    // Fallback: return the original object (not ideal but prevents crashes)
    return obj
  }
}

interface TextEditingState {
  isEditing: string | null
  initialValue: string
  hasActiveEdit: boolean
}

interface DrawingStore {
  // Core drawing state
  drawingState: DrawingState

  // History for undo/redo
  history: DrawingHistory

  // Text editing state
  textEditing: TextEditingState

  // Temporary drawing state (for live drawing)
  tempElement: DrawingElement | null
  isDrawing: boolean

  // Basic setters
  setTool: (tool: DrawingTool) => void
  setColor: (color: string) => void
  setStrokeWidth: (width: number) => void
  setFontSize: (size: number) => void

  // Element operations
  addElement: (element: DrawingElement) => void
  updateElement: (id: string, updates: Partial<DrawingElement>) => void
  removeElement: (id: string) => void
  setElements: (elements: DrawingElement[]) => void

  // Temporary element operations (for live drawing)
  setTempElement: (element: DrawingElement | null) => void
  updateTempElement: (updates: Partial<DrawingElement>) => void
  finalizeTempElement: () => void

  // History operations
  undo: () => void
  redo: () => void
  saveToHistory: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  saveStateToHistory: (state: DrawingState) => void

  // Text editing operations
  startTextEdit: (elementId: string, initialText: string) => void
  updateTextLive: (elementId: string, text: string) => void
  finishTextEdit: (elementId: string, finalText: string) => void
  cancelTextEdit: (elementId: string) => void

  // Drawing session management
  startDrawing: () => void
  stopDrawing: () => void

  // Complete state management
  resetDrawing: () => void
  initializeWithElements: (elements: DrawingElement[]) => void
}

const createInitialState = (): DrawingState => ({
  tool: "pen",
  color: DRAWING_CONSTANTS.DEFAULT_COLOR,
  strokeWidth: DRAWING_CONSTANTS.DEFAULT_STROKE_WIDTH,
  fontSize: DRAWING_CONSTANTS.DEFAULT_FONT_SIZE,
  elements: [],
  selectedElementId: null,
  isDrawing: false
})

const createInitialHistory = (initialState: DrawingState): DrawingHistory => ({
  states: [deepClone(initialState)],
  currentIndex: 0
})

/**
 * Adds a state to history and manages history size
 */
const addToHistory = (
  history: DrawingHistory,
  newState: DrawingState
): DrawingHistory => {
  try {
    // Validate inputs
    if (!history || !newState) {
      return history
    }

    if (!Array.isArray(history.states)) {
      return {
        states: [deepClone(newState)],
        currentIndex: 0
      }
    }

    const newHistory = {
      states: [
        ...history.states.slice(0, history.currentIndex + 1),
        deepClone(newState)
      ],
      currentIndex: history.currentIndex + 1
    }

    // Limit history size
    if (newHistory.states.length > DRAWING_CONSTANTS.HISTORY_LIMIT) {
      newHistory.states.shift()
      newHistory.currentIndex--
    }

    return newHistory
  } catch {
    // Return original history as fallback
    return history
  }
}

export const useDrawingStore = create<DrawingStore>((set, get) => {
  const initialState = createInitialState()
  const initialHistory = createInitialHistory(initialState)

  return {
    // Initial state
    drawingState: initialState,
    history: initialHistory,
    textEditing: {
      isEditing: null,
      initialValue: "",
      hasActiveEdit: false
    },
    tempElement: null,
    isDrawing: false,

    // Basic setters
    setTool: (tool: DrawingTool) => {
      set((state) => ({
        drawingState: { ...state.drawingState, tool }
      }))
    },

    setColor: (color: string) => {
      set((state) => ({
        drawingState: { ...state.drawingState, color }
      }))
    },

    setStrokeWidth: (width: number) => {
      set((state) => ({
        drawingState: { ...state.drawingState, strokeWidth: width }
      }))
    },

    setFontSize: (size: number) => {
      set((state) => ({
        drawingState: { ...state.drawingState, fontSize: size }
      }))
    },

    // Element operations
    addElement: (element: DrawingElement) => {
      set((state) => {
        try {
          if (!element || !element.id) {
            return state
          }

          // Check if element already exists
          const existingElement = state.drawingState.elements.find(
            (el) => el.id === element.id
          )
          if (existingElement) {
            return state
          }

          const newState = {
            ...state.drawingState,
            elements: [...state.drawingState.elements, element]
          }

          const newHistory = addToHistory(state.history, newState)

          return {
            drawingState: newState,
            history: newHistory
          }
        } catch {
          return state
        }
      })
    },

    updateElement: (id: string, updates: Partial<DrawingElement>) => {
      set((state) => {
        try {
          if (!id || !updates) {
            return state
          }

          const elementExists = state.drawingState.elements.some(
            (el) => el.id === id
          )
          if (!elementExists) {
            return state
          }

          const newState = {
            ...state.drawingState,
            elements: state.drawingState.elements.map((el) =>
              el.id === id ? ({ ...el, ...updates } as DrawingElement) : el
            )
          }

          return {
            drawingState: newState,
            history: addToHistory(state.history, newState)
          }
        } catch {
          return state
        }
      })
    },

    removeElement: (id: string) => {
      set((state) => {
        try {
          if (!id) {
            return state
          }

          const elementExists = state.drawingState.elements.some(
            (el) => el.id === id
          )
          if (!elementExists) {
            return state
          }

          const newState = {
            ...state.drawingState,
            elements: state.drawingState.elements.filter((el) => el.id !== id)
          }

          return {
            drawingState: newState,
            history: addToHistory(state.history, newState)
          }
        } catch {
          return state
        }
      })
    },

    setElements: (elements: DrawingElement[]) => {
      set((state) => {
        const newState = { ...state.drawingState, elements }
        return {
          drawingState: newState,
          history: addToHistory(state.history, newState)
        }
      })
    },

    // Temporary element operations
    setTempElement: (element: DrawingElement | null) => {
      set({ tempElement: element })
    },

    updateTempElement: (updates: Partial<DrawingElement>) => {
      set((state) => ({
        tempElement: state.tempElement
          ? ({ ...state.tempElement, ...updates } as DrawingElement)
          : null
      }))
    },

    finalizeTempElement: () => {
      const { tempElement, addElement } = get()
      if (tempElement) {
        addElement(tempElement)
        set({ tempElement: null, isDrawing: false })
      }
    },

    // History operations
    undo: () => {
      set((state) => {
        try {
          if (state.history.currentIndex > 0) {
            const newIndex = state.history.currentIndex - 1
            const previousState = state.history.states[newIndex]

            if (!previousState) {
              return state
            }

            return {
              drawingState: deepClone(previousState),
              history: { ...state.history, currentIndex: newIndex }
            }
          }
        } catch {
          // Error during undo operation
        }
        return state
      })
    },

    redo: () => {
      set((state) => {
        try {
          if (state.history.currentIndex < state.history.states.length - 1) {
            const newIndex = state.history.currentIndex + 1
            const nextState = state.history.states[newIndex]

            if (!nextState) {
              return state
            }

            return {
              drawingState: deepClone(nextState),
              history: { ...state.history, currentIndex: newIndex }
            }
          }
        } catch {
          // Error during redo operation
        }
        return state
      })
    },

    saveToHistory: () => {
      set((state) => ({
        history: addToHistory(state.history, state.drawingState)
      }))
    },

    saveStateToHistory: (newState: DrawingState) => {
      set((state) => ({
        drawingState: newState,
        history: addToHistory(state.history, newState)
      }))
    },

    canUndo: () => {
      const state = get()
      return state.history.currentIndex > 0
    },

    canRedo: () => {
      const state = get()
      return state.history.currentIndex < state.history.states.length - 1
    },

    // Text editing operations
    startTextEdit: (elementId: string, initialText: string) => {
      set({
        textEditing: {
          isEditing: elementId,
          initialValue: initialText,
          hasActiveEdit: true
        }
      })
    },

    updateTextLive: (elementId: string, text: string) => {
      get().updateElement(elementId, { text })
    },

    finishTextEdit: (elementId: string, finalText: string) => {
      const { textEditing, updateElement, saveToHistory } = get()

      if (finalText.trim() === "") {
        // Remove empty text
        get().removeElement(elementId)
      } else if (finalText !== textEditing.initialValue) {
        // Only save to history if text actually changed
        updateElement(elementId, { text: finalText })
        saveToHistory()
      }

      set({
        textEditing: {
          isEditing: null,
          initialValue: "",
          hasActiveEdit: false
        }
      })
    },

    cancelTextEdit: (elementId: string) => {
      const { textEditing } = get()

      if (
        textEditing.initialValue.trim() === "" ||
        textEditing.initialValue === DRAWING_CONSTANTS.TEXT_PLACEHOLDER
      ) {
        // Remove the element if it was newly created
        get().removeElement(elementId)
      } else {
        // Restore original text
        get().updateElement(elementId, { text: textEditing.initialValue })
      }

      set({
        textEditing: {
          isEditing: null,
          initialValue: "",
          hasActiveEdit: false
        }
      })
    },

    // Drawing session management
    startDrawing: () => {
      set({ isDrawing: true })
    },

    stopDrawing: () => {
      set({ isDrawing: false })
    },

    // Complete state management
    resetDrawing: () => {
      try {
        const initialState = createInitialState()
        const initialHistory = createInitialHistory(initialState)

        set((state) => ({
          drawingState: initialState,
          history: initialHistory,
          textEditing: {
            isEditing: null,
            initialValue: "",
            hasActiveEdit: false
          },
          tempElement: null,
          isDrawing: false
        }))
      } catch {
        // Try to at least clear the elements if full reset fails
        set((state) => ({
          ...state,
          drawingState: {
            ...state.drawingState,
            elements: []
          }
        }))
      }
    },

    initializeWithElements: (elements: DrawingElement[]) => {
      const newState = { ...get().drawingState, elements }
      set({
        drawingState: newState,
        history: createInitialHistory(newState)
      })
    }
  }
})
