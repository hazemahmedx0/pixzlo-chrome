import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { memo } from "react"
import { SketchPicker } from "react-color"

import { EXTENDED_COLORS, isValidHexColor, MAIN_COLORS } from "./drawing-utils"

interface ColorPickerProps {
  color: string
  onColorChange: (color: string) => void
  className?: string
}

const ColorPicker = memo(
  ({ color, onColorChange, className = "" }: ColorPickerProps) => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md p-[3px] transition-colors hover:bg-gray-100 focus:outline-none"
            title={`Current color: ${color}`}
            aria-label="Open color picker">
            <span
              className="size-[18px] rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.22)"
              }}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto rounded-[13px] border-0 bg-[var(--color-white-solid,#FFF)] p-3"
          align="start"
          side="bottom"
          sideOffset={4}
          style={{
            zIndex: 2147483647,
            boxShadow:
              "0 3px 5.9px -1.5px rgba(0, 0, 0, 0.05), 0 1px 2.1px 0 rgba(0, 0, 0, 0.05), 0 0 0 0.5px rgba(0, 0, 0, 0.18)"
          }}>
          <SketchPicker
            color={color}
            onChange={(colorResult) => {
              onColorChange(colorResult.hex)
            }}
            disableAlpha
            presetColors={[]}
            styles={{
              default: {
                picker: {
                  width: "220px",
                  boxShadow: "none",
                  border: "none",
                  borderRadius: "0",
                  fontFamily: "inherit",
                  background: "transparent",
                  padding: "0"
                }
              }
            }}
          />
        </PopoverContent>
      </Popover>
    )
  }
)

ColorPicker.displayName = "ColorPicker"

export default ColorPicker
