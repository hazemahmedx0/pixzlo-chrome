export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface ViewportInfo {
  width: number
  height: number
  scrollX: number
  scrollY: number
}

export interface SelectionArea {
  startPosition: Position
  endPosition: Position
  isSelecting: boolean
}

export interface FloatingToolbarProps {
  onClose: () => void
  onCapture: () => void
  onModeChange: (mode: "pointer" | "element" | "area" | "fullscreen") => void
  activeMode: "pointer" | "element" | "area" | "fullscreen"
}

export interface ImageCarouselProps {
  images: string[]
  activeIndex: number
  onImageSelect: (index: number) => void
}

export interface MetadataDisplayProps {
  url: string
  device: string
  browser: string
  screenResolution: string
  viewportSize: string
}
