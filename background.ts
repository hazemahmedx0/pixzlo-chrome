import "~lib/console-silencer"

import type { FigmaFile, FigmaNode } from "@/types/figma"

import {
  EXTENSION_GOODBYE_URL,
  EXTENSION_WELCOME_URL,
  PIXZLO_WEB_URL
} from "~lib/constants"
import {
  clearTokenCache,
  extractElementsFromNode as directExtractElements,
  fetchFigmaFile as directFetchFigmaFile,
  findNodeById as directFindNodeById,
  renderFigmaNode as directRenderFigmaNode
} from "~lib/figma-direct-api"

// ============================================================================
// Extension Install/Uninstall Handlers
// ============================================================================

/**
 * Handle extension installation events
 * - On fresh install: Open the welcome page
 * - On update: Could show changelog (optional)
 */
chrome.runtime.onInstalled.addListener((details): void => {
  // Set the uninstall URL (works for all install reasons)
  chrome.runtime.setUninstallURL(EXTENSION_GOODBYE_URL).catch((error) => {
    console.error("[Pixzlo] Failed to set uninstall URL:", error)
  })

  if (details.reason === "install") {
    // Fresh installation - open welcome page
    console.log("[Pixzlo] Extension installed, opening welcome page")
    chrome.tabs.create({ url: EXTENSION_WELCOME_URL }).catch((error) => {
      console.error("[Pixzlo] Failed to open welcome page:", error)
    })
  } else if (details.reason === "update") {
    // Extension updated - could show changelog if needed
    console.log(
      "[Pixzlo] Extension updated from version:",
      details.previousVersion
    )
  }
})

// ============================================================================
// Figma API Configuration
// ============================================================================

// Figma metadata cache (includes token)
let figmaMetadataCache: {
  data: FigmaMetadataResponse | undefined
  expiresAt: Date | undefined
} = {
  data: undefined,
  expiresAt: undefined
}

// Cache frame render responses to avoid repeated network calls for the same file/frame
interface FrameRenderResponse {
  fileId: string
  nodeId: string
  frameData: FigmaNode
  elements: ReturnType<typeof directExtractElements>
  imageUrl: string
  fileName: string
}

const FRAME_RENDER_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const frameRenderResultCache = new Map<
  string,
  { data: FrameRenderResponse; expiresAt: number }
>()
const inFlightFrameRenderRequests = new Map<
  string,
  Promise<FrameRenderResponse>
>()

/**
 * Fetch Figma file directly via Figma API (with token from backend)
 * This reduces server load by making direct API calls from the extension
 */
async function fetchFigmaFileDirect(fileId: string): Promise<FigmaFile> {
  console.log("[Figma Direct] Fetching file directly from Figma API:", fileId)
  return directFetchFigmaFile(fileId)
}

/**
 * Render Figma node directly via Figma API
 */
async function renderFigmaNodeDirect(
  fileId: string,
  nodeId: string
): Promise<string> {
  console.log(
    "[Figma Direct] Rendering node directly from Figma API:",
    fileId,
    nodeId
  )
  return directRenderFigmaNode(fileId, nodeId, "png", 2)
}

// Helper function to parse Figma URL and extract file ID and node ID
function parseFigmaUrl(
  url: string
): { fileId: string | undefined; nodeId: string | undefined } | undefined {
  try {
    const urlObj = new URL(url)

    // Extract file ID from different URL patterns
    let fileId: string | undefined
    if (url.includes("/design/")) {
      fileId = url.match(/\/design\/([^\/\?]+)/)?.[1]
    } else if (url.includes("/file/")) {
      fileId = url.match(/\/file\/([^\/\?]+)/)?.[1]
    }

    // Extract node ID from URL params
    const nodeId = urlObj.searchParams.get("node-id")

    return {
      fileId: fileId,
      nodeId: nodeId ? nodeId.replace("-", ":") : undefined // Convert 119-1968 to 119:1968
    }
  } catch (error) {
    console.error("Failed to parse Figma URL:", error)
    return undefined
  }
}

// Helper function to extract frames from Figma file data (based on reviewit implementation)
function extractFramesFromFigmaData(data: any): Array<{
  id: string
  name: string
  type: string
  absoluteBoundingBox: any
}> {
  const frames = []

  function traverseNode(node) {
    if (node.type === "FRAME" || node.type === "COMPONENT") {
      frames.push({
        id: node.id,
        name: node.name,
        type: node.type,
        absoluteBoundingBox: node.absoluteBoundingBox
      })
    }

    if (node.children) {
      node.children.forEach(traverseNode)
    }
  }

  if (data.document && data.document.children) {
    data.document.children.forEach((page) => {
      if (page.children) {
        page.children.forEach(traverseNode)
      }
    })
  }

  return frames
}

// Use imported helper functions from figma-direct-api
const extractElementsFromNode = directExtractElements
const findNodeById = (
  data: { nodes?: Record<string, FigmaNode>; document?: FigmaNode },
  nodeId: string
): FigmaNode | undefined => {
  // Handle FigmaFile format (with nodes object)
  if (data.nodes) {
    return directFindNodeById(data as FigmaFile, nodeId)
  }
  // Handle legacy format with document property (for extractFramesFromFigmaData)
  if (data.document) {
    const tempFile: FigmaFile = {
      key: "",
      name: "",
      thumbnail_url: "",
      last_modified: "",
      nodes: { root: data.document }
    }
    return directFindNodeById(tempFile, nodeId)
  }
  return undefined
}

// Helper to convert data URL to Blob (for Konva exports)
function dataUrlToBlob(dataUrl: string): Blob | undefined {
  try {
    const [header, base64] = dataUrl.split(",")
    const mimeMatch = header.match(/data:([^;]+);base64/)
    const mime = mimeMatch ? mimeMatch[1] : "image/png"
    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return new Blob([bytes], { type: mime })
  } catch (e) {
    console.warn("Failed to convert dataUrl to Blob", e)
    return undefined
  }
}

// Use direct Figma API for rendering nodes
const renderFigmaNode = renderFigmaNodeDirect

// Linear Integration API calls from background script
interface LinearStatusResponse {
  connected: boolean
  integration?: {
    id: string
    workspace_id: string
    integration_type: "linear" | "figma"
    configured_by: string
    is_active: boolean
    created_at: string
    updated_at: string
    integration_data: {
      type: "linear"
      user_name: string
      organization_name: string
      team_name?: string
      teams_count: number
      connected_at: string
      expires_at?: string
    }
  }
}

interface LinearCreateIssueResponse {
  success: boolean
  issue?: {
    id: string
    identifier: string
    title: string
    url: string
    state?: string
  }
  error?: string
}

interface LinearOptionsResponse {
  teams?: Array<{
    id: string
    name: string
    key: string
    description?: string
    color?: string
  }>
  projects?: Array<{
    id: string
    name: string
    description?: string
    state: string
    progress: number
    url: string
  }>
  users?: Array<{
    id: string
    name: string
    displayName: string
    email?: string
    avatarUrl?: string
    isActive: boolean
  }>
  workflowStates?: Array<{
    id: string
    name: string
    color: string
    description?: string
    type: string
    position: number
    team?: {
      id: string
      name: string
    }
  }>
  preference?:
    | {
        id: string
        lastUsedTeamId?: string
        lastUsedTeamName?: string
        lastUsedProjectId?: string
        lastUsedProjectName?: string
        updatedAt: string
      }
    | undefined
}

// Linear API handler functions
async function handleLinearStatusCheck(): Promise<{
  success: boolean
  data?: LinearStatusResponse
  error?: string
}> {
  try {
    const pixzloWebUrl = PIXZLO_WEB_URL // Use the same URL as other API calls

    console.log("📡 Checking Linear status from background script...")
    console.log("🔗 URL:", `${pixzloWebUrl}/api/integrations/linear/status`)

    const response = await fetch(
      `${pixzloWebUrl}/api/integrations/linear/status`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include"
      }
    )

    console.log("📡 Response status:", response.status)
    console.log(
      "📡 Response headers:",
      Object.fromEntries(response.headers.entries())
    )

    if (response.status === 404) {
      // No integration found - normal case
      return {
        success: true,
        data: { connected: false }
      }
    }

    if (response.status === 401) {
      return {
        success: false,
        error: "Please log in to Pixzlo to use Linear integration"
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = (await response.json()) as LinearStatusResponse
    console.log("📡 Response data:", data)

    return {
      success: true,
      data
    }
  } catch (error) {
    console.error("❌ Background Linear status check error:", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to check Linear status"
    }
  }
}

async function handleLinearCreateIssue(issueData: {
  title: string
  description: string
  priority?: number
  linearOptions?: {
    teamId?: string
    projectId?: string
    assigneeId?: string
    stateId?: string
  }
}): Promise<{
  success: boolean
  data?: LinearCreateIssueResponse
  error?: string
}> {
  try {
    const pixzloWebUrl = PIXZLO_WEB_URL // Use the same URL as other API calls

    console.log("📡 Creating Linear issue from background script...")
    console.log(
      "🔗 URL:",
      `${pixzloWebUrl}/api/integrations/linear/create-issue`
    )
    console.log("📝 Issue data:", issueData)

    const response = await fetch(
      `${pixzloWebUrl}/api/integrations/linear/create-issue`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(issueData)
      }
    )

    console.log("📡 Response status:", response.status)
    console.log(
      "📡 Response headers:",
      Object.fromEntries(response.headers.entries())
    )

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error ?? errorMessage
        console.error("📡 Error response body:", errorData)
      } catch (parseError) {
        console.error("📡 Failed to parse error response:", parseError)
        const textError = await response.text()
        console.error("📡 Error response text:", textError)
      }
      throw new Error(errorMessage)
    }

    const data = (await response.json()) as LinearCreateIssueResponse
    console.log("📡 Response data:", data)

    return {
      success: true,
      data
    }
  } catch (error) {
    console.error("❌ Background Linear issue creation error:", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create Linear issue"
    }
  }
}

// Helper function to convert severity to Linear priority number
function getPriorityNumber(severity: string): number {
  const priorityMap: Record<string, number> = {
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4
  }
  return priorityMap[severity] || 3
}

// Helper function to build rich Linear description with markdown
function buildLinearDescription(
  payload: any,
  websiteUrl: string,
  issueId: string,
  imageUrls?: { element?: string; figma?: string; main?: string }
): string {
  const sections: string[] = []

  // Description section
  if (payload.description) {
    sections.push("## Description")
    sections.push(payload.description)
    sections.push("")
  }

  // Screenshots section with table layout
  if (imageUrls && (imageUrls.element || imageUrls.figma || imageUrls.main)) {
    sections.push("## Screenshots")
    sections.push("")

    // Build table header
    const headers: string[] = []
    const images: string[] = []

    if (imageUrls.element) {
      headers.push("Selected Element")
      images.push(`![Element](${imageUrls.element})`)
    }

    if (imageUrls.figma) {
      headers.push("Figma Design")
      images.push(`![Figma](${imageUrls.figma})`)
    }

    if (imageUrls.main) {
      headers.push("With Highlights")
      images.push(`![Highlighted](${imageUrls.main})`)
    }

    // Create markdown table with images side by side
    sections.push(`| ${headers.join(" | ")} |`)
    sections.push(`| ${headers.map(() => "---").join(" | ")} |`)
    sections.push(`| ${images.join(" | ")} |`)
    sections.push("")
  }

  // Style Comparison section
  if (
    payload?.cssStyles &&
    Array.isArray(payload.cssStyles) &&
    payload.cssStyles.length > 0
  ) {
    sections.push("## Style Comparison")
    sections.push("")
    sections.push("| Property | Implemented | Design | Match |")
    sections.push("|----------|-------------|--------|-------|")

    payload.cssStyles.forEach((prop: any) => {
      const implemented = prop.implemented_value || "N/A"
      const design = prop.design_value || "undefined"
      const match =
        prop.design_value && prop.implemented_value === prop.design_value
          ? "✅"
          : "❌"

      sections.push(
        `| ${prop.property_name} | ${implemented} | ${design} | ${match} |`
      )
    })

    sections.push("")
  }

  // Links section
  const hasFigmaLink = payload?.figma?.figmaUrl
  const hasWebsiteLink = websiteUrl

  if (hasFigmaLink || hasWebsiteLink) {
    sections.push("## Links")
    sections.push("")

    if (hasFigmaLink) {
      sections.push(`- **Figma:** [View Design](${payload.figma.figmaUrl})`)
    }

    if (hasWebsiteLink) {
      sections.push(`- **Website:** [View Page](${websiteUrl})`)
    }

    const issueLink = `${PIXZLO_WEB_URL}/issues/${issueId}`
    sections.push(`- **Pixzlo Issue:** [View Details](${issueLink})`)

    sections.push("")
  }

  // Technical Details section
  const metadata = payload?.metadata
  if (metadata) {
    const hasMetadata =
      metadata.browser ||
      metadata.device ||
      metadata.screenResolution ||
      metadata.viewportSize

    if (hasMetadata) {
      sections.push("## Technical Details")
      sections.push("")

      if (metadata.browser) {
        sections.push(`- **Browser:** ${metadata.browser}`)
      }

      if (metadata.device) {
        sections.push(`- **Device:** ${metadata.device}`)
      }

      if (metadata.screenResolution) {
        sections.push(`- **Screen Resolution:** ${metadata.screenResolution}`)
      }

      if (metadata.viewportSize) {
        sections.push(`- **Viewport:** ${metadata.viewportSize}`)
      }

      sections.push("")
    }
  }

  return sections.join("\n")
}

// Fetch Linear metadata (teams, projects, users, workflow states, preference)
async function handleLinearFetchMetadata(): Promise<{
  success: boolean
  data?: LinearOptionsResponse
  error?: string
}> {
  try {
    const pixzloWebUrl = PIXZLO_WEB_URL

    console.log("📡 Fetching Linear metadata from background script...")

    const response = await fetch(
      `${pixzloWebUrl}/api/integrations/linear/metadata`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      }
    )

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use this feature."
        }
      }

      if (response.status === 404) {
        // Linear integration not connected - this is a normal state, not an error
        console.log("📡 Linear integration not connected")
        return {
          success: true,
          data: {
            teams: [],
            projects: [],
            users: [],
            workflowStates: [],
            preference: undefined
          }
        }
      }

      return {
        success: false,
        error: errorData.error || "Failed to fetch Linear metadata"
      }
    }

    const result = (await response.json()) as {
      success: boolean
      data?: LinearOptionsResponse
      error?: string
    }

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch Linear metadata"
      }
    }

    console.log("✅ Linear metadata fetched")

    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    console.error("❌ Background Linear metadata fetch error:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch Linear metadata"
    }
  }
}

// Figma preference handler functions
async function handleFigmaFetchPreference(data: {
  websiteUrl: string
}): Promise<{
  success: boolean
  preference?: {
    id: string
    lastUsedFrameId: string
    lastUsedFrameName: string | undefined
    lastUsedFileId: string
    frameUrl: string | undefined
    frameImageUrl: string | undefined
    updatedAt: string
  }
  error?: string
}> {
  try {
    console.log("🎯 Fetching Figma preference for website:", data.websiteUrl)

    const response = await fetch(
      `${PIXZLO_WEB_URL}/api/integrations/figma/preferences?websiteUrl=${encodeURIComponent(data.websiteUrl)}`,
      {
        method: "GET",
        credentials: "include"
      }
    )

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use this feature."
        }
      }

      return {
        success: false,
        error: errorData.error || "Failed to fetch Figma preference"
      }
    }

    const result = await response.json()
    console.log("✅ Figma preference fetched successfully:", result.preference)

    return {
      success: true,
      preference: result.preference
    }
  } catch (error) {
    console.error("❌ Figma preference fetch error:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch Figma preference"
    }
  }
}

// Linear preference handler functions
async function handleLinearFetchPreference(): Promise<{
  success: boolean
  preference?: {
    id: string
    lastUsedTeamId: string | undefined
    lastUsedTeamName: string | undefined
    lastUsedProjectId: string | undefined
    lastUsedProjectName: string | undefined
    updatedAt: string
  }
  error?: string
}> {
  try {
    console.log("🎯 Fetching Linear preference")

    const response = await fetch(
      `${PIXZLO_WEB_URL}/api/integrations/linear/preferences`,
      {
        method: "GET",
        credentials: "include"
      }
    )

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use this feature."
        }
      }

      return {
        success: false,
        error: errorData.error || "Failed to fetch Linear preference"
      }
    }

    const result = await response.json()
    console.log("✅ Linear preference fetched successfully:", result.preference)

    return {
      success: true,
      preference: result.preference
    }
  } catch (error) {
    console.error("❌ Linear preference fetch error:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch Linear preference"
    }
  }
}

async function handleLinearUpdatePreference(data: {
  teamId?: string
  teamName?: string
  projectId?: string
  projectName?: string
}): Promise<{
  success: boolean
  preference?: {
    id: string
    lastUsedTeamId: string | undefined
    lastUsedTeamName: string | undefined
    lastUsedProjectId: string | undefined
    lastUsedProjectName: string | undefined
    updatedAt: string
  }
  error?: string
}> {
  try {
    console.log("🎯 Updating Linear preference:", data)

    const response = await fetch(
      `${PIXZLO_WEB_URL}/api/integrations/linear/preferences`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(data)
      }
    )

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use this feature."
        }
      }

      return {
        success: false,
        error: errorData.error || "Failed to update Linear preference"
      }
    }

    const result = await response.json()
    console.log("✅ Linear preference updated successfully:", result.preference)

    return {
      success: true,
      preference: result.preference
    }
  } catch (error) {
    console.error("❌ Linear preference update error:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update Linear preference"
    }
  }
}

interface FigmaMetadataResponse {
  integration:
    | {
        id: string
        workspace_id: string
        integration_type: string
        configured_by: string
        is_active: boolean
        created_at: string
        updated_at: string
        integration_data: Record<string, unknown> | undefined
      }
    | undefined
  token:
    | {
        accessToken?: string
        expiresAt?: string | undefined
        status: "valid" | "missing" | "expired" | "invalid"
        error?: string
      }
    | undefined
  website:
    | {
        domain: string
        url: string
        id: string | undefined
      }
    | undefined
  designLinks: Array<{
    id: string
    website_id: string
    figma_file_id: string
    figma_frame_id: string
    frame_name: string | undefined
    frame_url: string
    thumbnail_url: string | undefined
    created_at: string
    created_by: string | undefined
    updated_at: string
    is_active: boolean | undefined
  }>
  preference:
    | {
        id: string
        lastUsedFrameId: string
        lastUsedFrameName: string | undefined
        lastUsedFileId: string
        frameUrl: string | undefined
        frameImageUrl: string | undefined
        updatedAt: string
      }
    | undefined
}

async function handleLinearStatusCheckCached(): Promise<{
  success: boolean
  data?: LinearStatusResponse
  error?: string
}> {
  return handleLinearStatusCheck()
}

async function handleFigmaFetchMetadata(data: {
  websiteUrl?: string | undefined
  force?: boolean | undefined
}): Promise<{
  success: boolean
  data?: FigmaMetadataResponse
  error?: string
}> {
  try {
    if (data.force) {
      figmaMetadataCache.data = undefined
      figmaMetadataCache.expiresAt = undefined
    }

    const url = `${PIXZLO_WEB_URL}/api/integrations/figma/metadata${
      data.websiteUrl
        ? `?websiteUrl=${encodeURIComponent(data.websiteUrl)}`
        : ""
    }`

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use this feature."
        }
      }

      return {
        success: false,
        error: errorData.error || "Failed to fetch Figma metadata"
      }
    }

    const result = (await response.json()) as {
      success: boolean
      data?: FigmaMetadataResponse
      error?: string
    }

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch Figma metadata"
      }
    }

    // Cache metadata (including decrypted token) for subsequent token requests
    figmaMetadataCache.data = result.data
    figmaMetadataCache.expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    return {
      success: true,
      data: result.data
    }
  } catch (error) {
    console.error("❌ Figma metadata fetch error:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch Figma metadata"
    }
  }
}

async function handleFigmaUpdatePreference(data: {
  websiteUrl: string
  frameId: string
  frameName?: string
  fileId?: string
  frameUrl?: string
  frameImageUrl?: string
}): Promise<{
  success: boolean
  data?: FigmaMetadataResponse
  error?: string
}> {
  try {
    const response = await fetch(
      `${PIXZLO_WEB_URL}/api/integrations/figma/preferences`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(data)
      }
    )

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use this feature."
        }
      }

      return {
        success: false,
        error: errorData.error || "Failed to update Figma preference"
      }
    }

    // After updating the preference retrieve metadata again
    return handleFigmaFetchMetadata({ websiteUrl: data.websiteUrl })
  } catch (error) {
    console.error("❌ Figma preference update error:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update Figma preference"
    }
  }
}

async function handleFigmaCreateDesignLink(data: {
  websiteUrl?: string | undefined
  pageTitle?: string | undefined
  faviconUrl?: string | undefined
  linkData: {
    figma_file_id: string
    figma_frame_id: string
    frame_name?: string
    frame_url: string
    thumbnail_url?: string
  }
}): Promise<{
  success: boolean
  data?: FigmaMetadataResponse
  error?: string
}> {
  try {
    const websiteUrl = data.websiteUrl ?? window.location.href
    const url = `${PIXZLO_WEB_URL}/api/websites/figma-links`

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        websiteUrl,
        pageTitle: data.pageTitle, // Pass the page title from document.title
        faviconUrl: data.faviconUrl, // Pass the favicon URL detected from the page
        ...data.linkData
      })
    })

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use this feature."
        }
      }

      return {
        success: false,
        error: errorData.error || "Failed to create Figma design link"
      }
    }

    return handleFigmaFetchMetadata({ websiteUrl })
  } catch (error) {
    console.error("❌ Figma create design link error:", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create design link"
    }
  }
}

async function handleFigmaDeleteDesignLink(data: {
  websiteUrl?: string | undefined
  linkId: string
}): Promise<{
  success: boolean
  data?: FigmaMetadataResponse
  error?: string
}> {
  try {
    const websiteUrl = data.websiteUrl ?? window.location.href
    const url = `${PIXZLO_WEB_URL}/api/websites/figma-links/${data.linkId}`

    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))

      if (response.status === 401) {
        return {
          success: false,
          error: "Please log in to Pixzlo to use this feature."
        }
      }

      return {
        success: false,
        error: errorData.error || "Failed to delete Figma design link"
      }
    }

    return handleFigmaFetchMetadata({ websiteUrl })
  } catch (error) {
    console.error("❌ Figma delete design link error:", error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete design link"
    }
  }
}

// ============================================================================
// Extension Pinned State Handler
// ============================================================================

/**
 * Check if the extension is pinned to the toolbar.
 * Uses chrome.action.getUserSettings() API (Chrome 91+).
 */
async function checkExtensionPinnedState(): Promise<boolean> {
  try {
    const settings = await chrome.action.getUserSettings()
    return settings.isOnToolbar
  } catch (error) {
    console.error("[Pixzlo] Failed to check pinned state:", error)
    return false
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("🔧 Background received message:", message)

  // Handle extension pinned state check
  if (message.type === "GET_PINNED_STATE") {
    console.log("📌 Checking extension pinned state...")
    checkExtensionPinnedState()
      .then((isPinned) => {
        console.log("📌 Extension pinned state:", isPinned)
        sendResponse({ success: true, isPinned })
      })
      .catch((error) => {
        console.error("❌ Failed to check pinned state:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true // Keep message channel open for async response
  }

  // Handle Linear integration status check
  if (message.type === "linear-check-status") {
    handleLinearStatusCheckCached()
      .then(sendResponse)
      .catch((error) => {
        console.error("❌ Linear status check failed:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true // Keep message channel open for async response
  }

  // Handle Linear issue creation
  if (message.type === "linear-create-issue") {
    handleLinearCreateIssue(message.data)
      .then(sendResponse)
      .catch((error) => {
        console.error("❌ Linear issue creation failed:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true // Keep message channel open for async response
  }

  // Handle Linear metadata fetch (legacy alias)
  if (message.type === "linear-fetch-options") {
    handleLinearFetchMetadata()
      .then(sendResponse)
      .catch((error) => {
        console.error("❌ Linear metadata fetch failed:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true // Keep message channel open for async response
  }

  if (message.type === "linear-fetch-metadata") {
    handleLinearFetchMetadata()
      .then(sendResponse)
      .catch((error) => {
        console.error("❌ Linear metadata fetch failed:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  // Handle fetching pages tree for hierarchical page selection
  if (message.type === "FETCH_PAGES_TREE") {
    console.log("Background script - Fetching pages tree")
    ;(async () => {
      try {
        const response = await fetch(`${PIXZLO_WEB_URL}/api/websites/tree`, {
          method: "GET",
          credentials: "include"
        })

        if (!response.ok) {
          if (response.status === 401) {
            sendResponse({
              success: false,
              error: "Please log in to Pixzlo to access pages."
            })
            return
          }

          const errorData = await response.json().catch(() => ({}))
          sendResponse({
            success: false,
            error:
              (errorData as { error?: string }).error ||
              `Failed to fetch pages (${response.status})`
          })
          return
        }

        const data = await response.json()
        sendResponse({
          success: true,
          data: data
        })
      } catch (error) {
        console.error("Background script - Pages tree fetch error:", error)
        sendResponse({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch pages tree"
        })
      }
    })()

    return true
  }

  if (message.type === "FIGMA_API_CALL") {
    console.log("Background script - Figma API call requested:", message.method)

    if (message.method === "GET_FILE") {
      const fileId = message.fileId

      ;(async () => {
        try {
          console.log("Background script - Fetching Figma file directly")
          const figmaData = await fetchFigmaFileDirect(fileId)

          const documentNode = figmaData?.nodes
            ? Object.values(figmaData.nodes)[0]
            : undefined

          if (!documentNode) {
            throw new Error("Invalid Figma file response")
          }

          const frames = extractFramesFromFigmaData({
            document: documentNode
          } as any)

          sendResponse({
            success: true,
            data: {
              id: fileId,
              name: figmaData?.name,
              pages: (documentNode as any)?.children || [],
              frames,
              document: documentNode
            }
          })
        } catch (error) {
          console.error("Background script - Figma API error:", error)
          sendResponse({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch Figma file"
          })
        }
      })()

      return true
    }
  }

  if (message.type === "FIGMA_RENDER_FRAME") {
    console.log(
      "Background script - Figma frame render requested:",
      message.figmaUrl
    )

    const { figmaUrl } = message

    // Parse Figma URL to extract file ID and node ID
    const parsed = parseFigmaUrl(figmaUrl)
    if (!parsed || !parsed.fileId) {
      sendResponse({
        success: false,
        error: "Invalid Figma URL. Could not extract file ID or node ID."
      })
      return true
    }

    const { fileId, nodeId } = parsed
    console.log(
      `Background script - Extracted fileId: ${fileId}, nodeId: ${nodeId}`
    )

    if (!nodeId) {
      sendResponse({
        success: false,
        error: "Invalid Figma URL. Missing node ID."
      })
      return true
    }

    const cacheKey = `${fileId}:${nodeId}`
    const cachedFrame = frameRenderResultCache.get(cacheKey)
    const now = Date.now()

    if (cachedFrame) {
      if (cachedFrame.expiresAt > now) {
        console.log(
          "Background script - Using cached frame render result for:",
          cacheKey
        )
        try {
          sendResponse({
            success: true,
            data: cachedFrame.data
          })
          console.log("✅ BACKGROUND: Response sent successfully (cached)")
        } catch (error) {
          console.error("❌ BACKGROUND: Error sending cached response:", error)
        }
        return true
      }

      frameRenderResultCache.delete(cacheKey)
    }

    let frameRequest = inFlightFrameRenderRequests.get(cacheKey)

    if (frameRequest) {
      console.log(
        "Background script - Reusing in-flight frame render for:",
        cacheKey
      )
    } else {
      frameRequest = (async () => {
        console.log(
          "Background script - Getting file data directly from Figma..."
        )
        const figmaData = await fetchFigmaFileDirect(fileId)

        const documentNode = figmaData?.nodes
          ? Object.values(figmaData.nodes)[0]
          : undefined
        const figmaDocument = { document: documentNode } as any

        if (!documentNode) {
          throw new Error("Invalid Figma file response")
        }

        // Find the specific frame/node
        const frameData = findNodeById(figmaDocument, nodeId)
        if (!frameData) {
          throw new Error(`Frame with node-id ${nodeId} not found in file`)
        }

        console.log("Background script - Found frame:", frameData.name)

        // Extract all elements from the frame
        const elements = extractElementsFromNode(frameData, nodeId)
        console.log(
          `Background script - Found ${elements.length} elements in frame`
        )

        // 🔍 DEBUG: Log frameData before sending to frontend
        console.log("🔍 BACKGROUND: frameData being sent to frontend:", {
          id: frameData.id,
          name: frameData.name,
          type: frameData.type,
          hasAbsoluteBoundingBox: !!frameData.absoluteBoundingBox
        })

        // Render the frame as an image
        console.log("🔍 BACKGROUND: Starting to render frame image...")
        const imageUrl = await renderFigmaNode(fileId, nodeId)
        console.log("🔍 BACKGROUND: Frame image rendered, URL:", imageUrl)

        const responseData: FrameRenderResponse = {
          fileId,
          nodeId,
          frameData,
          elements,
          imageUrl,
          fileName: figmaData.name
        }

        console.log("🔍 BACKGROUND: Sending complete response with imageUrl:", {
          hasImageUrl: !!responseData.imageUrl,
          imageUrlLength: responseData.imageUrl?.length || 0
        })

        frameRenderResultCache.set(cacheKey, {
          data: responseData,
          expiresAt: Date.now() + FRAME_RENDER_CACHE_TTL
        })

        return responseData
      })()

      inFlightFrameRenderRequests.set(cacheKey, frameRequest)
    }

    frameRequest
      .then((responseData) => {
        try {
          sendResponse({
            success: true,
            data: responseData
          })
          console.log("✅ BACKGROUND: Response sent successfully")
        } catch (error) {
          console.error("❌ BACKGROUND: Error sending response:", error)
        }
      })
      .catch((error) => {
        frameRenderResultCache.delete(cacheKey)
        console.error("Background script - Frame render error:", error)
        try {
          sendResponse({
            success: false,
            error: error.message || "Failed to render Figma frame"
          })
        } catch (sendError) {
          console.error(
            "❌ BACKGROUND: Error sending failure response:",
            sendError
          )
        }
      })
      .finally(() => {
        inFlightFrameRenderRequests.delete(cacheKey)
      })

    return true
  }

  if (message.type === "FIGMA_RENDER_ELEMENT") {
    console.log(
      "Background script - Figma element render requested:",
      message.fileId,
      message.nodeId
    )

    const { fileId, nodeId } = message

    // Defensive check for undefined nodeId
    if (!nodeId) {
      console.error(
        "❌ Background script error: Received a request to render an element with an undefined nodeId."
      )
      sendResponse({
        success: false,
        error: "Render failed: Node ID was undefined."
      })
      return true
    }

    renderFigmaNode(fileId, nodeId)
      .then((imageUrl) => {
        console.log("Background script - Got element image URL:", imageUrl)

        sendResponse({
          success: true,
          data: {
            imageUrl: imageUrl, // Send the raw URL
            nodeId: nodeId,
            fileId: fileId
          }
        })
      })
      .catch((error) => {
        console.error("Background script - Element render error:", error)
        sendResponse({
          success: false,
          error: error.message || "Failed to render element"
        })
      })

    return true
  }

  if (message.type === "FETCH_IMAGE_DATA_URL") {
    console.log("📥 Background fetching image data URL:", message.url)

    fetch(message.url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch image: ${response.status} ${response.statusText}`
          )
        }
        return response.blob()
      })
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              if (typeof reader.result === "string") {
                resolve(reader.result)
              } else {
                reject(new Error("Failed to convert blob to data URL"))
              }
            }
            reader.onerror = () =>
              reject(new Error("Failed to read image blob"))
            reader.readAsDataURL(blob)
          })
      )
      .then((dataUrl) => {
        console.log("✅ Background image fetch successful")
        sendResponse({
          success: true,
          dataUrl
        })
      })
      .catch((error) => {
        console.error("❌ Background image fetch error:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })

    return true
  }

  if (message.type === "CAPTURE_ELEMENT_SCREENSHOT") {
    console.log(
      "Background script - Screenshot capture requested:",
      message.area
    )

    try {
      // Capture the visible tab (like @reviewit)
      chrome.tabs.captureVisibleTab(
        null,
        {
          format: "png"
        },
        (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Screenshot capture failed:",
              chrome.runtime.lastError
            )
            sendResponse({
              success: false,
              error: chrome.runtime.lastError.message
            })
          } else {
            console.log("✅ Screenshot captured successfully")
            // Send the screenshot back to content script for cropping (like @reviewit)
            sendResponse({
              success: true,
              screenshotDataUrl: dataUrl,
              area: message.area
            })
          }
        }
      )
    } catch (error) {
      console.error("Screenshot capture error:", error)
      sendResponse({
        success: false,
        error: error.message || "Failed to capture screenshot"
      })
    }

    return true // Keep channel open for async response
  }

  if (message.type === "FIGMA_GET_IMAGE") {
    console.log(
      "Background script - Figma image requested for:",
      message.nodeId
    )

    const { fileId, nodeId } = message

    renderFigmaNode(fileId, nodeId)
      .then((imageUrl) => {
        console.log("Background script - Got Figma node image URL:", imageUrl)

        sendResponse({
          success: true,
          data: {
            imageUrl: imageUrl
          }
        })
      })
      .catch((error) => {
        console.error("Background script - Image fetch error:", error)
        sendResponse({
          success: false,
          error: error.message || "Failed to fetch image"
        })
      })

    return true
  }

  if (message.type === "FIGMA_OAUTH") {
    console.log("Background script - Figma OAuth requested")

    // Get auth URL and launch OAuth immediately for speed
    const startTime = Date.now()

    fetch(`${PIXZLO_WEB_URL}/api/integrations/figma/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(async (response) => {
        const elapsed = Date.now() - startTime
        console.log(`Background script - Got auth URL in ${elapsed}ms`)

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        return data.authUrl
      })
      .then((authUrl) => {
        // Launch OAuth with custom popup dimensions (Chrome will position it)
        const popupWidth = 500
        const popupHeight = 700

        chrome.windows.create(
          {
            url: authUrl,
            type: "popup",
            width: popupWidth,
            height: popupHeight,
            focused: true
          },
          (authWindow) => {
            if (!authWindow) {
              sendResponse({
                success: false,
                error: "Failed to create auth window"
              })
              return
            }

            // Listen for URL changes in the auth window
            const onTabUpdated = (
              tabId: number,
              changeInfo: chrome.tabs.TabChangeInfo,
              tab: chrome.tabs.Tab
            ) => {
              if (tab.windowId === authWindow.id && changeInfo.url && tab.url) {
                // Check if this is the callback URL (PIXZLO_WEB_URL or pixzlo.com /settings/integrations)
                if (
                  (tab.url.includes(
                    `${PIXZLO_WEB_URL}/settings/integrations`
                  ) ||
                    tab.url.includes("pixzlo.com/settings/integrations")) &&
                  (tab.url.includes("success=") || tab.url.includes("error="))
                ) {
                  const totalTime = Date.now() - startTime
                  console.log(
                    `Background script - OAuth completed in ${totalTime}ms. URL: ${tab.url}`
                  )

                  // Clean up listeners
                  chrome.tabs.onUpdated.removeListener(onTabUpdated)
                  chrome.windows.onRemoved.removeListener(onWindowRemoved)

                  // Close the auth window
                  chrome.windows.remove(authWindow.id)

                  // Parse URL to get success/error status
                  const urlObj = new URL(tab.url)
                  const successParam = urlObj.searchParams.get("success")
                  const errorParam = urlObj.searchParams.get("error")

                  if (successParam) {
                    console.log(`OAuth success: ${successParam}`)
                    figmaMetadataCache.data = undefined
                    figmaMetadataCache.expiresAt = undefined
                    sendResponse({ success: true })
                  } else if (errorParam) {
                    console.log(`OAuth error: ${errorParam}`)
                    sendResponse({
                      success: false,
                      error: decodeURIComponent(errorParam)
                    })
                  } else {
                    sendResponse({
                      success: false,
                      error: "OAuth failed or was cancelled"
                    })
                  }
                }
              }
            }

            // Handle window being closed manually
            const onWindowRemoved = (windowId: number) => {
              if (windowId === authWindow.id) {
                chrome.tabs.onUpdated.removeListener(onTabUpdated)
                chrome.windows.onRemoved.removeListener(onWindowRemoved)
                sendResponse({
                  success: false,
                  error: "OAuth cancelled by user"
                })
              }
            }

            chrome.tabs.onUpdated.addListener(onTabUpdated)
            chrome.windows.onRemoved.addListener(onWindowRemoved)
          }
        )
      })
      .catch((error) => {
        console.error("Background script - OAuth failed:", error)
        sendResponse({
          success: false,
          error: error.message || "Failed to setup OAuth"
        })
      })

    return true
  }

  if (message.type === "capture-screen") {
    if (!sender.tab?.windowId) {
      sendResponse({
        success: false,
        error: "Capture denied: no active tab context"
      })
      return true
    }

    chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: "png" },
      (dataUrl) => {
        sendResponse({ dataUrl, success: true })
      }
    )
    return true
  }

  if (message.type === "API_CALL") {
    const { endpoint, options } = message
    const url = `${PIXZLO_WEB_URL}${endpoint}`

    console.log("Background script - Making API call:", url, options)

    fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      body: options.body,
      credentials: "include"
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: `HTTP ${response.status} ${response.statusText}`
          }))
          sendResponse({
            success: false,
            error: errorData.error || `HTTP ${response.status}`
          })
          return
        }

        const data = await response.json()
        console.log("Background script - API response:", data)
        sendResponse({ success: true, data })
      })
      .catch((error) => {
        console.error("Background script - API call error:", error)
        sendResponse({
          success: false,
          error: error.message || "Network error"
        })
      })

    return true // Keep message channel open for async response
  }

  if (message.type === "dummy-api-call") {
    fetch("https://jsonplaceholder.typicode.com/posts/1")
      .then((response) => response.json())
      .then((data) => {
        console.log("Background script - Dummy API response:", data)
        sendResponse({ success: true, data })
      })
      .catch((error) => {
        console.error("Background script - Error calling dummy API:", error)
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  // End-to-end issue submission from background
  if (message.type === "SUBMIT_ISSUE") {
    ;(async () => {
      try {
        const payload = message.payload || {}
        console.log(
          "📡 Using batch create endpoint for faster issue creation..."
        )

        // Helper functions
        const sanitizeDim = (value) => {
          if (!value || typeof value !== "string") return undefined
          return value
            .replace(/×/g, "x")
            .replace(/\s+/g, "")
            .replace(/px/gi, "")
            .replace(/[^0-9x]/g, "")
        }

        const parseBrowserInfo = (browserInfo) => {
          if (!browserInfo) return undefined
          return {
            name: browserInfo.name || "Unknown",
            version: browserInfo.version || "Unknown",
            userAgent: browserInfo.userAgent || undefined
          }
        }

        // Get workspace ID
        const profileRes = await fetch(`${PIXZLO_WEB_URL}/api/user/profile`, {
          method: "GET",
          credentials: "include"
        })
        if (!profileRes.ok) {
          throw new Error(`Failed to load profile: ${profileRes.status}`)
        }
        const profileData = await profileRes.json()
        const workspaces = profileData?.profile?.workspaces || []
        if (!Array.isArray(workspaces) || workspaces.length === 0) {
          throw new Error("No workspace found for user")
        }
        const workspaceId =
          workspaces[0]?.id || workspaces[0]?.workspace_id || workspaces[0]
        if (!workspaceId) throw new Error("Workspace ID missing")

        // Prepare batch create request
        const websiteUrl = payload?.metadata?.url
        const title = (payload.title || "Untitled issue").slice(0, 200)
        const description = payload.description || ""
        const hasDesign = !!payload?.figma?.figmaUrl
        const issueType = hasDesign
          ? "screenshot_with_design"
          : payload.issue_type ||
            (payload?.isElementCapture ? "comparison" : "screenshot")
        const severity = payload.priority || "medium"

        // Prepare images array
        const images = []
        if (payload?.images?.clean) {
          images.push({
            data: payload.images.clean,
            type: "element",
            order_index: 0
          })
        }
        if (payload?.images?.annotated) {
          images.push({
            data: payload.images.annotated,
            type: "main",
            order_index: 1
          })
        }

        // Add Figma image if available
        if (payload?.figma?.imageUrl) {
          try {
            const imgRes = await fetch(payload.figma.imageUrl, {
              cache: "no-store"
            })
            if (imgRes.ok) {
              const blob = await imgRes.blob()
              const reader = new FileReader()
              const base64Promise = new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(blob)
              })
              const base64 = await base64Promise
              images.push({
                data: base64,
                type: "figma",
                order_index: 2
              })
            }
          } catch (e) {
            console.warn("Failed to fetch Figma image:", e)
          }
        }

        // Prepare batch create body
        const deviceInfo = payload?.metadata?.device
          ? {
              device: payload.metadata.device,
              os: "unknown",
              version: undefined
            }
          : undefined

        const batchBody = {
          workspace_id: workspaceId,
          title,
          description,
          severity,
          issue_type: issueType,
          website_url: websiteUrl,
          figma_link: payload?.figma?.figmaUrl,
          device_info: deviceInfo,
          browser_info: parseBrowserInfo(payload?.browserInfo),
          screen_resolution: sanitizeDim(payload?.metadata?.screenResolution),
          viewport_size: sanitizeDim(payload?.metadata?.viewportSize),
          images: images.length > 0 ? images : undefined,
          css_styles: payload?.cssStyles || undefined,
          figma_link_data:
            payload?.figma?.fileId && payload?.figma?.frameId
              ? {
                  figma_file_id: payload.figma.fileId,
                  figma_frame_id: payload.figma.frameId,
                  frame_name: payload.figma.frameName,
                  frame_url: payload.figma.figmaUrl,
                  thumbnail_url: payload.figma.thumbnailUrl,
                  page_url: websiteUrl
                }
              : undefined,
          linear_enabled: payload?.linearEnabled || false,
          linear_options: payload?.linearOptions
            ? {
                teamId: payload.linearOptions.teams?.id,
                projectId: payload.linearOptions.projects?.id,
                assigneeId: payload.linearOptions.users?.id,
                stateId: payload.linearOptions.workflowStates?.id
              }
            : undefined
        }

        console.log("📤 Sending batch create request...")
        console.log("🔍 Batch body:", JSON.stringify(batchBody, null, 2))
        console.log("🔍 Figma link data:", batchBody.figma_link_data)
        console.log("🔍 Linear options:", batchBody.linear_options)

        // Single batch create call
        const batchRes = await fetch(
          `${PIXZLO_WEB_URL}/api/issues/batch-create`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(batchBody)
          }
        )

        if (!batchRes.ok) {
          const err = await batchRes.json().catch(() => ({}))
          throw new Error(
            `Batch create failed: ${batchRes.status} ${err.error || ""}`
          )
        }

        const batchResult = await batchRes.json()
        const issueId = batchResult?.data?.issueId
        const issueUrl = batchResult?.data?.issueUrl

        if (!issueId) {
          throw new Error("No issue ID returned from batch create")
        }

        console.log("✅ Issue created successfully:", issueUrl)
        sendResponse({ success: true, data: { issueId, issueUrl } })
      } catch (error) {
        console.error("Background script - SUBMIT_ISSUE error:", error)
        sendResponse({
          success: false,
          error: error?.message || "Submit failed"
        })
      }
    })()
    return true
  }

  // Handle Figma preference fetch
  if (message.type === "figma-fetch-preference") {
    handleFigmaFetchPreference(message.data)
      .then(sendResponse)
      .catch((error) => {
        console.error("❌ Figma preference fetch failed:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true // Keep message channel open for async response
  }

  // Handle Figma preference update
  if (message.type === "figma-update-preference") {
    handleFigmaUpdatePreference(message.data)
      .then(sendResponse)
      .catch((error) => {
        console.error("❌ Figma preference update failed:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  // Handle Linear preference fetch
  if (message.type === "linear-fetch-preference") {
    handleLinearFetchPreference()
      .then(sendResponse)
      .catch((error) => {
        console.error("❌ Linear preference fetch failed:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true // Keep message channel open for async response
  }

  // Handle Linear preference update
  if (message.type === "linear-update-preference") {
    handleLinearUpdatePreference(message.data)
      .then(sendResponse)
      .catch((error) => {
        console.error("❌ Linear preference update failed:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true // Keep message channel open for async response
  }

  if (message.type === "figma-fetch-metadata") {
    handleFigmaFetchMetadata(message.data || {})
      .then(sendResponse)
      .catch((error) => {
        console.error("❌ Figma metadata fetch failed:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  if (message.type === "figma-create-design-link") {
    handleFigmaCreateDesignLink(message.data)
      .then(sendResponse)
      .catch((error) => {
        console.error("❌ Figma design link creation failed:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }

  if (message.type === "figma-delete-design-link") {
    handleFigmaDeleteDesignLink(message.data)
      .then(sendResponse)
      .catch((error) => {
        console.error("❌ Figma design link deletion failed:", error)
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      })
    return true
  }
})
