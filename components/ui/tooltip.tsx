"use client"

import { cn } from "@/lib/utils"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import * as React from "react"

interface TooltipPortalContextValue {
  portalContainer: HTMLElement | null
  setPortalContainer: (el: HTMLElement | null) => void
}

const TooltipPortalContext =
  React.createContext<TooltipPortalContextValue | null>(null)

const InternalTooltipProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [portalContainer, setPortalContainer] =
    React.useState<HTMLElement | null>(null)

  const value = React.useMemo(
    () => ({ portalContainer, setPortalContainer }),
    [portalContainer]
  )

  return (
    <TooltipPrimitive.Provider>
      <TooltipPortalContext.Provider value={value}>
        {children}
      </TooltipPortalContext.Provider>
    </TooltipPrimitive.Provider>
  )
}

const Tooltip = ({
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>): JSX.Element => {
  // Ensure a provider is present even if the caller forgets to add one
  return (
    <InternalTooltipProvider>
      <TooltipPrimitive.Root {...props}>{children}</TooltipPrimitive.Root>
    </InternalTooltipProvider>
  )
}

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ children, ...props }, forwardedRef) => {
  const ctx = React.useContext(TooltipPortalContext)
  const internalRef = React.useRef<React.ElementRef<
    typeof TooltipPrimitive.Trigger
  > | null>(null)

  React.useEffect(() => {
    if (!ctx) return
    const node = internalRef.current as unknown as HTMLElement | null
    if (!node) return

    const rootNode = node.getRootNode?.() as ShadowRoot | Document | undefined

    let container: HTMLElement | null = null

    if (rootNode instanceof ShadowRoot) {
      container = rootNode.querySelector<HTMLElement>(
        "[data-pixzlo-tooltip-portal]"
      )

      if (!container) {
        container = document.createElement("div")
        container.setAttribute("data-pixzlo-tooltip-portal", "true")
        container.style.zIndex = String(2147483651)
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
    (node: React.ElementRef<typeof TooltipPrimitive.Trigger> | null) => {
      internalRef.current = node
      if (typeof forwardedRef === "function") {
        forwardedRef(node)
      } else if (forwardedRef) {
        ;(
          forwardedRef as React.MutableRefObject<React.ElementRef<
            typeof TooltipPrimitive.Trigger
          > | null>
        ).current = node
      }
    },
    [forwardedRef]
  )

  return (
    <TooltipPrimitive.Trigger ref={setRefs} {...props}>
      {children}
    </TooltipPrimitive.Trigger>
  )
})

TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  const ctx = React.useContext(TooltipPortalContext)
  const container = ctx?.portalContainer ?? undefined

  return (
    <TooltipPrimitive.Portal container={container}>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-[2147483651] origin-[--radix-tooltip-content-transform-origin] overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-gray-100 shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
})

TooltipContent.displayName = TooltipPrimitive.Content.displayName

// Optional top-level provider export if the app wants to wrap once
const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  return <InternalTooltipProvider>{children}</InternalTooltipProvider>
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
