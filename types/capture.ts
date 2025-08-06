import type { Rect } from './selection'

export interface CaptureFrame {
  frame: Rect
  content: Rect
}

export interface ScreenshotPair {
  highlighted: string
  plain: string
}
