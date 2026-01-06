/**
 * Element Registration Module
 *
 * This module registers all built-in element renderers with the element registry.
 * Import this file once at application startup to ensure all elements are available.
 *
 * To add a new element type:
 * 1. Create the element interface in types/drawing.ts
 * 2. Create the renderer component in elements/
 * 3. Import and register it here
 */

import { registerElementRenderer } from "./element-registry"
import { ArrowElement } from "./arrow-element"
import { CircleElement } from "./circle-element"
import { PenElement } from "./pen-element"
import { RectangleElement } from "./rectangle-element"
import { TextElement } from "./text-element"

/**
 * Registers all built-in element renderers
 * Call this function once at application initialization
 */
export function registerAllElements(): void {
  // Register arrow element renderer
  registerElementRenderer("arrow", ArrowElement)

  // Register circle element renderer
  registerElementRenderer("circle", CircleElement)

  // Register pen/freehand element renderer
  registerElementRenderer("pen", PenElement)

  // Register rectangle element renderer
  registerElementRenderer("rectangle", RectangleElement)

  // Register text element renderer
  registerElementRenderer("text", TextElement)
}

// Auto-register on module load
registerAllElements()
