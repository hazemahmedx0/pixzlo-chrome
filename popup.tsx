import "globals.css"

import { LoginButton } from "@/components/popup/login-button"
import { LoadingView } from "@/components/popup/loading"
import { ProfileInfo } from "@/components/popup/profile-info"
import { useProfile } from "@/hooks/use-profile"

const IndexPopup = () => {
  const { profile, status } = useProfile()

  if (status === "loading") {
    return <LoadingView />
  }

  if (status === "authenticated" && profile) {
    return <ProfileInfo profile={profile} />
  }

  return <LoginButton />
}

export default IndexPopup
