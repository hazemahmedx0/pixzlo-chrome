/**
 * State Mapping Store
 *
 * Zustand store for managing state mapping rules.
 * Handles fetching, creating, evaluating, and deleting rules.
 */

import { elementExists } from '@/lib/selector-generator'
import type {
  CreateStateMappingPayload,
  StateCondition,
  StateMappingEvaluationResult,
  StateMappingFlowState,
  StateMappingFlowStep,
  StateMappingRule,
} from '@/types/state-mapping'
import { create } from 'zustand'

// ============================================================================
// Types
// ============================================================================

interface StateMappingState {
  // Rules data
  rules: StateMappingRule[]
  isLoading: boolean
  error: string | undefined
  lastFetchedAt: number | null
  lastFetchedPageUrl: string | null

  // Flow state for creating new rules
  flowState: StateMappingFlowState

  // Actions - Data fetching
  fetchRules: (pageUrl: string, options?: { force?: boolean }) => Promise<void>
  createRule: (payload: CreateStateMappingPayload) => Promise<StateMappingRule | null>
  deleteRule: (ruleId: string) => Promise<boolean>

  // Actions - Rule evaluation
  evaluateRules: () => StateMappingEvaluationResult

  // Actions - Flow management
  startFlow: () => void
  setFlowStep: (step: StateMappingFlowStep) => void
  addCondition: (condition: StateCondition) => void
  removeCondition: (conditionId: string) => void
  setRuleName: (name: string) => void
  setConditionLogic: (logic: 'AND' | 'OR') => void
  setSelectedFigmaLinkId: (linkId: string | null) => void
  setFlowError: (error: string | null) => void
  resetFlow: () => void

  // Reset
  reset: () => void
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

const initialFlowState: StateMappingFlowState = {
  step: 'idle',
  selectedConditions: [],
  ruleName: '',
  conditionLogic: 'AND',
  selectedFigmaLinkId: null,
  error: null,
}

// ============================================================================
// Store
// ============================================================================

export const useStateMappingStore = create<StateMappingState>((set, get) => ({
  // Initial state
  rules: [],
  isLoading: false,
  error: undefined,
  lastFetchedAt: null,
  lastFetchedPageUrl: null,
  flowState: { ...initialFlowState },

  // ========================================================================
  // Data Fetching Actions
  // ========================================================================

  fetchRules: async (pageUrl: string, options?: { force?: boolean }) => {
    const state = get()

    // Skip if already loading
    if (state.isLoading) return

    // Use cache if fresh and same page
    if (
      !options?.force &&
      state.lastFetchedAt &&
      Date.now() - state.lastFetchedAt < CACHE_DURATION &&
      state.lastFetchedPageUrl === pageUrl
    ) {
      console.log('📋 Using cached state mapping rules for:', pageUrl)
      return
    }

    set({ isLoading: true, error: undefined })

    try {
      const response = await new Promise<{
        success: boolean
        rules?: StateMappingRule[]
        error?: string
      }>((resolve) => {
        if (!chrome?.runtime?.sendMessage) {
          resolve({ success: false, error: 'Extension context not available' })
          return
        }

        chrome.runtime.sendMessage(
          { type: 'FETCH_STATE_MAPPING_RULES', payload: { pageUrl } },
          (backgroundResponse) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message || 'Extension communication error',
              })
            } else {
              resolve(backgroundResponse || { success: false, error: 'No response' })
            }
          },
        )
      })

      if (response.success && response.rules) {
        set({
          rules: response.rules,
          lastFetchedAt: Date.now(),
          lastFetchedPageUrl: pageUrl,
          isLoading: false,
          error: undefined,
        })
        console.log('✅ State mapping rules fetched:', response.rules.length)
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to fetch state mapping rules',
        })
      }
    } catch (error) {
      console.error('❌ Error fetching state mapping rules:', error)
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  },

  createRule: async (payload: CreateStateMappingPayload) => {
    set({ isLoading: true, error: undefined })

    try {
      const response = await new Promise<{
        success: boolean
        rule?: StateMappingRule
        error?: string
      }>((resolve) => {
        if (!chrome?.runtime?.sendMessage) {
          resolve({ success: false, error: 'Extension context not available' })
          return
        }

        chrome.runtime.sendMessage(
          { type: 'CREATE_STATE_MAPPING_RULE', payload },
          (backgroundResponse) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message || 'Extension communication error',
              })
            } else {
              resolve(backgroundResponse || { success: false, error: 'No response' })
            }
          },
        )
      })

      if (response.success && response.rule) {
        // Add to local rules list
        set((state) => ({
          rules: [response.rule!, ...state.rules],
          isLoading: false,
          error: undefined,
        }))
        console.log('✅ State mapping rule created:', response.rule.name)
        return response.rule
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to create state mapping rule',
        })
        return null
      }
    } catch (error) {
      console.error('❌ Error creating state mapping rule:', error)
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return null
    }
  },

  deleteRule: async (ruleId: string) => {
    try {
      const response = await new Promise<{
        success: boolean
        error?: string
      }>((resolve) => {
        if (!chrome?.runtime?.sendMessage) {
          resolve({ success: false, error: 'Extension context not available' })
          return
        }

        chrome.runtime.sendMessage(
          { type: 'DELETE_STATE_MAPPING_RULE', payload: { ruleId } },
          (backgroundResponse) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message || 'Extension communication error',
              })
            } else {
              resolve(backgroundResponse || { success: false, error: 'No response' })
            }
          },
        )
      })

      if (response.success) {
        // Remove from local rules list
        set((state) => ({
          rules: state.rules.filter((r) => r.id !== ruleId),
        }))
        console.log('✅ State mapping rule deleted:', ruleId)
        return true
      } else {
        console.error('❌ Failed to delete rule:', response.error)
        return false
      }
    } catch (error) {
      console.error('❌ Error deleting state mapping rule:', error)
      return false
    }
  },

  // ========================================================================
  // Rule Evaluation
  // ========================================================================

  evaluateRules: () => {
    const { rules } = get()

    // Sort by priority (highest first), then by condition count (more specific first)
    const sortedRules = [...rules]
      .filter((r) => r.isActive)
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority
        return b.conditions.length - a.conditions.length
      })

    const evaluatedRules: StateMappingEvaluationResult['evaluatedRules'] = []
    let matchedRule: StateMappingRule | null = null

    for (const rule of sortedRules) {
      const conditionResults = rule.conditions.map((condition) => {
        const exists = elementExists(condition.selector)
        const matched =
          condition.operator === 'exists' ? exists : !exists

        return {
          condition,
          matched,
        }
      })

      const overallMatch =
        rule.conditionLogic === 'AND'
          ? conditionResults.every((r) => r.matched)
          : conditionResults.some((r) => r.matched)

      evaluatedRules.push({
        rule,
        conditionResults,
        overallMatch,
      })

      // First matching rule wins
      if (overallMatch && !matchedRule) {
        matchedRule = rule
      }
    }

    console.log('🎯 State mapping evaluation:', {
      totalRules: rules.length,
      matchedRule: matchedRule?.name ?? 'none',
    })

    return {
      matchedRule,
      evaluatedRules,
    }
  },

  // ========================================================================
  // Flow Management Actions
  // ========================================================================

  startFlow: () => {
    set({
      flowState: {
        ...initialFlowState,
        step: 'selecting-element',
      },
    })
  },

  setFlowStep: (step: StateMappingFlowStep) => {
    set((state) => ({
      flowState: {
        ...state.flowState,
        step,
        error: null,
      },
    }))
  },

  addCondition: (condition: StateCondition) => {
    set((state) => ({
      flowState: {
        ...state.flowState,
        selectedConditions: [...state.flowState.selectedConditions, condition],
        step: 'configuring-rule',
      },
    }))
  },

  removeCondition: (conditionId: string) => {
    set((state) => ({
      flowState: {
        ...state.flowState,
        selectedConditions: state.flowState.selectedConditions.filter(
          (c) => c.id !== conditionId,
        ),
      },
    }))
  },

  setRuleName: (name: string) => {
    set((state) => ({
      flowState: {
        ...state.flowState,
        ruleName: name,
      },
    }))
  },

  setConditionLogic: (logic: 'AND' | 'OR') => {
    set((state) => ({
      flowState: {
        ...state.flowState,
        conditionLogic: logic,
      },
    }))
  },

  setSelectedFigmaLinkId: (linkId: string | null) => {
    set((state) => ({
      flowState: {
        ...state.flowState,
        selectedFigmaLinkId: linkId,
      },
    }))
  },

  setFlowError: (error: string | null) => {
    set((state) => ({
      flowState: {
        ...state.flowState,
        error,
      },
    }))
  },

  resetFlow: () => {
    set({
      flowState: { ...initialFlowState },
    })
  },

  // ========================================================================
  // Reset
  // ========================================================================

  reset: () => {
    set({
      rules: [],
      isLoading: false,
      error: undefined,
      lastFetchedAt: null,
      lastFetchedPageUrl: null,
      flowState: { ...initialFlowState },
    })
  },
}))
