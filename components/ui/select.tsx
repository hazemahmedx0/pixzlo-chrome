"use client"

import { cn } from "@/lib/utils"
import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import * as React from "react"

interface SelectPortalContextValue {
  portalContainer: HTMLElement | null
  setPortalContainer: (el: HTMLElement | null) => void
}

const SelectPortalContext = React.createContext<SelectPortalContextValue | null>(
  null
)

function Select({
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(
    null
  )

  const contextValue = React.useMemo(
    () => ({ portalContainer, setPortalContainer }),
    [portalContainer]
  )

  return (
    <SelectPortalContext.Provider value={contextValue}>
      <SelectPrimitive.Root data-slot="select" {...props}>
        {children}
      </SelectPrimitive.Root>
    </SelectPortalContext.Provider>
  )
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof SelectPrimitive.Trigger> & {
    size?: "sm" | "default"
  }
>(({ className, size = "default", children, ...props }, forwardedRef) => {
  const ctx = React.useContext(SelectPortalContext)
  const internalRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    if (!ctx) return
    const node = internalRef.current
    if (!node) return

    const rootNode = node.getRootNode?.() as ShadowRoot | Document | undefined

    let container: HTMLElement | null = null

    if (rootNode instanceof ShadowRoot) {
      container = rootNode.querySelector<HTMLElement>(
        "[data-pixzlo-select-portal]"
      )

      if (!container) {
        container = document.createElement("div")
        container.setAttribute("data-pixzlo-select-portal", "true")
        container.style.zIndex = String(2147483650)
        rootNode.appendChild(container)
      }
    } else if (rootNode instanceof Document) {
      container = rootNode.body
    } else {
      container = document.body
    }

    ctx.setPortalContainer(container)

    return () => {
      ctx.setPortalContainer(null)
    }
  }, [ctx])

  const setRefs = React.useCallback(
    (node: HTMLButtonElement | null) => {
      internalRef.current = node
      if (typeof forwardedRef === "function") {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }
    },
    [forwardedRef]
  )

  return (
    <SelectPrimitive.Trigger
      ref={setRefs}
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex w-fit items-center justify-between gap-2 whitespace-nowrap rounded-md bg-gray-100 px-3 py-2 text-sm outline-none transition-[color,box-shadow] hover:bg-gray-150 focus:bg-gray-150 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 data-[placeholder]:text-muted-foreground *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:hover:bg-input/50 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})

SelectTrigger.displayName = "SelectTrigger"

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const ctx = React.useContext(SelectPortalContext)
  const container = ctx?.portalContainer ?? undefined

  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "shadow-dropdown select-menu max-h-(--radix-select-content-available-height) origin-(--radix-select-content-transform-origin) relative z-50 min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md bg-white text-gray-900 border border-gray-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
          )}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "outline-hidden *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm focus:bg-gray-100 focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}>
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}>
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}>
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue
}
