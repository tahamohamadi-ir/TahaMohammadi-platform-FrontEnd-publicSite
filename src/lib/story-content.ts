/**
 * Story Content model and utility functions for PU-13-story.
 * Adheres to PRODUCT-INTERFACES-V2.md §I03 story catalog.
 */

export interface StoryBlock {
  blockType: string
  settings?: Record<string, unknown>
}

export interface StorySection {
  layout?: string
  ratio?: string
  blocks?: StoryBlock[]
}

export interface StoryDocument {
  locale: string
  title: string
  sections?: StorySection[]
}

export interface StoryTocItem {
  id: string
  text: string
  level: number
}

/**
 * Returns true if the story document has at least one renderable block.
 */
export function hasStoryContent(story?: StoryDocument | null): boolean {
  if (!story || !Array.isArray(story.sections) || story.sections.length === 0) {
    return false
  }
  return story.sections.some(
    (section) => Array.isArray(section.blocks) && section.blocks.length > 0,
  )
}

/**
 * Extracts a structured Table of Contents from heading blocks in a story document.
 */
export function extractTableOfContents(
  story?: StoryDocument | null,
): StoryTocItem[] {
  if (!hasStoryContent(story) || !story?.sections) {
    return []
  }

  const toc: StoryTocItem[] = []
  for (const section of story.sections) {
    if (!Array.isArray(section.blocks)) continue
    for (const block of section.blocks) {
      if (block.blockType === 'heading') {
        const text = String(block.settings?.text || '').trim()
        if (!text) continue
        const id =
          String(block.settings?.id || '').trim() || `heading-${toc.length + 1}`
        const level = Number(block.settings?.level) || 2
        toc.push({ id, text, level })
      }
    }
  }

  return toc
}

/**
 * Formats byte size into human-readable representation (e.g. 1.2 MB).
 */
export function formatFileSize(bytes?: number | null): string {
  if (typeof bytes !== 'number' || isNaN(bytes) || bytes <= 0) {
    return ''
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    const kb = (bytes / 1024).toFixed(1)
    return `${kb} KB`
  }
  const mb = (bytes / (1024 * 1024)).toFixed(1)
  return `${mb} MB`
}
