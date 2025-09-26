// Figma integration types
export interface FigmaAuthStatus {
  connected: boolean
  integration?: FigmaIntegration
  message?: string
}

export interface FigmaIntegration {
  id: string
  workspace_id: string
  integration_type: string
  configured_by: string
  is_active: boolean
  created_at: string
  updated_at: string
  integration_data: FigmaIntegrationData | null
}

export interface FigmaIntegrationData {
  type: string
  team_name?: string | null
  user_name: string
  expires_at: string
  teams_count: number
  access_scope: string
  connected_at: string
  access_token?: string // May be available in some contexts
}

export interface FigmaTeam {
  id: string
  name: string
}

export interface FigmaDesignLink {
  id: string
  website_id: string
  figma_file_id: string
  figma_frame_id: string
  frame_name?: string
  frame_url: string
  thumbnail_url?: string
  created_by: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface FigmaFile {
  key: string
  name: string
  thumbnail_url: string
  last_modified: string
  nodes: Record<string, FigmaNode>
}

export interface FigmaNode {
  id: string
  name: string
  type: string
  visible: boolean
  backgroundColor?: string
  fills?: FigmaFill[]
  strokes?: FigmaStroke[]
  effects?: FigmaEffect[]
  absoluteBoundingBox?: FigmaBoundingBox
  children?: FigmaNode[]
}

export interface FigmaBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FigmaFill {
  type: string
  color?: {
    r: number
    g: number
    b: number
    a: number
  }
  gradient?: FigmaGradient
}

export interface FigmaStroke {
  type: string
  color: {
    r: number
    g: number
    b: number
    a: number
  }
}

export interface FigmaEffect {
  type: string
  visible: boolean
  radius?: number
  color?: {
    r: number
    g: number
    b: number
    a: number
  }
}

export interface FigmaGradient {
  type: string
  gradientStops: FigmaGradientStop[]
}

export interface FigmaGradientStop {
  position: number
  color: {
    r: number
    g: number
    b: number
    a: number
  }
}

export interface FigmaDesignSelection {
  node: FigmaNode
  imageUrl: string
  boundingBox: FigmaBoundingBox
}

export interface FigmaAuthError {
  type: "AUTH_REQUIRED" | "INTEGRATION_MISSING" | "API_ERROR"
  message: string
}

export interface FigmaApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
