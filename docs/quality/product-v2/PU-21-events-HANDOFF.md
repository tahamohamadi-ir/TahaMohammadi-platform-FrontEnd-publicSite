# PU-21-events Handoff

Status: **PU-21-events_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented privacy-preserving first-party aggregate analytics client (§I07):
  - `src/lib/analytics.ts`:
    - Dispatches aggregate telemetry to `/api/v1/analytics/events` via `navigator.sendBeacon` or non-blocking `fetch(..., { keepalive: true })`.
    - Strict payload validation: registered events (`page_view`, `cv_download`, `research_profile_download`, `demo_click`, `contact_click`, `contact_submit_success`), sanitized canonical pagePath (leading slash, max 512, stripped query/hash), exact `en`/`fa` locale, and alphanumeric target ID.
    - Privacy boundary: Zero cookies, zero user-agent fingerprinting, zero visitor tracking IDs, and zero input leakage.
    - Resilient error handling: Network failures or offline client state never interrupt user navigation or throw unhandled exceptions.
  - `src/layouts/SiteLayout.astro`:
    - Injected lightweight non-blocking telemetry snippet emitting `page_view` events for the active canonical route and locale when JavaScript is enabled.
    - Fully preserves readable no-JS operation.
  - `src/lib/contact-form-adapter.ts`:
    - Exported `recordContactSubmitAnalytics` to dispatch `contact_submit_success` upon confirmed form submission.
  - `src/lib/analytics.test.ts`:
    - Full test suite verifying path sanitization, schema validation, fetch fallback, error suppression, and contact submit telemetry (8/8 passed).

## Verification Evidence

- Unit test suite:
  - `npm test -- src/lib/analytics.test.ts` -> 8/8 passed.
- Linting:
  - `npm run lint` -> Clean 0 errors.

## Exact Paths Modified

- `src/lib/analytics.ts`
- `src/layouts/SiteLayout.astro`
- `src/lib/contact-form-adapter.ts`
- `src/lib/analytics.test.ts`
- `docs/quality/product-v2/PU-21-events-HANDOFF.md`
