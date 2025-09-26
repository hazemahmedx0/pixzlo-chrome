// Simple debug script to test drawing store functionality
import { useDrawingStore } from './stores/drawing-store.js';

// This would run in browser console to test the store
console.log('Testing drawing store...');

const store = useDrawingStore.getState();
console.log('Initial state:', store.drawingState);
console.log('Initial history:', store.history);
console.log('Can undo:', store.canUndo());
console.log('Can redo:', store.canRedo());

// Test adding an element
const testElement = {
  id: 'test-element-1',
  type: 'rectangle',
  x: 10,
  y: 10,
  width: 50,
  height: 50,
  color: '#ff0000',
  strokeWidth: 2,
  visible: true
};

console.log('Adding test element...');
store.addElement(testElement);

console.log('After adding element:');
console.log('State:', store.drawingState);
console.log('History length:', store.history.states.length);
console.log('History index:', store.history.currentIndex);
console.log('Can undo:', store.canUndo());
console.log('Can redo:', store.canRedo());

// Test undo
console.log('Testing undo...');
store.undo();
console.log('After undo:');
console.log('Elements:', store.drawingState.elements.length);
console.log('Can undo:', store.canUndo());
console.log('Can redo:', store.canRedo());

// Test redo
console.log('Testing redo...');
store.redo();
console.log('After redo:');
console.log('Elements:', store.drawingState.elements.length);
console.log('Can undo:', store.canUndo());
console.log('Can redo:', store.canRedo());

export default {};
