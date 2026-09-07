/**
 * Story Content model and utility functions for PU-13-story.
 * Adheres to PRODUCT-INTERFACES-V2.md §I03 story catalog.
 */

import type { components } from '../generated/public-api'
import type { Locale } from './navigation'
import { fetchRecordResolutions, workRefToHref } from './hero-graph-content'

export type StoryBlock = components['schemas']['StoryBlockOut']
export type StorySection = components['schemas']['StorySectionOut']
export type StoryDocument = components['schemas']['StoryDocumentOut']
export type StoryRelatedRecord = components['schemas']['WorkRefOut'] & { href: string }

/** Resolve one document's references in batches, preserving per-block order. */
export async function resolveStoryReferences(story: StoryDocument, locale: Locale): Promise<Map<string, StoryRelatedRecord>> {
  const refs = new Map<string, { family: string; id: string }>()
  for (const section of story.sections ?? []) {
    for (const block of section.blocks ?? []) {
      if (block.blockType !== 'related' || !Array.isArray(block.settings?.records)) continue
      for (const ref of block.settings.records) {
        if (ref && typeof ref.family === 'string' && typeof ref.id === 'string') refs.set(`${ref.family}:${ref.id}`, ref)
      }
    }
  }
  const resolved = await fetchRecordResolutions(locale, [...refs.values()])
  const records = new Map<string, StoryRelatedRecord>()
  for (const [key, record] of resolved) {
    const href = workRefToHref(record, locale)
    if (refs.has(key) && href && typeof record.title === 'string' && record.title.trim()) records.set(key, { ...record, href })
  }
  return records
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
 * Safely parses heading level supporting strings ("h2", "h3", "h4") and numbers (2, 3, 4).
 */
export function parseHeadingLevel(raw: unknown): number {
  if (typeof raw === 'number' && !isNaN(raw) && raw >= 1 && raw <= 6) {
    return Math.floor(raw)
  }
  if (typeof raw === 'string') {
    const match = raw.trim().match(/^[hH]?([1-6])$/)
    if (match && match[1]) {
      return parseInt(match[1], 10)
    }
  }
  return 2
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
        const level = parseHeadingLevel(block.settings?.level)
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
