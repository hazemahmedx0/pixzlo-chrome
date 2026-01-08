/**
 * State Mapping Types
 *
 * Types for the smart state mapping feature that auto-selects Figma frames
 * based on DOM element conditions.
 */

/**
 * A single condition that checks for element presence
 */
export interface StateCondition {
  /** Unique identifier for this condition */
  id: string
  /** CSS selector to check for element presence */
  selector: string
  /** Human-readable label (e.g., "div.empty-state") */
  label: string
  /** Whether element should exist or not exist */
  operator: 'exists' | 'not_exists'
}

/**
 * A state mapping rule that maps conditions to a Figma frame
 */
export interface StateMappingRule {
  id: string
  websiteId: string
  pageUrl: string
  figmaLinkId: string
  figmaFrameName: string | undefined
  figmaFrameUrl: string | undefined
  figmaThumbnailUrl: string | undefined
  name: string
  description: string | undefined
  conditions: StateCondition[]
  conditionLogic: 'AND' | 'OR'
  priority: number
  createdBy: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

/**
 * Payload for creating a new state mapping rule
 */
export interface CreateStateMappingPayload {
  pageUrl: string
  figmaLinkId: string
  name: string
  description?: string
  conditions: StateCondition[]
  conditionLogic: 'AND' | 'OR'
  priority?: number
}

/**
 * Payload for updating an existing state mapping rule
 */
export interface UpdateStateMappingPayload {
  figmaLinkId?: string
  name?: string
  description?: string | null
  conditions?: StateCondition[]
  conditionLogic?: 'AND' | 'OR'
  priority?: number
  isActive?: boolean
}

/**
 * API response for state mapping operations
 */
export interface StateMappingResponse {
  success: boolean
  rule?: StateMappingRule
  rules?: StateMappingRule[]
  error?: string
  message?: string
}

/**
 * Result of evaluating state mapping rules
 */
export interface StateMappingEvaluationResult {
  /** The matched rule, if any */
  matchedRule: StateMappingRule | null
  /** All rules that were evaluated */
  evaluatedRules: Array<{
    rule: StateMappingRule
    conditionResults: Array<{
      condition: StateCondition
      matched: boolean
    }>
    overallMatch: boolean
  }>
}

/**
 * State for the state mapping flow UI
 */
export type StateMappingFlowStep =
  | 'idle'
  | 'selecting-element'
  | 'configuring-rule'
  | 'selecting-frame'
  | 'saving'

export interface StateMappingFlowState {
  step: StateMappingFlowStep
  selectedConditions: StateCondition[]
  ruleName: string
  conditionLogic: 'AND' | 'OR'
  selectedFigmaLinkId: string | null
  error: string | null
}

/**
 * Message types for communication between popup/content script and background
 */
export type StateMappingMessageType =
  | 'FETCH_STATE_MAPPING_RULES'
  | 'CREATE_STATE_MAPPING_RULE'
  | 'UPDATE_STATE_MAPPING_RULE'
  | 'DELETE_STATE_MAPPING_RULE'
  | 'EVALUATE_STATE_MAPPING_RULES'
  | 'START_STATE_MAPPING_SELECTION'

export interface StateMappingMessage {
  type: StateMappingMessageType
  payload?: unknown
}

/**
 * Selected element info from the page
 */
export interface SelectedElementInfo {
  selector: string
  label: string
  tagName: string
  className: string
  id: string | null
  textContent: string | null
  rect: {
    x: number
    y: number
    width: number
    height: number
  }
}
