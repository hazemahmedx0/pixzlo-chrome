/**
 * Detects the favicon URL from the current page.
 *
 * Priority:
 * 1. Explicit <link rel="icon">, <link rel="shortcut icon">, <link rel="apple-touch-icon"> tags
 * 2. Fallback to /favicon.ico at the root origin (handles Next.js apps, etc.)
 *
 * Always returns an absolute URL.
 */
export function getFaviconUrl(): string {
  // Priority order for favicon detection
  const selectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="apple-touch-icon-precomposed"]',
  ]

  for (const selector of selectors) {
    const link = document.querySelector<HTMLLinkElement>(selector)
    if (link?.href) {
      // Browser automatically resolves href to absolute URL
      return link.href
    }
  }

  // Fallback to /favicon.ico at the root origin
  // window.location.origin gives "https://sub.domain.com" (stripping any paths)
  // This works for:
  // - https://app.greptile.com/ → https://app.greptile.com/favicon.ico
  // - https://app.greptile.com/chat/123 → https://app.greptile.com/favicon.ico
  return new URL("/favicon.ico", window.location.origin).href
}

