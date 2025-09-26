// Test script to verify background script API calls work
// Paste this in DevTools console on any page with the extension loaded

console.log("🧪 TESTING BACKGROUND SCRIPT API CALLS")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

// Test 1: Simple health check
console.log("1. Testing simple API call...")
chrome.runtime.sendMessage(
  {
    type: "API_CALL",
    endpoint: "/api/health", // This endpoint might not exist, but we'll see the response
    options: {
      method: "GET"
    }
  },
  (response) => {
    console.log("Health check response:", response)
  }
)

// Test 2: Figma status check
setTimeout(() => {
  console.log("\n2. Testing Figma status check...")
  chrome.runtime.sendMessage(
    {
      type: "API_CALL",
      endpoint: "/api/integrations/figma/status",
      options: {
        method: "GET"
      }
    },
    (response) => {
      console.log("Figma status response:", response)

      if (
        response.error &&
        response.error.includes("Authentication required")
      ) {
        console.log("✅ Expected authentication error - API route is working")
      } else if (response.success) {
        console.log("✅ API call successful:", response.data)
      } else {
        console.log("❌ Unexpected error:", response.error)
      }
    }
  )
}, 1000)

// Test 3: Check extension ID
setTimeout(() => {
  console.log("\n3. Extension info:")
  console.log("Extension ID:", chrome.runtime.id)
  console.log("Background script working:", !!chrome.runtime)
}, 2000)

console.log("\n📋 Check the console above for results...")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
