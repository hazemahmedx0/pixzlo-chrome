import "globals.css"

import { LoadingView } from "@/components/popup/loading"
import { LoginButton } from "@/components/popup/login-button"
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
