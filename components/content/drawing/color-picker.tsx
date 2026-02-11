"use client"

import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { memo, useCallback, useState } from "react"

interface ColorPickerProps {
  color: string
  onColorChange: (color: string) => void
  className?: string
}

const PALETTE_COLORS = [
  "#1e1e1e",
  "#f24822",
  "#ff9e42",
  "#ffc943",
  "#66d575",
  "#3dadff",
  "#874fff",
  "#ffffff"
] as const

/**
 * Darkens a hex color by a given percentage (0–100).
 * Returns a hex string like "#rrggbb".
 */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.max(0, Math.round(((num >> 16) & 0xff) * (1 - percent / 100)))
  const g = Math.max(0, Math.round(((num >> 8) & 0xff) * (1 - percent / 100)))
  const b = Math.max(0, Math.round((num & 0xff) * (1 - percent / 100)))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}

const ColorPicker = memo(
  ({ color, onColorChange }: ColorPickerProps) => {
    const [open, setOpen] = useState(false)

    const handleSelect = useCallback(
      (c: string) => {
        onColorChange(c)
        setOpen(false)
      },
      [onColorChange]
    )

    return (
      <Popover open={open} onOpenChange={setOpen}>
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
          className="w-auto rounded-[13px] border-0 bg-[var(--color-white-solid,#FFF)] p-2.5"
          align="start"
          side="bottom"
          sideOffset={4}
          style={{
            zIndex: 2147483647,
            boxShadow:
              "0 3px 5.9px -1.5px rgba(0, 0, 0, 0.05), 0 1px 2.1px 0 rgba(0, 0, 0, 0.05), 0 0 0 0.5px rgba(0, 0, 0, 0.18)"
          }}>
          <div className="grid grid-cols-4 gap-2">
            {PALETTE_COLORS.map((paletteColor) => {
              const isSelected =
                color.toLowerCase() === paletteColor.toLowerCase()
              const innerBorder = darkenColor(paletteColor, 5)
              const isWhite = paletteColor === "#ffffff"

              return (
                <button
                  key={paletteColor}
                  type="button"
                  onClick={() => handleSelect(paletteColor)}
                  className="relative flex h-[28px] w-[28px] items-center justify-center focus:outline-none"
                  title={paletteColor}
                  aria-label={`Select color ${paletteColor}`}
                  aria-pressed={isSelected}>
                  {/* Selection ring */}
                  {isSelected && (
                    <span
                      className="pointer-events-none absolute inset-0 rounded-full"
                      style={{
                        boxShadow: `0 0 0 1.5px ${isWhite ? "#a0a0a0" : paletteColor}`,
                        top: -3,
                        left: -3,
                        right: -3,
                        bottom: -3
                      }}
                    />
                  )}

                  {/* Color circle */}
                  <span
                    className="block h-[28px] w-[28px] rounded-full"
                    style={{
                      backgroundColor: paletteColor,
                      boxShadow: isWhite
                        ? `inset 0 0 0 1.5px ${innerBorder}, inset 0 0 0 1px rgba(0, 0, 0, 0.12)`
                        : `inset 0 0 0 1.5px ${innerBorder}`
                    }}
                  />
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    )
  }
)

ColorPicker.displayName = "ColorPicker"

export default ColorPicker
