// Test script for Figma integration improvements
console.log("🧪 TESTING FIGMA IMPROVEMENTS")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

// Test main dialog sizing
function testMainDialogSizing() {
  console.log("\n📏 Testing main dialog sizing...")

  const mainDialog = document.querySelector('[data-pixzlo-ui="pixzlo-dialog"]')
  if (mainDialog) {
    const computedStyle = window.getComputedStyle(mainDialog)
    console.log("Main dialog padding:", computedStyle.padding)
    console.log("✅ Main dialog found")
  } else {
    console.log("❌ Main dialog not found - open Create Issue dialog first")
  }
}

// Test modal sizing
function testModalSizing() {
  console.log("\n📐 Testing modal sizing...")

  const figmaModal = document.querySelector('[data-pixzlo-ui="figma-modal"]')
  if (figmaModal) {
    const content = figmaModal.querySelector('div[style*="minWidth"]')
    if (content) {
      const style = content.style
      console.log("Modal minWidth:", style.minWidth)
      console.log("Modal maxWidth:", style.maxWidth)
      console.log("✅ Modal hugs content properly")
    } else {
      console.log("❌ Modal content sizing not found")
    }
  } else {
    console.log("❌ Figma modal not found - open Add Figma design first")
  }
}

// Test OAuth speed
function testOAuthSpeed() {
  console.log("\n⚡ Testing OAuth speed...")
  console.log("Click 'Connect Figma' and check console for timing logs")
  console.log("Look for: 'Got auth URL in Xms' and 'OAuth completed in Xms'")
}

// Test separation of concerns
function testSeparation() {
  console.log("\n🔄 Testing separation of concerns...")
  console.log("1. Click 'Add Figma design' - should open instantly")
  console.log("2. Auth check should happen inside modal, not before")
  console.log("3. When closing modal, auth status should refresh")
  console.log("4. UI should update based on auth status")
}

// Run all tests
console.log("\n📋 TEST INSTRUCTIONS:")
console.log("1. Open Create Issue dialog")
console.log("2. Run testMainDialogSizing()")
console.log("3. Click 'Add Figma design'")
console.log("4. Run testModalSizing()")
console.log("5. Click 'Connect Figma' and observe speed")
console.log("6. Check console for OAuth timing logs")

// Make functions available globally
window.testMainDialogSizing = testMainDialogSizing
window.testModalSizing = testModalSizing
window.testOAuthSpeed = testOAuthSpeed
window.testSeparation = testSeparation

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
