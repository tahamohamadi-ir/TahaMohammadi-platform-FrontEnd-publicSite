# PUBLIC-320 Integrated Staging Smoke Evidence

**Packet:** PUBLIC-320  
**Authority:** `Docs/02-architecture/DEPLOYMENT-TOPOLOGY.md`, accepted public OpenAPI, `PUBLIC-310` contract fixtures  
**Environment:** deployed staging only when `PUBLIC_STAGING_SITE_URL` is set  
**Status:** scaffold shipped; live integrated smoke **skipped** until `BACKEND-180` staging deployment and owner credentials exist.

This checklist does **not** close `PUBLIC-190`. Passing local scaffold validation does not claim visual acceptance or production readiness.

---

## Automated gate (scaffold)

| Gate                    | Command                                                  | Result          | Notes                              |
| ----------------------- | -------------------------------------------------------- | --------------- | ---------------------------------- |
| Build                   | `npm run build`                                          | required        | unchanged production surface       |
| Vitest staging scaffold | `npm test` (includes `public-320.staging-smoke.test.ts`) | required        | env contract + probe wiring        |
| Design authority        | `npm run validate:design`                                | required        | semantic token contract            |
| SEO                     | `npm run validate:seo`                                   | required        | sitemap/hreflang/canonical         |
| Live staging smoke      | `npm run test:smoke`                                     | skip when unset | requires `PUBLIC_STAGING_SITE_URL` |

**Harness:** `src/test-harness/staging-smoke.ts`, `src/public-320.staging-smoke.test.ts`, `tests/e2e/public-320-staging-smoke.e2e.ts`, `playwright.staging.config.ts`

---

## Environment contract

| Variable                      | Required         | Purpose                                                                               |
| ----------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| `PUBLIC_STAGING_SITE_URL`     | yes (live smoke) | Deployed public site origin (reverse-proxy entry)                                     |
| `PUBLIC_STAGING_API_BASE_URL` | no               | API origin override; leave empty for same-origin `/api` proxy per deployment topology |

Example (not committed):

```env
PUBLIC_STAGING_SITE_URL=https://staging.example.com
# PUBLIC_STAGING_API_BASE_URL=
```

When `PUBLIC_STAGING_SITE_URL` is unset, Playwright reports skipped tests with an explicit reason referencing `BACKEND-180`.

---

## Probe matrix (status only)

| Probe             | Path                                | Expect                                 |
| ----------------- | ----------------------------------- | -------------------------------------- |
| health            | `/health/`                          | HTTP 200                               |
| site-settings     | `/api/site`                         | HTTP 200 + JSON                        |
| landings-en       | `/api/landings/en`                  | HTTP 200 + JSON                        |
| landings-fa       | `/api/landings/fa`                  | HTTP 200 + JSON                        |
| gateway           | `/`                                 | HTTP 200                               |
| home-en           | `/en/`                              | HTTP 200 + `lang=en`                   |
| home-fa           | `/fa/`                              | HTTP 200 + `lang=fa`                   |
| about-en          | `/en/about/`                        | HTTP 200 + `lang=en`                   |
| about-fa          | `/fa/about/`                        | HTTP 200 + `lang=fa`                   |
| same-origin proxy | browser `GET /api/site` from `/en/` | HTTP 200 when API base equals site URL |

Response bodies are **not** asserted against fixtures in smoke; contract shape validation remains `PUBLIC-310`.

---

## Blockers

| Blocker                   | Owner      | Notes                                                     |
| ------------------------- | ---------- | --------------------------------------------------------- |
| `BACKEND-180`             | Backend    | Session, CSRF, MFA, preview, contact disposable-env smoke |
| Staging deployment (`R7`) | Platform   | Host routing, TLS, proxy headers, sanitized data          |
| `PUBLIC_STAGING_SITE_URL` | Operations | No staging URL is checked into this repository            |

---

## Follow-on

| Task       | Notes                                            |
| ---------- | ------------------------------------------------ |
| PUBLIC-350 | Release evidence after live staging smoke passes |
| PUBLIC-190 | owner visual QA remains `REVISE`                 |
