import { expect, test } from '@playwright/test'

/**
 * Plan C Task 23 — live API confirmation.
 * Skips honestly when TM_E2E_API_BASE_URL is unset or the public Atlas is inactive.
 */

const apiBase = process.env.TM_E2E_API_BASE_URL

test.describe('Knowledge Atlas live API', () => {
  test('topology contract version against published API @atlas-live', async ({
    request,
  }) => {
    test.skip(
      !apiBase,
      'TM_E2E_API_BASE_URL unset — fixture build remains the acceptance surface',
    )

    const response = await request.get(`${apiBase}/api/atlas/en`)
    if (response.status() === 404) {
      test.skip(
        true,
        'Published API has no active Atlas version yet (Plan D activation pending)',
      )
    }
    expect(response.ok()).toBeTruthy()
    const body = (await response.json()) as {
      contractVersion?: string
      nodes?: unknown[]
      relations?: unknown[]
    }
    expect(body.contractVersion).toBe('atlas01-1.0.0')
    expect(Array.isArray(body.nodes)).toBeTruthy()
    expect(Array.isArray(body.relations)).toBeTruthy()
  })
})
