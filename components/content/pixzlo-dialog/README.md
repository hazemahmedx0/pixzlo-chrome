# PixzloDialog Component Architecture

This directory contains the modularized version of the PixzloDialog component, split into multiple manageable files for better maintenance and code organization.

## Structure

### Core Files

- `index.tsx` - Main dialog component that orchestrates all parts
- `components.ts` - Re-exports for easy importing

### Sub-Components

- `header.tsx` - Dialog header with close button
- `image-section.tsx` - Left panel containing screenshot preview and thumbnails
- `form-section.tsx` - Title and description form fields
- `tabs-section.tsx` - Tab container managing styling and info tabs
- `styling-tab.tsx` - CSS properties table display
- `info-tab.tsx` - Page metadata display
- `footer.tsx` - Cancel and submit buttons

### State Management

- `/stores/pixzlo-dialog.ts` - Zustand store for all dialog state
- `/hooks/use-css-extraction.ts` - Custom hook for CSS extraction logic
- `/hooks/use-dialog-submission.ts` - Custom hook for form submission logic

## Key Benefits

### 🧩 **Modular Architecture**

- Each component has a single responsibility
- Easy to test individual components
- Better code reusability

### 🏪 **Centralized State Management**

- Zustand store manages all dialog state
- No prop drilling between components
- Predictable state updates

### 🎯 **Custom Hooks**

- Logic separated from UI components
- Reusable business logic
- Easier to test and maintain

### 📁 **Organized File Structure**

```
pixzlo-dialog/
├── index.tsx              # Main component
├── components.ts          # Re-exports
├── header.tsx            # Header component
├── image-section.tsx     # Image display
├── form-section.tsx      # Form inputs
├── tabs-section.tsx      # Tab container
├── styling-tab.tsx       # CSS table
├── info-tab.tsx          # Metadata display
├── footer.tsx            # Action buttons
└── README.md             # This file
```

### 🔧 **TypeScript Strict Mode**

- Full type safety with strict TypeScript
- Explicit return types for all functions
- No `any` types used
- Proper interface definitions

## Usage

```tsx
import PixzloDialog from "@/components/content/pixzlo-dialog"
// Or import specific components
import {
  FormSection,
  Header,
  ImageSection
} from "@/components/content/pixzlo-dialog/components"
```

## State Management

The component uses Zustand for state management:

```tsx
import { usePixzloDialogStore } from "@/stores/pixzlo-dialog"

const {
  isOpen,
  screenshots,
  title,
  description,
  setTitle,
  setDescription,
  openDialog,
  closeDialog
} = usePixzloDialogStore()
```

## Custom Hooks

### useCSSExtraction

Automatically extracts CSS properties when an element is selected:

```tsx
import { useCSSExtraction } from "@/hooks/use-css-extraction"

// Use in component - automatically handles CSS extraction
useCSSExtraction()
```

### useDialogSubmission

Handles form submission logic:

```tsx
import { useDialogSubmission } from "@/hooks/use-dialog-submission"

const { handleSubmit } = useDialogSubmission(onSubmit)
```

## Migration Notes

The refactored component maintains 100% API compatibility with the original component. All existing imports and usage patterns continue to work without changes.

### Before (Single File - 384 lines)

```tsx
import PixzloDialog from "@/components/content/pixzlo-dialog"
```

### After (Modular - Multiple Files)

```tsx
import PixzloDialog from "@/components/content/pixzlo-dialog"

// Same import, modular implementation
```

## Benefits of This Architecture

1. **Maintainability** - Smaller, focused files are easier to understand and modify
2. **Testability** - Individual components can be tested in isolation
3. **Reusability** - Sub-components can be reused in other contexts
4. **Performance** - Better tree-shaking and code-splitting opportunities
5. **Developer Experience** - Easier navigation and debugging
6. **State Management** - Centralized state with Zustand eliminates prop drilling
7. **Type Safety** - Strict TypeScript ensures robust code
