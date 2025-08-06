import { Button } from "@/components/ui/button"

export const LoginButton = () => {
  const handleLogin = () => {
    chrome.tabs.create({ url: "http://localhost:3000/login" })
  }

  return (
    <div className="flex h-[25rem] w-[25rem] items-center justify-center">
      <Button onClick={handleLogin}>Login</Button>
    </div>
  )
}
