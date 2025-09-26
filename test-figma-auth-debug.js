// SIMPLIFIED Figma Authentication Test
console.log("🔐 FIGMA AUTH FIXES TEST")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

// Quick auth status test
async function quickAuthTest() {
  console.log("🔍 Testing auth status...")

  try {
    const response = await fetch("http://localhost:3000/api/integrations/figma/status", {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    })

    const data = await response.json()
    console.log("Result:", data.connected ? "✅ CONNECTED" : "❌ NOT CONNECTED")
    
    return data
  } catch (error) {
    console.error("❌ API test failed:", error)
    return null
  }
}

// Check modal container
function checkModalContainer() {
  console.log("\n🔍 Checking modal container...")
  
  const mainDialog = document.querySelector('[data-pixzlo-ui="pixzlo-dialog"]')
  const figmaModal = document.querySelector('[data-pixzlo-ui="figma-modal"]')
  
  if (mainDialog && figmaModal) {
    const sameParent = mainDialog.parentElement === figmaModal.parentElement
    console.log("Same container:", sameParent ? "✅ YES" : "❌ NO")
  } else {
    console.log("Main dialog:", mainDialog ? "✅ Found" : "❌ Not found")
    console.log("Figma modal:", figmaModal ? "✅ Found" : "❌ Not found")
  }
}

// Run tests
console.log("\n📋 TESTING INSTRUCTIONS:")
console.log("1. Run quickAuthTest() to check API")
console.log("2. Click 'Add Figma design' to open modal")  
console.log("3. Run checkModalContainer() to verify container")
console.log("4. Check if Connect button opens POPUP (not tab)")

// Make functions available
window.quickAuthTest = quickAuthTest
window.checkModalContainer = checkModalContainer

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")