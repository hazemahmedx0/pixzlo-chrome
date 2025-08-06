export const PADDING = 40

import type { Rect } from "@/types/selection"

export const computeCaptureRect = (
  rect: DOMRect
): Rect => {
  const padded = {
    left: rect.left - PADDING,
    top: rect.top - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2
  }

  const aspect = 16 / 9
  let width = Math.max(padded.width, padded.height * aspect)
  let height = width / aspect
  if (height < padded.height) {
    height = padded.height
    width = height * aspect
  }

  const centerX = padded.left + padded.width / 2
  const centerY = padded.top + padded.height / 2
  const left = centerX - width / 2
  const top = centerY - height / 2
  return { left, top, width, height }
}

export const cropImage = async (
  dataUrl: string,
  rect: Rect
): Promise<string> => {
  const img = new Image()
  img.src = dataUrl
  await new Promise((resolve) => (img.onload = resolve))

  const dpr = window.devicePixelRatio
  const canvas = document.createElement('canvas')
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const sx = Math.max(rect.left, 0) * dpr
  const sy = Math.max(rect.top, 0) * dpr
  const sWidth =
    Math.min(viewportWidth - rect.left, rect.width) * dpr - Math.max(0, -rect.left) * dpr
  const sHeight =
    Math.min(viewportHeight - rect.top, rect.height) * dpr - Math.max(0, -rect.top) * dpr

  ctx.drawImage(
    img,
    sx,
    sy,
    sWidth,
    sHeight,
    (Math.max(0, rect.left) - rect.left) * dpr,
    (Math.max(0, rect.top) - rect.top) * dpr,
    sWidth,
    sHeight
  )

  return canvas.toDataURL('image/png')
}
