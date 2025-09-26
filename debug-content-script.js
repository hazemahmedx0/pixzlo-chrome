// Debug script to test content script injection manually
// Copy and paste this into the browser's DevTools Console on the problematic page

console.log("🔍 CONTENT SCRIPT DEBUG TEST")
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

// Test 1: Check if chrome extension context exists
console.log("1. Extension Context:")
console.log("   chrome.runtime exists:", !!window.chrome?.runtime)
console.log("   chrome.runtime.id:", window.chrome?.runtime?.id)
console.log("   chrome.tabs exists:", !!window.chrome?.tabs)

// Test 2: Check page properties
console.log("\n2. Page Properties:")
console.log("   URL:", window.location.href)
console.log("   Protocol:", window.location.protocol)
console.log("   Host:", window.location.host)
console.log("   Document state:", document.readyState)
console.log("   Is iframe:", window !== window.top)

// Test 3: Check CSP headers
console.log("\n3. Security Headers:")
const metaTags = document.querySelectorAll(
  'meta[http-equiv="Content-Security-Policy"]'
)
console.log("   CSP meta tags:", metaTags.length)
metaTags.forEach((tag, i) => {
  console.log(`   CSP ${i + 1}:`, tag.getAttribute("content"))
})

// Test 4: Check for existing content script
console.log("\n4. Content Script Check:")
const pixzloElements = document.querySelectorAll("[data-pixzlo]")
console.log("   Pixzlo elements found:", pixzloElements.length)
console.log(
  "   Content script logs in console:",
  !!Array.from(document.querySelectorAll("*")).find((el) =>
    el.textContent?.includes("Pixzlo content script")
  )
)

// Test 5: Manual message test
if (window.chrome?.runtime) {
  console.log("\n5. Manual Message Test:")
  try {
    chrome.runtime.sendMessage({ type: "ping" }, (response) => {
      if (chrome.runtime.lastError) {
        console.log("   ❌ Runtime error:", chrome.runtime.lastError.message)
      } else {
        console.log("   ✅ Response received:", response)
      }
    })
  } catch (error) {
    console.log("   ❌ Send message failed:", error.message)
  }
} else {
  console.log("\n5. ❌ No chrome.runtime - extension context not available")
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
console.log("📋 TROUBLESHOOTING STEPS:")
console.log("1. Try refreshing the page completely")
console.log("2. Test on a simple site like google.com")
console.log("3. Check extension permissions in chrome://extensions/")
console.log("4. Look for CSP errors in Network/Security tabs")
console.log("5. Try disabling other extensions temporarily")
