/**
 * Knowledge Atlas v1 performance budgets (design spec §19.2).
 * Ceilings are fixed — never raised to make a test pass (§19.6).
 */
import { gzipSync } from 'node:zlib'

import type { AtlasPayload } from './model'
import { serializeAtlasPayload } from './snapshot'

export const KNOWLEDGE_ATLAS_PERFORMANCE_BUDGET = {
  /** Time to first interactive Atlas frame after document is interactive (ms). */
  firstInteractiveFrameMs: 900,
  /** Pick latency p95 at v1 scale (ms). */
  pickLatencyP95Ms: 8,
  /** Frame duration during drag p95 (ms). */
  dragFrameP95Ms: 16,
  /** Runtime API payload (gzip bytes). */
  runtimePayloadGzipBytes: 60 * 1024,
  /** Embedded build-time snapshot script payload (gzip bytes). */
  embeddedSnapshotGzipBytes: 40 * 1024,
  /** Label chips in the DOM at once. */
  labelChipsDom: 40,
  /** DOM nodes added by the Atlas presentation (opening tags in region HTML). */
  presentationDomNodes: 2500,
  /** Layout computation on activation at 80/150 (ms) — backend scope. */
  layoutComputationMs: 2000,
} as const

/** Matches `ALWAYS_LABEL_CAP` in layout.ts — always-visible label tier. */
export const ALWAYS_LABEL_KEYS_CAP = 10

export function gzipByteLength(input: string | Buffer): number {
  const bytes = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return gzipSync(bytes).length
}

export function runtimePayloadGzipSize(payload: AtlasPayload): number {
  return gzipByteLength(JSON.stringify(payload))
}

export function embeddedSnapshotGzipSize(payload: AtlasPayload): number {
  return gzipByteLength(serializeAtlasPayload(payload))
}

/** Count opening HTML tags — proxy for DOM node budget on static markup. */
export function countOpeningHtmlTags(html: string): number {
  const matches = html.match(/<[a-zA-Z][^>]*>/g)
  return matches?.length ?? 0
}

/** Atlas region markup only (between data-atlas-region boundaries). */
export function extractAtlasRegionHtml(fullHtml: string): string {
  const match = fullHtml.match(
    /<section[^>]*data-atlas-region[^>]*>[\s\S]*<\/section>/,
  )
  return match?.[0] ?? fullHtml
}
