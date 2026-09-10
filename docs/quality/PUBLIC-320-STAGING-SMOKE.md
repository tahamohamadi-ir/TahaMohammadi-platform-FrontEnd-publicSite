# PUBLIC-320 Integrated Staging Smoke Evidence

**Packet:** PUBLIC-320  
**Authority:** `Docs/02-architecture/DEPLOYMENT-TOPOLOGY.md`, accepted public OpenAPI, `PUBLIC-310` contract fixtures  
**Environment:** isolated staging topology at `http://127.0.0.1:23080`  
**Last verified:** 2026-09-10  
**Status:** live integrated public smoke **10/10 passed** against the real
public/CMS reverse-proxy boundary.

This checklist does **not** close `PUBLIC-190`. Passing local scaffold validation does not claim visual acceptance or production readiness.

---

## Automated and live gates

| Gate                    | Command                                                  | Result       | Notes                                      |
| ----------------------- | -------------------------------------------------------- | ------------ | ------------------------------------------ |
| Build                   | `npm run build`                                          | PASS         | 42 static pages                            |
| Vitest staging scaffold | `npm test` (includes `public-320.staging-smoke.test.ts`) | PASS         | environment contract + probe wiring        |
| Design authority        | `npm run validate:design`                                | PASS         | semantic token contract                    |
| SEO                     | `npm run validate:seo`                                   | PASS         | sitemap, hreflang, canonical               |
| Live staging smoke      | `npm run test:smoke`                                     | PASS (10/10) | same-origin public/CMS integration, 11.0 s |

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

When `PUBLIC_STAGING_SITE_URL` is unset, Playwright still reports skipped tests
with an explicit reason. The recorded run supplied the isolated staging URL
explicitly.

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

## Integration observations

| Observation                    | Result                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `BACKEND-180` smoke            | PASS; disposable backend environment covered the server-side boundary        |
| Public and CMS host routing    | PASS through the staging edge                                                |
| Home composition EN / FA       | HTTP 200; eight published modules per locale                                 |
| Home graph EN / FA             | HTTP 200; four nodes, three edges, four published related records per locale |
| Staging indexing protection    | `X-Robots-Tag: noindex, nofollow, noarchive`                                 |
| Internal API boundary          | `/api/v1/internal/*` remains unavailable through the public edge             |
| Owner-authenticated admin flow | Tracked separately in the R8 sign-off package; public smoke needs no login   |

---

## Follow-on

| Task       | Notes                                            |
| ---------- | ------------------------------------------------ |
| PUBLIC-350 | Release evidence after live staging smoke passes |
| PUBLIC-190 | owner visual QA remains `REVISE`                 |
