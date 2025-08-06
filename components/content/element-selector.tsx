import { useEffect, useRef, useState } from 'react'

import { computeCaptureRect, cropImage } from '@/lib/capture'

const ElementSelector = () => {
  const [active, setActive] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const currentRect = useRef<DOMRect | null>(null)

  useEffect(() => {
    const listener = (message: { type?: string }) => {
      if (message.type === 'start-element-selection') {
        setActive(true)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  useEffect(() => {
    if (!active) return
    const overlay = overlayRef.current!

    const onMove = (e: MouseEvent) => {
      overlay.style.pointerEvents = 'none'
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      overlay.style.pointerEvents = 'auto'
      const highlight = highlightRef.current!
      if (!el || el === overlay) {
        highlight.style.display = 'none'
        return
      }
      const rect = el.getBoundingClientRect()
      currentRect.current = rect
      highlight.style.display = 'block'
      highlight.style.left = `${rect.left}px`
      highlight.style.top = `${rect.top}px`
      highlight.style.width = `${rect.width}px`
      highlight.style.height = `${rect.height}px`
    }

    const endSelection = () => {
      setActive(false)
    }

    const onClick = async (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = currentRect.current
      if (!rect) return
      const captureRect = computeCaptureRect(rect)
      chrome.runtime.sendMessage({ type: 'capture-screen' }, async (res) => {
        if (res?.dataUrl) {
          const url = await cropImage(res.dataUrl, captureRect)
          window.open(url)
        }
      })
      endSelection()
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
    }

    overlay.addEventListener('mousemove', onMove)
    overlay.addEventListener('click', onClick)
    overlay.addEventListener('wheel', onWheel, { passive: false })
    overlay.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      endSelection()
    })

    return () => {
      overlay.removeEventListener('mousemove', onMove)
      overlay.removeEventListener('click', onClick)
      overlay.removeEventListener('wheel', onWheel)
    }
  }, [active])

  if (!active) return null

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[2147483647] cursor-crosshair">
      <div
        ref={highlightRef}
        className="pointer-events-none absolute border-2 border-blue-500 bg-blue-500/20"
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default ElementSelector
