import { PIXZLO_WEB_URL } from "@/lib/constants"
import { getActiveWorkspace, setSelectedWorkspaceId } from "@/stores/workspace-store"
import type { Profile, Workspace } from "@/types/profile"
import { CameraIcon, CropIcon, HandTapIcon, XIcon } from "@phosphor-icons/react"
import { useCallback, useEffect, useState } from "react"

import { CaptureButton } from "./capture-button"

// Helper to get workspace ID (supports both API formats)
const getWsId = (ws: Workspace): string => ws.workspace_id ?? ws.id
const getWsName = (ws: Workspace): string => ws.workspace_name ?? ws.name

interface ProfileInfoProps {
  profile: Profile
}

export const ProfileInfo = ({ profile }: ProfileInfoProps): JSX.Element => {
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | undefined>()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    // Get active workspaces from profile
    const active = (profile.workspaces ?? []).filter((w) => w.status === "active")
    setWorkspaces(active)

    ;(async (): Promise<void> => {
      if (active.length === 0) return
      const selected = await getActiveWorkspace(active)
      setSelectedWorkspace(selected)
    })().catch(() => {})
  }, [profile])

  const handleSelectWorkspace = useCallback(async (workspace: Workspace) => {
    const wsId = getWsId(workspace)
    await setSelectedWorkspaceId(wsId)
    setSelectedWorkspace(workspace)
    setDropdownOpen(false)
  }, [])

  return (
    <div className="flex w-72 select-none flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        {/* Workspace Selector */}
        {selectedWorkspace ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => workspaces.length > 1 && setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 ${workspaces.length > 1 ? "hover:bg-neutral-100" : ""}`}>
              <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-sky-500 to-indigo-600">
                <span className="text-[10px] font-bold text-white">
                  {getWsName(selectedWorkspace).charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="max-w-28 truncate text-sm font-medium text-neutral-700">
                {getWsName(selectedWorkspace)}
              </span>
              {workspaces.length > 1 && (
                <svg width="12" height="12" viewBox="0 0 12 12" className="text-neutral-400">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              )}
            </button>

            {dropdownOpen && workspaces.length > 1 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
                  {workspaces.map((ws) => (
                    <button
                      key={getWsId(ws)}
                      type="button"
                      onClick={() => handleSelectWorkspace(ws)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                        getWsId(ws) === getWsId(selectedWorkspace)
                          ? "bg-sky-50 text-sky-700"
                          : "text-neutral-700 hover:bg-neutral-50"
                      }`}>
                      <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-sky-500 to-indigo-600">
                        <span className="text-[9px] font-bold text-white">
                          {getWsName(ws).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="flex-1 truncate">{getWsName(ws)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <span className="text-sm text-neutral-500">No workspace</span>
        )}
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
            href={
              selectedWorkspace?.slug
                ? `${PIXZLO_WEB_URL}/${selectedWorkspace.slug}/issues`
                : `${PIXZLO_WEB_URL}/issues`
            }
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
