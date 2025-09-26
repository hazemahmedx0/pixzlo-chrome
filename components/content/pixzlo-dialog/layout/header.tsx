import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { X } from "lucide-react"
import { memo } from "react"

interface HeaderProps {
  onClose: () => void
}

const Header = memo(({ onClose }: HeaderProps): JSX.Element => {
  return (
    <header className="border-separator flex h-14 items-center justify-between border border-b p-5 text-paragraph-md text-gray-850">
      <Tooltip>
        <TooltipTrigger asChild>
          <span>Create an issue</span>
        </TooltipTrigger>
        <TooltipContent sideOffset={5}>Add to library</TooltipContent>
      </Tooltip>

      <button
        onClick={onClose}
        className="relative flex h-8 w-8 items-center justify-center rounded-sm text-gray-600 hover:bg-gray-100"
        aria-label="Close dialog">
        <X size={16} />
      </button>
    </header>
  )
})

Header.displayName = "PixzloDialogHeader"

export default Header
