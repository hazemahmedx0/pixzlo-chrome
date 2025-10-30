import { cn } from "@/lib/utils"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import * as React from "react"

interface PopoverPortalContextValue {
  portalContainer: HTMLElement | null
  setPortalContainer: (container: HTMLElement | null) => void
}

const PopoverPortalContext =
  React.createContext<PopoverPortalContextValue | null>(null)

const InternalPopoverProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [portalContainer, setPortalContainer] =
    React.useState<HTMLElement | null>(null)

  const value = React.useMemo(
    () => ({ portalContainer, setPortalContainer }),
    [portalContainer]
  )

  return (
    <PopoverPortalContext.Provider value={value}>
      {children}
    </PopoverPortalContext.Provider>
  )
}

const Popover = ({
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>): JSX.Element => {
  return (
    <InternalPopoverProvider>
      <PopoverPrimitive.Root {...props}>{children}</PopoverPrimitive.Root>
    </InternalPopoverProvider>
  )
}

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>((props, forwardedRef) => {
  const ctx = React.useContext(PopoverPortalContext)
  const internalRef = React.useRef<React.ElementRef<
    typeof PopoverPrimitive.Trigger
  > | null>(null)

  React.useEffect(() => {
    if (!ctx) return

    const node = internalRef.current as unknown as HTMLElement | null
    if (!node) return

    const rootNode = node.getRootNode?.() as ShadowRoot | Document | undefined

    let container: HTMLElement | null = null

    if (rootNode instanceof ShadowRoot) {
      container = rootNode.querySelector<HTMLElement>(
        "[data-pixzlo-popover-portal]"
      )

      if (!container) {
        container = document.createElement("div")
        container.setAttribute("data-pixzlo-popover-portal", "true")
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
    (node: React.ElementRef<typeof PopoverPrimitive.Trigger> | null) => {
      internalRef.current = node
      if (typeof forwardedRef === "function") {
        forwardedRef(node)
      } else if (forwardedRef) {
        ;(
          forwardedRef as React.MutableRefObject<React.ElementRef<
            typeof PopoverPrimitive.Trigger
          > | null>
        ).current = node
      }
    },
    [] // Remove forwardedRef from dependencies to prevent infinite loops
  )

  return <PopoverPrimitive.Trigger ref={setRefs} {...props} />
})

PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => {
  const ctx = React.useContext(PopoverPortalContext)
  const container = ctx?.portalContainer ?? undefined

  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[2147483650] w-72 origin-[--radix-popover-content-transform-origin] rounded-md border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
