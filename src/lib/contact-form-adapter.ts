/**
 * Contact form POST adapter — maps backend responses to safe UI state (PUBLIC-230).
 * Supports JSON failure bodies and 422 HTML responses per ERROR-COMPATIBILITY-MATRIX.md.
 */

import { localePath, type Locale } from './navigation'

export interface ContactFormFields {
  name: string
  email: string
  message: string
}

export type ContactSubmitOutcome =
  { kind: 'success' } | { kind: 'failure'; fields: ContactFormFields }

export function buildContactReturnUrl(
  locale: Locale,
  outcome: ContactSubmitOutcome,
): string {
  const base = localePath(locale, 'contact')
  const params = new URLSearchParams()

  if (outcome.kind === 'success') {
    params.set('sent', '1')
    return `${base}?${params.toString()}`
  }

  params.set('sent', '0')
  params.set('name', outcome.fields.name)
  params.set('email', outcome.fields.email)
  params.set('message', outcome.fields.message)
  return `${base}?${params.toString()}`
}

/** Never parse 422 HTML as JSON — treat as form-level failure with preserved values. */
export function mapContactSubmitResponse(
  status: number,
  contentType: string | null,
  bodyText: string,
  fields: ContactFormFields,
): ContactSubmitOutcome {
  if (status >= 200 && status < 300) {
    return { kind: 'success' }
  }

  if (status === 422 && contentType?.includes('text/html')) {
    return { kind: 'failure', fields }
  }

  if (contentType?.includes('application/json')) {
    try {
      const payload = JSON.parse(bodyText) as { ok?: boolean }
      if (payload.ok === false) {
        return { kind: 'failure', fields }
      }
    } catch {
      return { kind: 'failure', fields }
    }
  }

  return { kind: 'failure', fields }
}
