/** Six-width responsive matrix per visual atlas contract (320–1440 CSS px). */
export const RESPONSIVE_MATRIX_WIDTHS = [
  320, 390, 768, 1024, 1280, 1440,
] as const

/** PUBLIC-270 packet uses the narrow/mobile and desktop anchors only. */
export const PUBLIC_270_CAPTURE_WIDTHS = [1440, 390] as const
