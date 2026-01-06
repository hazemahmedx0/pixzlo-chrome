// Element renderer components
export { ArrowElement } from "./arrow-element"
export { CircleElement } from "./circle-element"
export { PenElement } from "./pen-element"
export { RectangleElement } from "./rectangle-element"
export { TextElement } from "./text-element"

// Element registry (Open/Closed Principle)
export {
  registerElementRenderer,
  getElementRenderer,
  hasElementRenderer,
  getRegisteredElementTypes,
  clearElementRegistry,
  type ElementRendererProps,
  type ElementRenderer
} from "./element-registry"

// Auto-register all built-in elements
import "./register-elements"
