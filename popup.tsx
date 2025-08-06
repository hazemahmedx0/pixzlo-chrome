import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

import "globals.css"

type Profile = {
  email?: string
}

const IndexPopup = () => {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/user/profile", {
          credentials: "include"
        })
        if (res.ok) {
          const data = await res.json()
          setProfile(data.profile)
          setStatus("authenticated")
        } else {
          setStatus("unauthenticated")
        }
      } catch (e) {
        setStatus("unauthenticated")
      }
    }

    fetchProfile()
  }, [])

  if (status === "loading") {
    return (
      <div className="flex h-[25rem] w-[25rem] items-center justify-center">
        Checking authentication...
      </div>
    )
  }

  if (status === "authenticated") {
    return (
      <div className="flex h-[25rem] w-[25rem] flex-col items-center justify-center gap-2">
        <span className="text-center">Logged in as {profile?.email ?? "user"}</span>
      </div>
    )
  }

  return (
    <div className="flex h-[25rem] w-[25rem] items-center justify-center">
      <Button onClick={() => window.open("http://localhost:3000/login", "_blank")}>Login</Button>
    </div>
  )
}

export default IndexPopup
