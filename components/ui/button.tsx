import { cn } from "@/lib/utils"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2  whitespace-nowrap rounded-md !cursor-pointer !text-label-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-sky-500 text-primary-foreground shadow-xs hover:bg-sky-400",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        destructive_outline:
          " text-red-500 border border-red-500 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-gray-0 !hover:bg-gray-400 !border-separator bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30  dark:hover:bg-input/50",
        secondary: "bg-gray-100 text-secondary-foreground  hover:bg-gray-150",
        ghost:
          "hover:bg-transparent hover:text-accent-foreground dark:hover:bg-accent/50",
        fancyblue:
          "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-primary/90 py-2  h-10 rounded-full border bg-gradient-to-b from-[#58B4F0] to-[#58B4F1] px-4 text-sm font-medium text-white shadow-[0_1px_1px_rgb(6_118_184_/_0.08),_0_2px_2px_rgb(6_118_184_/_0.08),_inset_0_0.5px_0px_0.5px_rgb(255_255_255_/_0.14),_inset_0_-3px_0_-2px_rgb(255_255_255_/_0.08)] saturate-150 [text-shadow:0_1px_0_rgb(0_0_0_/_0.06)]",
        sky: "bg-sky-500 text-white  hover:bg-sky-400",

        link: "text-primary underline-offset-4 hover:underline text-label-sm"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3 ",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
