import type { Profile } from "@/types/profile"

export const fetchProfile = async (): Promise<Profile | null> => {
  try {
    const res = await fetch("http://localhost:3000/api/user/profile", {
      credentials: "include"
    })
    if (!res.ok) {
      return null
    }
    const data = await res.json()
    return data.profile as Profile
  } catch {
    return null
  }
}
