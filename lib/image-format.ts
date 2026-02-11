/**
 * Shared image output format configuration.
 *
 * WebP at quality 0.92 is visually indistinguishable from lossless PNG for
 * screenshots and UI captures while being ~30-50% smaller. WebP also supports
 * alpha transparency, so it works for drawing overlay layers too.
 *
 * Since Pixzlo is a Chrome extension, WebP support is guaranteed.
 */
export const IMAGE_OUTPUT_MIME = "image/webp" as const
export const IMAGE_OUTPUT_QUALITY = 0.92
export const IMAGE_OUTPUT_EXT = "webp"
