import type { CaptureFrame } from '@/types/capture'
import { PADDING, MIN_WIDTH, MIN_HEIGHT } from '@/lib/constants'
import type { Rect } from '@/types/selection'

export const computeFrame = (rect: DOMRect): CaptureFrame => {
  const content: Rect = {
    left: rect.left - PADDING,
    top: rect.top - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2
  }

  const aspect = 16 / 9
  let width = Math.max(content.width, content.height * aspect)
  let height = width / aspect
  if (height < content.height) {
    height = content.height
    width = height * aspect
  }

  if (width < MIN_WIDTH) {
    width = MIN_WIDTH
    height = width / aspect
  }
  if (height < MIN_HEIGHT) {
    height = MIN_HEIGHT
    width = height * aspect
  }

  const centerX = content.left + content.width / 2
  const centerY = content.top + content.height / 2
  const frame: Rect = {
    left: centerX - width / 2,
    top: centerY - height / 2,
    width,
    height
  }

  return { frame, content }
}

export const cropImage = async (
  dataUrl: string,
  { frame, content }: CaptureFrame
): Promise<string> => {
  const img = new Image()
  img.src = dataUrl
  await new Promise((resolve) => (img.onload = resolve))

  const dpr = window.devicePixelRatio
  const canvas = document.createElement('canvas')
  canvas.width = frame.width * dpr
  canvas.height = frame.height * dpr
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const sx = Math.max(content.left, 0) * dpr
  const sy = Math.max(content.top, 0) * dpr
  const sWidth =
    (Math.min(viewportWidth, content.left + content.width) -
      Math.max(content.left, 0)) *
    dpr
  const sHeight =
    (Math.min(viewportHeight, content.top + content.height) -
      Math.max(content.top, 0)) *
    dpr

  const dx = (Math.max(content.left, 0) - frame.left) * dpr
  const dy = (Math.max(content.top, 0) - frame.top) * dpr

  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, sWidth, sHeight)

  return canvas.toDataURL('image/png')
}
