/**
 * Types Module Index
 *
 * Centralizes all type exports for the Pixzlo extension.
 * Import types from '@/types' for convenience.
 */

// Capture types - screenshot and issue data
export type {
  CaptureFrame,
  ScreenshotPair,
  Screenshot,
  CaptureType,
  CaptureOptions,
  IssueData
} from "./capture"

// Drawing types - canvas and annotation elements
export type {
  DrawingTool,
  DrawingPoint,
  BaseDrawingElement,
  ArrowElement,
  TextElement,
  PenElement,
  RectangleElement,
  CircleElement,
  DrawingElement,
  DrawingState,
  DrawingCanvasProps
} from "./drawing"

// Figma integration types
export type {
  FigmaAuthStatus,
  FigmaIntegration,
  FigmaIntegrationData,
  FigmaTeam,
  FigmaDesignLink,
  FigmaFile,
  FigmaNode,
  FigmaBoundingBox,
  FigmaFill,
  FigmaStroke,
  FigmaEffect,
  FigmaGradient,
  FigmaGradientStop,
  FigmaDesignSelection,
  FigmaAuthError,
  FigmaApiResponse
} from "./figma"

// Linear integration types
export type {
  LinearIntegrationData,
  IntegrationStatusResponse,
  LinearIssueCreateRequest,
  LinearIssueResponse
} from "./integration"

// User profile types
export type { Workspace, Profile } from "./profile"

// Selection types
export type { Rect } from "./selection"

// UI types
export type {
  Position,
  Size,
  ViewportInfo,
  SelectionArea,
  FloatingToolbarProps,
  ImageCarouselProps,
  MetadataDisplayProps
} from "./ui"
