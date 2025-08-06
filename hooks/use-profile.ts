import { useEffect, useState } from "react"

import { fetchProfile } from "@/lib/profile"
import type { Profile } from "@/types/profile"

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [status, setStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading")

  useEffect(() => {
    fetchProfile()
      .then((data) => {
        if (data) {
          setProfile(data)
          setStatus("authenticated")
        } else {
          setStatus("unauthenticated")
        }
      })
      .catch(() => setStatus("unauthenticated"))
  }, [])

  return { profile, status }
}
