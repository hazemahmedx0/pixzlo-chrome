/**
 * Element Registry - Open/Closed Principle Implementation
 *
 * This registry allows new drawing element types to be added without modifying
 * existing code. Each element type is registered with its renderer component.
 *
 * To add a new element type:
 * 1. Create the element interface in types/drawing.ts
 * 2. Create the renderer component in elements/
 * 3. Register it here using registerElementRenderer()
 */

import type { ComponentType } from "react"

import type { DrawingElement, DrawingTool } from "@/types/drawing"

/**
 * Props interface for element renderer components
 */
export interface ElementRendererProps<T extends DrawingElement = DrawingElement> {
  element: T
}

/**
 * Type for element renderer components
 */
export type ElementRenderer<T extends DrawingElement = DrawingElement> = ComponentType<
  ElementRendererProps<T>
>

/**
 * Registry mapping element types to their renderer components
 */
const elementRendererRegistry = new Map<DrawingTool, ElementRenderer>()

/**
 * Registers an element renderer for a specific element type
 * @param type - The drawing tool/element type
 * @param renderer - The React component that renders this element type
 */
export function registerElementRenderer<T extends DrawingElement>(
  type: DrawingTool,
  renderer: ElementRenderer<T>
): void {
  if (elementRendererRegistry.has(type)) {
    console.warn(`Element renderer for type "${type}" is being overwritten`)
  }
  elementRendererRegistry.set(type, renderer as ElementRenderer)
}

/**
 * Gets the renderer component for a specific element type
 * @param type - The drawing tool/element type
 * @returns The renderer component or undefined if not registered
 */
export function getElementRenderer(type: DrawingTool): ElementRenderer | undefined {
  return elementRendererRegistry.get(type)
}

/**
 * Checks if a renderer is registered for a specific element type
 * @param type - The drawing tool/element type
 * @returns True if a renderer is registered
 */
export function hasElementRenderer(type: DrawingTool): boolean {
  return elementRendererRegistry.has(type)
}

/**
 * Gets all registered element types
 * @returns Array of registered element types
 */
export function getRegisteredElementTypes(): DrawingTool[] {
  return Array.from(elementRendererRegistry.keys())
}

/**
 * Clears all registered renderers (useful for testing)
 */
export function clearElementRegistry(): void {
  elementRendererRegistry.clear()
}
