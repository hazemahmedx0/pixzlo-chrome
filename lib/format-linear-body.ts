/**
 * Format Linear issue body with markdown
 */

interface ComparisonProperty {
  property_name: string
  implemented_value: string
  design_value?: string
  unit?: string
  notes?: string
}

interface ImageData {
  element?: string // Selected element screenshot
  figma?: string // Figma design image
  highlighted?: string // Element with highlights
}

interface Metadata {
  browser?: string
  device?: string
  screenResolution?: string
  viewportSize?: string
  url?: string
}

interface LinearBodyOptions {
  description?: string
  images?: ImageData
  comparisonData?: ComparisonProperty[]
  figmaLink?: string
  websiteUrl?: string
  metadata?: Metadata
}

export function formatLinearIssueBody(options: LinearBodyOptions): string {
  const sections: string[] = []

  // Description section
  if (options.description) {
    sections.push("## Description")
    sections.push(options.description)
    sections.push("")
  }

  // Screenshots section
  if (options.images && Object.keys(options.images).length > 0) {
    sections.push("## Screenshots")
    sections.push("")

    if (options.images.element) {
      sections.push("### Selected Element")
      sections.push(`![Selected Element](${options.images.element})`)
      sections.push("")
    }

    if (options.images.figma) {
      sections.push("### Figma Design")
      sections.push(`![Figma Design](${options.images.figma})`)
      sections.push("")
    }

    if (options.images.highlighted) {
      sections.push("### With Highlights")
      sections.push(`![With Highlights](${options.images.highlighted})`)
      sections.push("")
    }
  }

  // Style Comparison section
  if (options.comparisonData && options.comparisonData.length > 0) {
    sections.push("## Style Comparison")
    sections.push("")
    sections.push("| Property | Implemented | Design | Match |")
    sections.push("|----------|-------------|--------|-------|")

    options.comparisonData.forEach((prop) => {
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
  if (options.figmaLink || options.websiteUrl) {
    sections.push("## Links")
    sections.push("")

    if (options.figmaLink) {
      sections.push(`- **Figma:** [View Design](${options.figmaLink})`)
    }

    if (options.websiteUrl) {
      sections.push(`- **Website:** [View Page](${options.websiteUrl})`)
    }

    sections.push("")
  }

  // Technical Details section
  if (options.metadata) {
    const hasMetadata =
      options.metadata.browser ||
      options.metadata.device ||
      options.metadata.screenResolution ||
      options.metadata.viewportSize

    if (hasMetadata) {
      sections.push("## Technical Details")
      sections.push("")

      if (options.metadata.browser) {
        sections.push(`- **Browser:** ${options.metadata.browser}`)
      }

      if (options.metadata.device) {
        sections.push(`- **Device:** ${options.metadata.device}`)
      }

      if (options.metadata.screenResolution) {
        sections.push(
          `- **Screen Resolution:** ${options.metadata.screenResolution}`
        )
      }

      if (options.metadata.viewportSize) {
        sections.push(`- **Viewport:** ${options.metadata.viewportSize}`)
      }

      if (options.metadata.url) {
        sections.push(`- **Page URL:** ${options.metadata.url}`)
      }

      sections.push("")
    }
  }

  return sections.join("\n")
}

export type { LinearBodyOptions, ComparisonProperty, ImageData, Metadata }
