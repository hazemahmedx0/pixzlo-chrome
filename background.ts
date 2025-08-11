chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "capture-screen") {
    chrome.tabs.captureVisibleTab(
      sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT,
      { format: "png" },
      (dataUrl) => {
        sendResponse({ dataUrl })
      }
    )
    return true
  }

  if (message.type === "dummy-api-call") {
    fetch("https://jsonplaceholder.typicode.com/posts/1")
      .then((response) => response.json())
      .then((data) => {
        console.log("Background script - Dummy API response:", data)
        sendResponse({ success: true, data })
      })
      .catch((error) => {
        console.error("Background script - Error calling dummy API:", error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }
})
