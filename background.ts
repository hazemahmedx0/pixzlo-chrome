chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'capture-screen') {
    chrome.tabs.captureVisibleTab(sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT, { format: 'png' }, (dataUrl) => {
      sendResponse({ dataUrl })
    })
    return true
  }
})
