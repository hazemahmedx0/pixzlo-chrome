import { PIXZLO_WEB_URL } from "@/lib/constants"
import type { Profile } from "@/types/profile"
import { CameraIcon, CropIcon, HandTapIcon, XIcon } from "@phosphor-icons/react"
import logoUrl from "data-base64:~assets/pixzlo-colord-logo.svg"
import { useEffect, useState } from "react"

import { CaptureButton } from "./capture-button"

export const ProfileInfo = ({ profile }: { profile: Profile }): JSX.Element => {
  const [imageSrc, setImageSrc] = useState<string>(logoUrl)

  useEffect(() => {
    // Fallback to chrome.runtime.getURL if the import doesn't work
    if (!logoUrl || logoUrl.includes("undefined")) {
      try {
        const fallbackUrl = chrome.runtime.getURL(
          "assets/pixzlo-colord-logo.svg"
        )
        setImageSrc(fallbackUrl)
      } catch (error) {
        console.warn("Failed to load logo:", error)
        // You could set a default icon or text here
        setImageSrc("")
      }
    }
  }, [])

  return (
    <div className="flex w-72 select-none flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Pixzlo"
              className="h-5 w-5 saturate-150"
              onError={() => {
                // Final fallback - you could use a text logo or icon
                setImageSrc("")
              }}
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded bg-sky-500">
              <span className="text-xs font-bold text-white">P</span>
            </div>
          )}
        </div>
        <button
          className="text-neutral-400 hover:text-neutral-600"
          onClick={() => window.close()}
          aria-label="Close popup">
          <XIcon size={16} weight="bold" />
        </button>
      </div>
      <div className="">
        <div className="flex flex-col gap-2">
          <CaptureButton mode="element" icon={false}>
            <HandTapIcon size={16} weight="fill" />
            Select element
          </CaptureButton>

          <CaptureButton mode="area" icon={false}>
            <CropIcon size={16} />
            Capture area
          </CaptureButton>

          <CaptureButton mode="fullscreen" icon={false}>
            <CameraIcon size={16} />
            Capture entire screen
          </CaptureButton>
          <a
            href={`${PIXZLO_WEB_URL}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block border-t border-gray-150 pt-3 text-center text-sm text-neutral-500 hover:text-neutral-700">
            Recent issues ↗
          </a>
        </div>
        <div className="mt-3 text-xs text-neutral-400">
          © 2025 Pixzlo.com{" "}
          <a
            href="https://tally.so/r/mVRDya"
            target="_blank"
            rel="noopener noreferrer"
            className="float-right cursor-pointer text-sky-600 hover:text-sky-700">
            Feedback
          </a>
        </div>
      </div>
    </div>
  )
}
