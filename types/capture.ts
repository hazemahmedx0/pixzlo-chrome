import type { Rect } from "./selection"

export interface CaptureFrame {
  frame: Rect
  content: Rect
}

export interface ScreenshotPair {
  highlighted: string
  plain: string
}

export interface Screenshot {
  dataUrl: string
  timestamp: number
  type: CaptureType
  metadata?: {
    url: string
    device: string
    browser: string
    screenResolution: string
    viewportSize: string
  }
}

export type CaptureType = "area" | "fullscreen" | "element"

export interface CaptureOptions {
  type: CaptureType
  includeMetadata?: boolean
}

export interface IssueData {
  title: string
  description: string
  priority: "low" | "medium" | "high" | "urgent"
  screenshots: Screenshot[]
  metadata: {
    url: string
    device: string
    browser: string
    screenResolution: string
    viewportSize: string
  }
}
