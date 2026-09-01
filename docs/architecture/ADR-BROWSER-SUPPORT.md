# ADR: Browser support targets

## Status

Accepted (PUBLIC-013)

## Context

The public site ships static HTML with progressive enhancement (theme toggle, search UI, contact). Accessibility evidence targets WCAG 2.2 AA (`docs/quality/ACCESSIBILITY.md`). Automated browser tests need a single reproducible engine.

## Decision

### Accessibility and readability targets

- **WCAG 2.2 AA** is the documented accessibility target (`docs/quality/ACCESSIBILITY.md`).
- Primary content must remain readable **without JavaScript** (ADR-0002; PUBLIC-300 `@nojs` crawl).
- Layout must survive **200% root font-size** and keyboard-only navigation (foundation/a11y Playwright probes).

### Automated browser matrix

- **Chromium** is the sole Playwright `browserName` for local e2e and staging smoke (`playwright.config.ts`, `playwright.staging.config.ts`).
- Tag-filtered suites (`@foundation`, `@visual`, `@a11y`, `@performance`, `@nojs`, `@smoke`) run against the static `dist/` artifact.

### Production browsers

- No `browserslist` pin is declared in this repository.
- Production support follows **evergreen browsers that render the shipped static HTML, CSS custom properties, WOFF2 fonts, and RTL/LTR** used by `fa`/`en` routes.
- Cross-browser manual acceptance is out of scope for automated CI until an explicit matrix is approved.

## Consequences

- Regressions in Firefox/Safari are not caught by CI today; report via manual QA or future matrix expansion.
- Feature work must not require bleeding-edge APIs without a documented fallback.
- Font and theme tokens are validated via computed-style probes on Chromium.

## Verification

- `playwright.config.ts` — `browserName: 'chromium'`
- `playwright.staging.config.ts` — `browserName: 'chromium'`
- `docs/quality/ACCESSIBILITY.md` — WCAG 2.2 AA target
- `tests/e2e/wp10-foundation.accessibility.e2e.ts` — `@a11y` keyboard/axe probes
- `tests/e2e/public-300-nojs-crawl.e2e.ts` — `@nojs` with `javaScriptEnabled: false`

## References

- Coordination `Docs/09-decisions/ADR-0002-STATIC-FIRST-ASTRO-PUBLIC-SITE.md`
- `docs/quality/ACCESSIBILITY.md`
- `TASK-LIST.md` — PUBLIC-013, PUBLIC-080, PUBLIC-300
