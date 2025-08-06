import { Button } from "@/components/ui/button"

export const SelectElementButton = () => {
  const handleSelect = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      if (tabId !== undefined) {
        chrome.tabs.sendMessage(tabId, { type: "start-element-selection" })
      }
    })
  }

  return <Button onClick={handleSelect}>Select element</Button>
}
