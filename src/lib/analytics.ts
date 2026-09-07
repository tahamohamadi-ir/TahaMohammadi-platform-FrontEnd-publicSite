/**
 * First-party bounded analytics client — PU-21-events / §I07.
 * Dispatches non-blocking, privacy-preserving event aggregates to `/api/v1/analytics/events`.
 * Never transmits PII, cookies, full referrers, query parameters, or hash fragments.
 */

import { buildPublicApiUrl } from './api/resolve-url'
import type { Locale } from './navigation'

export type AnalyticsEventType =
  | 'page_view'
  | 'cv_download'
  | 'research_profile_download'
  | 'demo_click'
  | 'contact_click'
  | 'contact_submit_success'

export interface AnalyticsEventPayload {
  event: AnalyticsEventType
  pagePath: string
  locale: Locale
  target?: string
}

const TARGET_REGEX = /^[a-zA-Z0-9_-]{1,64}$/

export function sanitizePagePath(rawPath: string): string {
  const withoutHash = rawPath.split('#')[0] ?? ''
  const withoutQuery = withoutHash.split('?')[0] ?? ''
  const trimmed = withoutQuery.trim()
  if (!trimmed.startsWith('/')) {
    return `/${trimmed}`
  }
  return trimmed
}

export function validateAnalyticsPayload(
  payload: AnalyticsEventPayload,
): { valid: boolean; reason?: string } {
  const validEvents: ReadonlySet<AnalyticsEventType> = new Set([
    'page_view',
    'cv_download',
    'research_profile_download',
    'demo_click',
    'contact_click',
    'contact_submit_success',
  ])

  if (!validEvents.has(payload.event)) {
    return { valid: false, reason: 'Invalid event type' }
  }

  if (payload.locale !== 'en' && payload.locale !== 'fa') {
    return { valid: false, reason: 'Invalid locale' }
  }

  const cleanPath = sanitizePagePath(payload.pagePath)
  if (!cleanPath || cleanPath.length > 512) {
    return { valid: false, reason: 'Invalid page path length' }
  }

  if (payload.target) {
    if (!TARGET_REGEX.test(payload.target)) {
      return { valid: false, reason: 'Invalid target identifier' }
    }
  }

  return { valid: true }
}

export async function sendAnalyticsEvent(
  payload: AnalyticsEventPayload,
): Promise<boolean> {
  const validation = validateAnalyticsPayload(payload)
  if (!validation.valid) {
    return false
  }

  const cleanPath = sanitizePagePath(payload.pagePath)
  const bodyObject: Record<string, string> = {
    event: payload.event,
    pagePath: cleanPath,
    locale: payload.locale,
  }

  if (payload.target) {
    bodyObject.target = payload.target
  }

  const jsonString = JSON.stringify(bodyObject)
  const endpoint = buildPublicApiUrl('/api/v1/analytics/events')

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([jsonString], { type: 'application/json' })
      const sent = navigator.sendBeacon(endpoint, blob)
      if (sent) return true
    }

    if (typeof fetch === 'function') {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: jsonString,
        keepalive: true,
      })
      return response.ok
    }
  } catch {
    // Non-blocking telemetry must never throw or disrupt user flows
    return false
  }

  return false
}
