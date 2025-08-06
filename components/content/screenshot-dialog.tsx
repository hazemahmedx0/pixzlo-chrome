import type { FC } from 'react'
import type { ScreenshotPair } from '@/types/capture'

interface ScreenshotDialogProps {
  images: ScreenshotPair
  onClose: () => void
}

const ScreenshotDialog: FC<ScreenshotDialogProps> = ({ images, onClose }) => {
  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/75">
      <div className="relative flex gap-4">
        <img
          src={images.highlighted}
          alt="Highlighted selection"
          className="max-h-[80vh] max-w-[40vw] rounded"
        />
        <img
          src={images.plain}
          alt="Plain selection"
          className="max-h-[80vh] max-w-[40vw] rounded"
        />
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
