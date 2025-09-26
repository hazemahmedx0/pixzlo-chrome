import { cn } from "@/lib/utils"
import * as React from "react"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full min-w-0 rounded-md bg-gray-100 px-2 py-2 !text-paragraph-sm text-base outline-none transition-colors selection:bg-blue-500 selection:text-white file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-gray-400 hover:bg-gray-150 focus:bg-gray-150 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 md:text-sm",
          "",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
