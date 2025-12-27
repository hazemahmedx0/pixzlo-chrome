export const PADDING = 40
export const MIN_WIDTH = 300
export const MIN_HEIGHT = 168

// Central configuration for the Pixzlo web app URL
// Change this one value to update the URL everywhere in the extension
// Note: You'll also need to manually update the URL in package.json > manifest.host_permissions
export const PIXZLO_WEB_URL = "https://app.pixzlo.com"
// export const PIXZLO_WEB_URL = "http://localhost:3000"

// Production URLs for install/uninstall redirects (always use production, not localhost)
export const PIXZLO_APP_URL = "https://app.pixzlo.com"
export const PIXZLO_MARKETING_URL = "https://pixzlo.com"

// Install welcome page URL
export const EXTENSION_WELCOME_URL = `${PIXZLO_APP_URL}/welcome?ref=extension`

// Uninstall goodbye page URL
export const EXTENSION_GOODBYE_URL = `${PIXZLO_MARKETING_URL}/goodbye?ref=extension`
