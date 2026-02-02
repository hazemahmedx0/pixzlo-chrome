/**
 * Background Script for Pixzlo Chrome Extension
 *
 * This is the main entry point for the service worker. The actual implementation
 * has been modularized into the background/ directory for better maintainability.
 *
 * Module Structure:
 * - background/types/      - TypeScript type definitions for messages and API responses
 * - background/services/   - Business logic and API interactions
 * - background/handlers/   - Message handler functions for each feature area
 * - background/utils/      - Utility functions and storage listeners
 * - background/index.ts    - Main initialization and message routing
 *
 * This architecture separates concerns and makes the codebase easier to:
 * - Navigate and understand
 * - Test individual components
 * - Extend with new features
 * - Debug and maintain
 */

// Import and initialize the modular background script
import "./background/index"
