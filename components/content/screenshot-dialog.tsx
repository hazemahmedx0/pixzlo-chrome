import type { FC } from 'react'

interface ScreenshotDialogProps {
  src: string
  onClose: () => void
}

const ScreenshotDialog: FC<ScreenshotDialogProps> = ({ src, onClose }) => {
  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/75">
      <div className="relative">
        <img src={src} alt="Selected element" className="max-h-[80vh] max-w-[80vw] rounded" />
        <button
          className="absolute right-2 top-2 rounded bg-white/80 px-2 py-1 text-sm"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default ScreenshotDialog
