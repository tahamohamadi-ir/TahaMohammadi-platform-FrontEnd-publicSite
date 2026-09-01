# PUBLIC-290 Performance Budget Evidence

**Packet:** PUBLIC-290  
**Authority:** `Docs/06-quality/PERFORMANCE-BUDGET.md`, `Docs/04-design/FONT-ACQUISITION-PLAN.md` (PUBLIC-050 preload/CLS)  
**Environment:** local static preview only — Playwright builds `dist/` and serves via `scripts/serve-dist.mjs`; **not** production 75th-percentile telemetry.  
**Status:** automated LCP/CLS probes + font preload verification on representative routes; production field data and INP remain open.

This checklist does **not** close `PUBLIC-190`. Passing local probes does not claim production performance acceptance.

---

## Budget thresholds (central contract)

| Metric | Target | Source |
|---|---|---|
| LCP | ≤ 2500 ms (75th percentile in production) | `Docs/06-quality/PERFORMANCE-BUDGET.md` |
| CLS | ≤ 0.1 | `Docs/06-quality/PERFORMANCE-BUDGET.md` |
| INP | ≤ 200 ms | deferred — no automated probe in this packet |
| Font preload | locale body + display WOFF2 only; `font-display: swap` | `BaseLayout.astro`, `src/styles/fonts.css`, PUBLIC-050 |

Local Playwright probes apply the same numeric LCP/CLS caps as guardrails on the built static preview. Treat any pass here as **scaffold evidence**, not a production claim.

---

## Automated gate

| Gate | Command | Result | Notes |
|---|---|---|---|
| Build | `npm run build` | PASS | 23 static pages |
| Vitest scaffold | `npm test` (includes `public-290.performance-budget.test.ts`) | PASS | thresholds + wiring guard |
| Performance probe | `npm run test:performance` | **5 passed** | home EN/FA + creative index EN + font preload/CSS |
| Design authority | `npm run validate:design` | PASS | semantic token contract |
| SEO | `npm run validate:seo` | PASS | sitemap/hreflang/canonical |
| CI | `.github/workflows/ci.yml` | push/PR | unit + design + SEO + build (performance optional locally) |

**Runner:** `npm run test:performance`

**Measurement date:** 2026-09-01 (local Windows host, loopback static preview)

---

## Probe routes (local static preview)

Viewport **1280×900**, Chromium via Playwright, cold build per run.

| Route | Locale | LCP (ms) | CLS | Within budget | Notes |
|---|---|---:|---:|---|---|
| `/en/` | EN | 124 | 0.000 | yes | home |
| `/fa/` | FA | 68 | 0.000 | yes | home RTL |
| `/en/creative/` | EN | 60 | 0.000 | yes | PF-01 index |

Loopback static preview yields much lower LCP than production field data is expected to show. Do not treat these milliseconds as production SLAs.

---

## Font preload verification (PUBLIC-050)

| Locale | Preloaded WOFF2 (body + display) | `@font-face` swap | Probe |
|---|---|---|---|
| EN | `/fonts/inter/InterVariable.woff2`, `/fonts/newsreader/Newsreader-Variable.woff2` | yes (`src/styles/fonts.css`) | Playwright `@performance` — assets HTTP 200 |
| FA | `/fonts/vazirmatn/Vazirmatn-Variable.woff2`, `/fonts/estedad/Estedad-Variable.woff2` | yes (`src/styles/fonts.css`) | Playwright `@performance` — assets HTTP 200 |

Manifest and SHA-256: `public/fonts/MANIFEST.md`.

Bundled CSS retains `font-display: swap`; body computed `font-family` resolves to Inter on EN home.

---

## Deferrals and open items

| Item | Notes |
|---|---|
| Production RUM / 75th-percentile LCP | requires deployed origin + field data |
| INP budget | no representative interaction probe yet |
| Full route-family matrix | only home + one index in this packet |
| PUBLIC-280 dual-theme matrix | remains open on PUBLIC-280 |
| PUBLIC-060 computed-style font QA | subset/coverage fixtures still open |
| PUBLIC-190 visual acceptance | independent QA stays `REVISE` |

---

## Blockers and notes

- Local probes measure built static output on loopback; cold CDN, HTTP/2 push, and edge caching are not represented.
- Do not extrapolate local milliseconds to production SLAs without field measurement.
