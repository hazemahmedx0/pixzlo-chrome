import type { Profile } from "@/types/profile"
import { Bug, Camera, Cursor, Monitor, X } from "phosphor-react"

import { CaptureButton } from "./capture-button"

export const ProfileInfo = ({ profile }: { profile: Profile }): JSX.Element => {
  return (
    <div className="w-[25rem] select-none">
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-2">
          <img
            src={chrome.runtime.getURL("assets/pixzlo-colord-logo.svg")}
            alt="Pixzlo"
            className="h-5 w-5"
          />
        </div>
        <button
          className="text-neutral-400 hover:text-neutral-600"
          onClick={() => window.close()}
          aria-label="Close popup">
          <X size={16} weight="bold" />
        </button>
      </div>
      <div className="px-3 pb-3">
        <div className="mt-3 rounded-2xl border border-neutral-200 p-2 shadow-sm">
          <CaptureButton
            mode="element"
            className="h-12 w-full justify-start gap-2 rounded-xl bg-sky-500 text-white hover:bg-sky-600"
            icon={false}>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
              <Cursor size={16} weight="bold" />
            </span>
            Select element
          </CaptureButton>

          <CaptureButton
            mode="area"
            className="mt-2 h-12 w-full justify-start gap-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
            icon={false}>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100">
              <Bug size={16} />
            </span>
            Capture area
          </CaptureButton>

          <CaptureButton
            mode="fullscreen"
            className="mt-2 h-12 w-full justify-start gap-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50"
            icon={false}>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100">
              <Monitor size={16} />
            </span>
            Capture entire screen
          </CaptureButton>
          <div className="mt-4 border-t pt-3 text-sm text-neutral-500">
            Recent issues ↗
          </div>
        </div>
        <div className="mt-3 text-xs text-neutral-400">
          2025 Pixzlo.com{" "}
          <span className="float-right cursor-pointer text-sky-600">
            Feedback
          </span>
        </div>
      </div>
    </div>
  )
}
