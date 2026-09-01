# ADR: Deployment — static build artifact

## Status

Accepted (PUBLIC-013)

## Context

The public site is an independently deployable consumer of the backend API. Coordination `DEPLOYMENT-TOPOLOGY.md` selects same-origin delivery: a reverse proxy serves the public static site alongside admin and backend routes. ADR-0002 requires static-first output.

## Decision

Deploy the public site as a **static build artifact** produced by `npm run build`:

- Astro emits pre-rendered HTML, CSS, JS, fonts, and promoted media into `dist/`
- No Node SSR tier is configured for production
- Local preview and Playwright harness serve `dist/` via `scripts/serve-dist.mjs`
- Production placement is behind the platform reverse proxy on the canonical public origin (coordination topology)

## Rationale

- Matches ADR-0002 and `PUBLIC-SITE-STACK-EVALUATION.md` — static output behind same-origin proxy.
- CI validates `npm run build` only; no runtime server dependency in the public repo.
- API reads use build-time or client fetch against `/api/` on the same origin in production; dev uses Vite proxy (`astro.config.mjs`).

## Consequences

- Cache and CDN rules apply to static files; HTML freshness follows rebuild/deploy cadence.
- `dist/` is generated output — never committed.
- Design atlas (`DESIGN_ATLAS=1`) is a separate local build profile; production builds exclude `/_design/`.
- Staging smoke (`PUBLIC-320`) targets a deployed staging URL, not the local dev server.

## Verification

- `package.json` — `"build": "astro build"`
- `.github/workflows/ci.yml` — `npm run build` on push/PR
- `playwright.config.ts` — `npm run build` then `serve-dist.mjs` for e2e
- `tests/e2e/playwright-config.test.ts` — asserts static build + serve, not `astro dev`
- Coordination `Docs/02-architecture/DEPLOYMENT-TOPOLOGY.md`

## References

- Coordination `Docs/09-decisions/ADR-0002-STATIC-FIRST-ASTRO-PUBLIC-SITE.md`
- Coordination `Docs/02-architecture/PUBLIC-SITE-STACK-EVALUATION.md`
- `TASK-LIST.md` — PUBLIC-010, PUBLIC-012, PUBLIC-013
