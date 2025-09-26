import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Palette } from "lucide-react"
import { memo } from "react"
import { HexColorPicker } from "react-colorful"

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
            className="w-64 rounded-lg border border-gray-200 bg-white shadow-lg"
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
                <HexColorPicker
                  color={color}
                  onChange={onColorChange}
                  style={{ width: "100%", height: "120px" }}
                />
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => {
                      const value = e.target.value
                      if (isValidHexColor(value)) {
                        onColorChange(value)
                      }
                    }}
                    style={{
                      flex: 1,
                      borderRadius: "4px",
                      border: "1px solid #d1d5db",
                      padding: "4px 8px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      outline: "none"
                    }}
                    placeholder="#000000"
                    maxLength={7}
                  />
                </div>
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
