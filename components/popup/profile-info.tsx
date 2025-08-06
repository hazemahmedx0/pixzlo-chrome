import type { Profile } from "@/types/profile"

import { SelectElementButton } from "./select-element-button"

export const ProfileInfo = ({ profile }: { profile: Profile }) => {
  return (
    <div className="flex h-[25rem] w-[25rem] flex-col items-center justify-center gap-2">
      <span className="text-center">
        Logged in as {profile.email ?? "user"}
      </span>
      <SelectElementButton />
    </div>
  )
}
