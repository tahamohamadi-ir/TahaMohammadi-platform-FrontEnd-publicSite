# ADR: Testing — Vitest unit matrix + Playwright tags

## Status

Accepted (PUBLIC-013)

## Context

The public site needs fast contract checks in CI and deeper browser acceptance locally. `docs/quality/TESTING.md` requires unit, contract, build, and browser coverage across locales, themes, and content states.

## Decision

Use a **two-layer test strategy**:

### Layer 1 — Vitest (CI)

- Runner: Vitest with Astro Vite config (`vitest.config.ts`)
- Command: `npm test` (`vitest run`)
- Scope: toolchain wiring, route/SEO contracts, design authority pins, API consumer fixtures, task-scaffold guards (for example `public-011`, `public-310`)
- Environment: Node (`environment: 'node'`)

### Layer 2 — Playwright (local / staging)

- Runner: `@playwright/test` with Chromium (`playwright.config.ts`)
- Harness: build `dist/`, serve on ephemeral port via `serve-dist.mjs` — never attach to `astro dev`
- Tags in test titles (grep filters):

| Script                     | Tag            | Purpose                                           |
| -------------------------- | -------------- | ------------------------------------------------- |
| `npm run test:foundation`  | `@foundation`  | Theme, fonts, gateway/home baseline               |
| `npm run test:visual`      | `@visual`      | Page-family capture matrix                        |
| `npm run test:a11y`        | `@a11y`        | Keyboard focus, axe scans                         |
| `npm run test:performance` | `@performance` | LCP/CLS/INP budget probes                         |
| `npm run test:nojs`        | `@nojs`        | No-JavaScript crawl                               |
| `npm run test:smoke`       | `@smoke`       | Deployed staging (`playwright.staging.config.ts`) |

- Each `PUBLIC-*` quality task pairs a Vitest scaffold test with optional Playwright e2e where browser evidence is required.

### CI scope (Phase 1)

`.github/workflows/ci.yml` runs lint, format check, Vitest, `validate:design`, `validate:seo`, and build. Playwright gates remain local until CI browser capacity is approved.

## Consequences

- New behavior adds Vitest coverage first; browser tags follow when UI/runtime proof is needed.
- Playwright tests must remain self-contained (dynamic port, no fixed 4321, `reuseExistingServer: false`).
- Staging smoke skips honestly when `PUBLIC_STAGING_SITE_URL` is unset.

## Verification

- `package.json` scripts — `test`, `test:foundation`, `test:visual`, `test:a11y`, `test:performance`, `test:nojs`, `test:smoke`
- `tests/e2e/playwright-config.test.ts` — harness invariants
- `tests/e2e/public-060-font-computed.e2e.ts` — `@foundation` example
- `tests/e2e/public-300-nojs-crawl.e2e.ts` — `@nojs` example
- `.github/workflows/ci.yml` — Vitest + build, no Playwright job

## References

- `docs/quality/TESTING.md`
- `TASK-LIST.md` — PUBLIC-011, PUBLIC-012, PUBLIC-013, PUBLIC-300, PUBLIC-320
