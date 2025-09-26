// Test script for new Figma API flow (no website lookup)
console.log("🎯 TESTING NEW FIGMA API FLOW")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

// Test the new flow
function testFigmaApiFlow() {
  console.log("\n📋 NEW FIGMA FLOW TEST:")
  console.log("1. Click 'Add Figma design' - should open instantly")
  console.log("2. Paste Figma URL - should NOT call /api/websites")
  console.log("3. Click 'Browse Figma File' - should call Figma API directly")
  console.log("4. Select frame from list")
  console.log("5. Click 'Use Selected Frame' - should create link")
  console.log("\n🚫 SHOULD NOT SEE:")
  console.log("❌ GET /api/websites?domain=grok.com (eliminated)")
  console.log("❌ GET /api/integrations/figma/files/[fileId] (bypassed)")
  console.log("\n✅ SHOULD SEE:")
  console.log("✅ GET /api/integrations/figma/status (for token)")
  console.log("✅ GET https://api.figma.com/v1/files/[fileId] (direct)")
  console.log("✅ Direct Figma API usage via background script")
}

// Monitor network requests
function monitorNetworkRequests() {
  console.log("\n🔍 Monitoring network requests...")

  // Override fetch to log requests
  const originalFetch = window.fetch
  window.fetch = function (...args) {
    const url = args[0]
    if (typeof url === "string") {
      if (url.includes("/api/websites")) {
        console.error("❌ WEBSITE API CALL DETECTED:", url)
      } else if (url.includes("/api/integrations/figma")) {
        console.log("✅ Figma API call:", url)
      }
    }
    return originalFetch.apply(this, args)
  }

  console.log("Network monitoring active - check console during testing")
}

// Test frame selection UI
function testFrameSelection() {
  console.log("\n🖼️ Testing frame selection UI...")

  const modal = document.querySelector('[data-pixzlo-ui="figma-modal"]')
  if (modal && modal.textContent?.includes("Select Frame")) {
    console.log("✅ Frame selection UI is visible")

    const frames = modal.querySelectorAll('button[class*="border"]')
    console.log(`📊 Found ${frames.length} selectable frames`)

    const selectedFrame = modal.querySelector(
      'button[class*="border-blue-500"]'
    )
    if (selectedFrame) {
      console.log("✅ Frame is selected:", selectedFrame.textContent?.trim())
    } else {
      console.log("⚠️ No frame selected yet")
    }
  } else {
    console.log("❌ Frame selection UI not found")
    console.log(
      "💡 Make sure to paste a Figma URL and click 'Browse Figma File' first"
    )
  }
}

// Run tests
testFigmaApiFlow()
monitorNetworkRequests()

// Make functions available
window.testFrameSelection = testFrameSelection
window.testFigmaApiFlow = testFigmaApiFlow

console.log("\n📋 Available Functions:")
console.log("  - testFrameSelection()")
console.log("  - testFigmaApiFlow()")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
