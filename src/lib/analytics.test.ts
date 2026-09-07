import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  sanitizePagePath,
  validateAnalyticsPayload,
  sendAnalyticsEvent,
  type AnalyticsEventPayload,
  type AnalyticsEventType,
} from './analytics'
import type { Locale } from './navigation'
import { recordContactSubmitAnalytics } from './contact-form-adapter'

describe('PU-21 Analytics & Telemetry Integration (§I07)', () => {
  describe('sanitizePagePath', () => {
    it('strips query strings and hash fragments and ensures leading slash', () => {
      expect(sanitizePagePath('/en/blog?page=2&filter=ai')).toBe('/en/blog')
      expect(sanitizePagePath('/fa/projects/#section-1')).toBe('/fa/projects/')
      expect(sanitizePagePath('en/cv?download=1#top')).toBe('/en/cv')
      expect(sanitizePagePath('')).toBe('/')
    })
  })

  describe('validateAnalyticsPayload', () => {
    it('accepts valid analytics payloads', () => {
      const valid: AnalyticsEventPayload = {
        event: 'page_view',
        pagePath: '/en/about',
        locale: 'en',
      }
      expect(validateAnalyticsPayload(valid).valid).toBe(true)

      const withTarget: AnalyticsEventPayload = {
        event: 'cv_download',
        pagePath: '/en/cv',
        locale: 'en',
        target: 'academic_cv_pdf',
      }
      expect(validateAnalyticsPayload(withTarget).valid).toBe(true)
    })

    it('rejects invalid event types', () => {
      const invalid = {
        event: 'unknown_action' as unknown as AnalyticsEventType,
        pagePath: '/en/home',
        locale: 'en' as const,
      }
      const result = validateAnalyticsPayload(invalid)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Invalid event type')
    })

    it('rejects invalid locales', () => {
      const invalid = {
        event: 'page_view' as const,
        pagePath: '/fr/home',
        locale: 'fr' as unknown as Locale,
      }
      const result = validateAnalyticsPayload(invalid)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Invalid locale')
    })

    it('rejects invalid target identifiers', () => {
      const invalid = {
        event: 'contact_click' as const,
        pagePath: '/en/contact',
        locale: 'en' as const,
        target: 'invalid target with spaces & special chars!',
      }
      const result = validateAnalyticsPayload(invalid)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Invalid target identifier')
    })
  })

  describe('sendAnalyticsEvent & recordContactSubmitAnalytics', () => {
    const originalFetch = globalThis.fetch

    afterEach(() => {
      globalThis.fetch = originalFetch
      vi.restoreAllMocks()
    })

    it('dispatches event via fetch when navigator is unavailable or sendBeacon fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true })
      globalThis.fetch = mockFetch

      const success = await sendAnalyticsEvent({
        event: 'demo_click',
        pagePath: '/en/projects/pars-sql-vtd-edge',
        locale: 'en',
        target: 'run_demo_button',
      })

      expect(success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('/api/v1/analytics/events')
      const sentBody = JSON.parse(callArgs[1].body)
      expect(sentBody.event).toBe('demo_click')
      expect(sentBody.target).toBe('run_demo_button')
    })

    it('safely handles fetch errors without throwing', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'))

      const success = await sendAnalyticsEvent({
        event: 'page_view',
        pagePath: '/en/about',
        locale: 'en',
      })

      expect(success).toBe(false)
    })

    it('dispatches contact submit success event via adapter', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true })
      globalThis.fetch = mockFetch

      const success = await recordContactSubmitAnalytics('en')
      expect(success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(sentBody.event).toBe('contact_submit_success')
      expect(sentBody.pagePath).toBe('/en/contact/')
    })
  })
})
