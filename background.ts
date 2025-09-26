// Hard-code the URL for now - update this to your Pixzlo-web URL
const PIXZLO_WEB_URL = "http://localhost:3000"

// Token cache to avoid repeated API calls
let tokenCache = {
  data: null,
  expiresAt: null,
  isRefreshing: false
}

// Helper function to get cached token or fetch new one
async function getCachedToken() {
  // Check if we have a valid cached token
  if (
    tokenCache.data &&
    tokenCache.expiresAt &&
    new Date() < tokenCache.expiresAt
  ) {
    console.log("🔑 Using cached token")
    return tokenCache.data
  }

  // If already refreshing, wait for it
  if (tokenCache.isRefreshing) {
    console.log("🔑 Token refresh in progress, waiting...")
    while (tokenCache.isRefreshing) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return tokenCache.data
  }

  // Fetch new token
  console.log("🔑 Fetching new token...")
  tokenCache.isRefreshing = true

  try {
    const response = await fetch(
      `${PIXZLO_WEB_URL}/api/integrations/figma/token`,
      {
        method: "GET",
        credentials: "include"
      }
    )

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }))
      throw new Error(
        `Token fetch failed: ${response.status} - ${errorData.error}`
      )
    }

    const tokenData = await response.json()

    // Check token expiration
    if (tokenData.expires_at) {
      const expirationDate = new Date(tokenData.expires_at)
      const now = new Date()
      if (expirationDate <= now) {
        throw new Error("Token has expired")
      }
      tokenCache.expiresAt = expirationDate
    } else {
      // If no expiration, cache for 1 hour
      tokenCache.expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    }

    tokenCache.data = tokenData
    console.log("🔑 Token cached successfully")
    return tokenData
  } catch (error) {
    console.error("🔑 Token fetch error:", error)
    throw error
  } finally {
    tokenCache.isRefreshing = false
  }
}

// Helper function to parse Figma URL and extract file ID and node ID
function parseFigmaUrl(url) {
  try {
    const urlObj = new URL(url)

    // Extract file ID from different URL patterns
    let fileId = null
    if (url.includes("/design/")) {
      fileId = url.match(/\/design\/([^\/\?]+)/)?.[1]
    } else if (url.includes("/file/")) {
      fileId = url.match(/\/file\/([^\/\?]+)/)?.[1]
    }

    // Extract node ID from URL params
    const nodeId = urlObj.searchParams.get("node-id")

    return {
      fileId: fileId,
      nodeId: nodeId ? nodeId.replace("-", ":") : null // Convert 119-1968 to 119:1968
    }
  } catch (error) {
    console.error("Failed to parse Figma URL:", error)
    return null
  }
}

// Helper function to extract frames from Figma file data (based on reviewit implementation)
function extractFramesFromFigmaData(data) {
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

// Helper function to extract elements from a specific frame/node
function extractElementsFromNode(node, frameId) {
  const elements = []

  function traverseNode(currentNode, depth = 0) {
    // Only include interactive elements and visible elements
    if (currentNode.id !== frameId && currentNode.visible !== false) {
      const element = {
        id: currentNode.id,
        name: currentNode.name,
        type: currentNode.type,
        absoluteBoundingBox: currentNode.absoluteBoundingBox,
        relativeTransform: currentNode.relativeTransform,
        constraints: currentNode.constraints,
        depth: depth
      }

      // Add element if it has bounding box
      if (currentNode.absoluteBoundingBox) {
        elements.push(element)
      }
    }

    // Recursively traverse children
    if (currentNode.children) {
      currentNode.children.forEach((child) => traverseNode(child, depth + 1))
    }
  }

  traverseNode(node)
  return elements
}

// Helper function to find a specific node by ID in Figma data
function findNodeById(data, nodeId) {
  function searchNode(node) {
    if (node.id === nodeId) {
      return node
    }
    if (node.children) {
      for (const child of node.children) {
        const found = searchNode(child)
        if (found) return found
      }
    }
    return null
  }

  if (data.document && data.document.children) {
    for (const page of data.document.children) {
      const found = searchNode(page)
      if (found) return found
    }
  }
  return null
}

// Helper to convert data URL to Blob (for Konva exports)
function dataUrlToBlob(dataUrl: string): Blob | null {
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
    return null
  }
}

// Helper function to render a Figma frame/node as an image (based on reviewit implementation)
async function renderFigmaNode(fileId, nodeId, token) {
  // Use cache-busting headers only (version parameter not supported for images endpoint)
  const response = await fetch(
    `https://api.figma.com/v1/images/${fileId}?ids=${nodeId}&format=png&scale=2&use_absolute_bounds=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0"
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to render Figma node: ${response.status}`)
  }

  const data = await response.json()

  if (data.err) {
    throw new Error(`Figma API error: ${data.err}`)
  }

  const imageUrl = data.images[nodeId]
  if (!imageUrl) {
    throw new Error("No image URL returned from Figma API")
  }

  return imageUrl
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FIGMA_API_CALL") {
    console.log("Background script - Figma API call requested:", message.method)

    if (message.method === "GET_FILE") {
      const fileId = message.fileId

      // Get decrypted token from backend, then call Figma API directly
      console.log("Background script - Getting decrypted Figma token...")

      getCachedToken()
        .then(async (tokenData) => {
          console.log(
            "Background script - Got token, calling Figma API directly..."
          )
          // Add cache-busting parameter to ensure fresh data
          const cacheBust = Date.now()
          const figmaUrl = `https://api.figma.com/v1/files/${fileId}?version=${cacheBust}`

          console.log("Background script - Figma API URL:", figmaUrl)
          console.log(
            "Background script - Token available:",
            !!tokenData.access_token
          )
          console.log(
            "Background script - Token preview:",
            tokenData.access_token
              ? tokenData.access_token.substring(0, 10) +
                  "..." +
                  tokenData.access_token.substring(
                    tokenData.access_token.length - 5
                  )
              : "NO TOKEN"
          )

          // Validate token with Figma API (same as working Python script)
          console.log("Background script - Validating Figma token...")

          return fetch("https://api.figma.com/v1/me", {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`
            }
          }).then(async (validateResponse) => {
            if (validateResponse.ok) {
              const userInfo = await validateResponse.json()
              console.log(
                "Background script - Token validated for user:",
                userInfo.email || userInfo.handle
              )
            } else {
              console.error(
                "Background script - Token validation failed:",
                validateResponse.status
              )
              throw new Error(
                `Token validation failed: ${validateResponse.status}`
              )
            }

            // Get Figma file (same approach as Python script)
            console.log(`Background script - Fetching file: ${fileId}`)

            return fetch(figmaUrl, {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                "Cache-Control": "no-cache, no-store, must-revalidate",
                Pragma: "no-cache",
                Expires: "0"
              }
            }).then(async (response) => {
              if (response.ok) {
                const figmaData = await response.json()
                console.log(
                  "Background script - Got Figma file:",
                  figmaData.name
                )

                // Extract frames from the file
                const frames = extractFramesFromFigmaData(figmaData)
                console.log(
                  "Background script - Found frames:",
                  frames.map((f) => f.name)
                )

                sendResponse({
                  success: true,
                  data: {
                    id: fileId,
                    name: figmaData.name,
                    pages: figmaData.document?.children || [],
                    frames: frames,
                    document: figmaData.document
                  }
                })
              } else {
                console.error(
                  "Background script - File access failed:",
                  response.status
                )
                throw new Error(`File access failed: ${response.status}`)
              }
            })
          })
        })
        .catch((error) => {
          console.error("Background script - Figma API error:", error)

          sendResponse({
            success: false,
            error: error.message || "Failed to fetch Figma file"
          })
        })

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

    // Get token first
    getCachedToken()
      .then(async (tokenData) => {
        // Get file data first to find the frame and its elements
        console.log("Background script - Getting file data for frame...")
        return fetch(`https://api.figma.com/v1/files/${fileId}`, {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`
          }
        }).then(async (fileResponse) => {
          if (!fileResponse.ok) {
            throw new Error(`File access failed: ${fileResponse.status}`)
          }
          const figmaData = await fileResponse.json()

          // Find the specific frame/node
          const frameData = findNodeById(figmaData, nodeId)
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
          const imageUrl = await renderFigmaNode(
            fileId,
            nodeId,
            tokenData.access_token
          )
          console.log("🔍 BACKGROUND: Frame image rendered, URL:", imageUrl)

          const responseData = {
            fileId: fileId,
            nodeId: nodeId,
            frameData: frameData,
            elements: elements,
            imageUrl: imageUrl,
            fileName: figmaData.name
          }

          console.log(
            "🔍 BACKGROUND: Sending complete response with imageUrl:",
            {
              hasImageUrl: !!responseData.imageUrl,
              imageUrlLength: responseData.imageUrl?.length || 0
            }
          )

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
      })
      .catch((error) => {
        console.error("Background script - Frame render error:", error)
        sendResponse({
          success: false,
          error: error.message || "Failed to render Figma frame"
        })
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

    // Get token and render element
    getCachedToken()
      .then(async (tokenData) => {
        console.log(`Background script - Rendering element ${nodeId}`)

        const imageUrl = await renderFigmaNode(
          fileId,
          nodeId,
          tokenData.access_token
        )
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

    // Get token and fetch image
    getCachedToken()
      .then(async (tokenData) => {
        if (tokenData.expires_at) {
          const expirationDate = new Date(tokenData.expires_at)
          const now = new Date()
          if (expirationDate <= now) {
            throw new Error(
              "Figma token has expired. Please reconnect your Figma integration."
            )
          }
        }

        // Use the helper function to render Figma node as image (like reviewit)
        console.log(
          `Background script - Rendering Figma node ${nodeId} from file ${fileId}`
        )

        try {
          const imageUrl = await renderFigmaNode(
            fileId,
            nodeId,
            tokenData.access_token
          )
          console.log("Background script - Got Figma node image URL:", imageUrl)

          sendResponse({
            success: true,
            data: {
              imageUrl: imageUrl
            }
          })
        } catch (error) {
          console.error(
            "Background script - Failed to render Figma node:",
            error
          )

          sendResponse({
            success: false,
            error: error.message || "Failed to render Figma node"
          })
        }
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
        // Launch OAuth with custom popup dimensions
        const popupWidth = 500
        const popupHeight = 700

        // Get current screen dimensions to center the popup
        chrome.system.display.getInfo((displays) => {
          const primaryDisplay =
            displays.find((display) => display.isPrimary) || displays[0]
          const screenWidth = primaryDisplay.bounds.width
          const screenHeight = primaryDisplay.bounds.height

          const left = Math.round((screenWidth - popupWidth) / 2)
          const top = Math.round((screenHeight - popupHeight) / 2)

          chrome.windows.create(
            {
              url: authUrl,
              type: "popup",
              width: popupWidth,
              height: popupHeight,
              left: left,
              top: top,
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
                if (
                  tab.windowId === authWindow.id &&
                  changeInfo.url &&
                  tab.url
                ) {
                  // Check if this is the callback URL (localhost:3000 or pixzlo.com /settings/integrations)
                  if (
                    (tab.url.includes("localhost:3000/settings/integrations") ||
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
    chrome.tabs.captureVisibleTab(
      sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT,
      { format: "png" },
      (dataUrl) => {
        sendResponse({ dataUrl })
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

        const sanitizeDim = (value) => {
          if (!value || typeof value !== "string") return undefined
          return value
            .replace(/×/g, "x")
            .replace(/\s+/g, "")
            .replace(/px/gi, "")
            .replace(/[^0-9x]/g, "")
        }

        const parseDeviceInfo = (value) => {
          if (!value || typeof value !== "string") return undefined
          const parts = value.split(":").map((s) => s.trim())
          if (parts.length === 2) {
            return { device: parts[0], os: parts[1] }
          }
          return { device: value, os: "" }
        }

        const parseBrowserInfo = (browserInfo) => {
          if (!browserInfo) return undefined
          return {
            name: browserInfo.name || "Unknown",
            version: browserInfo.version || "Unknown",
            userAgent: browserInfo.userAgent || navigator.userAgent
          }
        }

        // Resolve workspace from profile
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

        // Ensure website exists
        const websiteUrl = payload?.metadata?.url
        let websiteId = undefined
        if (websiteUrl) {
          const encoded = encodeURIComponent(websiteUrl)
          const getWebsites = await fetch(
            `${PIXZLO_WEB_URL}/api/websites?url=${encoded}`,
            { credentials: "include" }
          )
          if (!getWebsites.ok) {
            throw new Error(`Websites query failed: ${getWebsites.status}`)
          }
          const websitesJson = await getWebsites.json()
          const firstWebsite = Array.isArray(websitesJson.websites)
            ? websitesJson.websites[0]
            : undefined
          if (firstWebsite?.id) {
            websiteId = firstWebsite.id
          } else {
            // Try to fetch website metadata (name, description, favicon)
            let meta = null
            try {
              const metaRes = await fetch(
                `${PIXZLO_WEB_URL}/api/websites/metadata?url=${encoded}`,
                { credentials: "include" }
              )
              if (metaRes.ok) {
                const metaJson = await metaRes.json()
                meta = metaJson?.metadata || null
              }
            } catch (e) {
              console.warn("Website metadata fetch failed:", e)
            }

            const nameFromHost = (() => {
              try {
                const u = new URL(websiteUrl)
                return u.hostname
              } catch {
                return websiteUrl
              }
            })()
            const createWebsite = await fetch(
              `${PIXZLO_WEB_URL}/api/websites`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  name: meta?.name || nameFromHost,
                  url: websiteUrl,
                  description: meta?.description || undefined,
                  favicon_url: meta?.favicon_url || undefined
                })
              }
            )
            if (!createWebsite.ok) {
              const err = await createWebsite.json().catch(() => ({}))
              throw new Error(
                `Website create failed: ${createWebsite.status} ${err.error || ""}`
              )
            }
            const created = await createWebsite.json()
            websiteId = created?.website?.id
          }
        }

        // Build and create the issue
        const title = (payload.title || "Untitled issue").slice(0, 200)
        const description = payload.description || ""
        const hasDesign = !!payload?.figma?.figmaUrl
        const issueType = hasDesign
          ? "screenshot_with_design"
          : payload.issue_type ||
            (payload?.isElementCapture ? "comparison" : "screenshot")
        const severity = payload.priority || "medium"

        const screenResolution = sanitizeDim(
          payload?.metadata?.screenResolution
        )
        const viewportSize = sanitizeDim(payload?.metadata?.viewportSize)
        const deviceInfo = parseDeviceInfo(payload?.metadata?.device)
        const browserInfo = parseBrowserInfo(payload?.browserInfo)

        const createIssueRes = await fetch(`${PIXZLO_WEB_URL}/api/issues`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            workspace_id: workspaceId,
            title,
            description,
            severity,
            issue_type: issueType,
            website_id: websiteId,
            website_url: websiteUrl,
            figma_link: payload?.figma?.figmaUrl,
            device_info: deviceInfo,
            browser_info: browserInfo,
            screen_resolution: screenResolution,
            viewport_size: viewportSize
          })
        })
        if (!createIssueRes.ok) {
          const err = await createIssueRes.json().catch(() => ({}))
          throw new Error(
            `Issue create failed: ${createIssueRes.status} ${err.error || err.message || ""}`
          )
        }
        const issueJson = await createIssueRes.json()
        const issue = issueJson.issue || issueJson.data || issueJson
        const issueId = issue?.id
        if (!issueId) throw new Error("No issue id returned")

        const uploadIssueImage = async ({
          dataUrl,
          imageType,
          altText,
          orderIndex
        }) => {
          if (!dataUrl) return
          let blob = null
          try {
            if (typeof dataUrl === "string" && dataUrl.startsWith("data:")) {
              blob = dataUrlToBlob(dataUrl)
            } else {
              const res = await fetch(dataUrl, { cache: "no-store" })
              blob = await res.blob()
            }
          } catch (e) {
            console.warn("Failed to resolve image data:", e)
            return
          }
          if (!blob) return
          const form = new FormData()
          form.append(
            "file",
            new File([blob], `image-${Date.now()}.png`, {
              type: blob.type || "image/png"
            })
          )
          form.append("image_type", imageType)
          if (altText) form.append("alt_text", altText)
          if (typeof orderIndex === "number")
            form.append("order_index", String(orderIndex))

          const uploadRes = await fetch(
            `${PIXZLO_WEB_URL}/api/issues/${issueId}/images`,
            {
              method: "POST",
              credentials: "include",
              body: form
            }
          )
          if (!uploadRes.ok) {
            const err = await uploadRes.json().catch(() => ({}))
            console.warn(
              `Image upload failed (${imageType}): ${uploadRes.status} ${err.error || ""}`
            )
          }
        }

        await uploadIssueImage({
          dataUrl: payload?.images?.clean,
          imageType: "element",
          altText: undefined,
          orderIndex: 0
        })
        await uploadIssueImage({
          dataUrl: payload?.images?.annotated,
          imageType: "main",
          altText: undefined,
          orderIndex: 1
        })

        if (payload?.figma?.imageUrl) {
          try {
            const imgRes = await fetch(payload.figma.imageUrl, {
              cache: "no-store"
            })
            if (imgRes.ok) {
              const blob = await imgRes.blob()
              const form = new FormData()
              form.append(
                "file",
                new File([blob], `figma-${Date.now()}.png`, {
                  type: blob.type || "image/png"
                })
              )
              form.append("image_type", "figma")
              const uploadRes = await fetch(
                `${PIXZLO_WEB_URL}/api/issues/${issueId}/images`,
                {
                  method: "POST",
                  credentials: "include",
                  body: form
                }
              )
              if (!uploadRes.ok) {
                const err = await uploadRes.json().catch(() => ({}))
                console.warn(
                  `Figma image upload failed: ${uploadRes.status} ${err.error || ""}`
                )
              }
            }
          } catch (e) {
            console.warn("Failed to fetch/upload figma image:", e)
          }
        }

        // Upload CSS styles comparison data if available
        if (
          payload?.cssStyles &&
          Array.isArray(payload.cssStyles) &&
          payload.cssStyles.length > 0
        ) {
          try {
            const stylesRes = await fetch(
              `${PIXZLO_WEB_URL}/api/issues/${issueId}/styles`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  styles: payload.cssStyles
                })
              }
            )
            if (!stylesRes.ok) {
              const err = await stylesRes.json().catch(() => ({}))
              console.warn(
                `CSS styles upload failed: ${stylesRes.status} ${err.error || ""}`
              )
            } else {
              console.log(
                `Uploaded ${payload.cssStyles.length} CSS style comparisons`
              )
            }
          } catch (e) {
            console.warn("Failed to upload CSS styles:", e)
          }
        }

        if (
          websiteId &&
          payload?.figma?.fileId &&
          payload?.figma?.frameId &&
          payload?.figma?.figmaUrl
        ) {
          try {
            // Ensure frame name exists by fetching from Figma if missing
            let frameName = payload.figma.frameName || undefined
            if (!frameName) {
              try {
                const tokenRes = await fetch(
                  `${PIXZLO_WEB_URL}/api/integrations/figma/token`,
                  { method: "GET", credentials: "include" }
                )
                if (tokenRes.ok) {
                  const tokenData = await tokenRes.json()
                  const fileRes = await fetch(
                    `https://api.figma.com/v1/files/${payload.figma.fileId}`,
                    {
                      headers: {
                        Authorization: `Bearer ${tokenData.access_token}`
                      }
                    }
                  )
                  if (fileRes.ok) {
                    const fileJson = await fileRes.json()
                    const frame = findNodeById(fileJson, payload.figma.frameId)
                    if (frame && frame.name) frameName = frame.name
                  }
                }
              } catch (e) {
                console.warn("Failed to fetch frame name from Figma:", e)
              }
            }

            const linkRes = await fetch(
              `${PIXZLO_WEB_URL}/api/websites/${websiteId}/figma-links`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  figma_file_id: payload.figma.fileId,
                  figma_frame_id: payload.figma.frameId,
                  frame_name: frameName || undefined,
                  frame_url: payload.figma.figmaUrl,
                  thumbnail_url: payload.figma.thumbnailUrl || undefined
                })
              }
            )
            if (!linkRes.ok) {
              const err = await linkRes.json().catch(() => ({}))
              console.warn(
                `Figma link create failed: ${linkRes.status} ${err.error || ""}`
              )
            }
          } catch (e) {
            console.warn("Failed to create figma link:", e)
          }
        }

        const issueUrl = `${PIXZLO_WEB_URL}/issues/${issueId}`
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
})
