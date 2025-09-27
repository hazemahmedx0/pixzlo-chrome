import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Palette } from "lucide-react"
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
      <div className={`flex items-center gap-2 ${className}`}>
        <Palette size={16} className="text-gray-500" />

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-8 w-8 rounded-full border-2 border-gray-300 transition-all hover:scale-110 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{ backgroundColor: color }}
              title={`Current color: ${color}`}
              aria-label="Open color picker"
            />
          </PopoverTrigger>

          <PopoverContent
            className="w-auto rounded-lg border border-gray-200 !bg-white shadow-lg"
            align="start"
            side="bottom"
            sideOffset={8}
            style={{ zIndex: 2147483647 }}>
            <div
              style={{
                backgroundColor: "#ffffff",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}>
              {/* Main 4 Colors - No heading, just the colors */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "8px"
                }}>
                {[
                  { color: "#ef4444", name: "Red" },
                  { color: "#3b82f6", name: "Blue" },
                  { color: "#22c55e", name: "Green" },
                  { color: "#06b6d4", name: "Cyan" }
                ].map(({ color: colorOption, name }) => (
                  <div
                    key={colorOption}
                    onClick={() => onColorChange(colorOption)}
                    style={{
                      backgroundColor: colorOption,
                      border: `2px solid ${color === colorOption ? "#1f2937" : "#d1d5db"}`,
                      width: "40px",
                      height: "40px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      backgroundImage: "none",
                      backgroundRepeat: "no-repeat",
                      transform:
                        color === colorOption ? "scale(1.1)" : "scale(1)",
                      boxShadow:
                        color === colorOption ? "0 0 0 2px #3b82f6" : "none"
                    }}
                    title={`${name}: ${colorOption}`}
                    aria-label={`Select ${name} color`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        onColorChange(colorOption)
                      }
                    }}
                  />
                ))}
              </div>

              {/* Color Spectrum Picker */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}>
                <SketchPicker
                  color={color}
                  onChange={(colorResult) => {
                    onColorChange(colorResult.hex)
                  }}
                  disableAlpha
                  presetColors={[
                    "#ef4444",
                    "#3b82f6",
                    "#22c55e",
                    "#06b6d4",
                    "#f59e0b",
                    "#8b5cf6",
                    "#ec4899",
                    "#6b7280",
                    "#000000",
                    "#ffffff"
                  ]}
                  styles={{
                    default: {
                      picker: {
                        width: "220px",
                        boxShadow: "none",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        fontFamily: "inherit"
                      }
                    }
                  }}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)

ColorPicker.displayName = "ColorPicker"

export default ColorPicker
