# Public Site Task List

Detailed execution queue. Cross-repo board: `../../Docs/05-delivery/MULTI-AGENT-TASK-BOARD.md` (IDs prefixed `PUBLIC-`).

Status: `[x]` done, `[ ]` open, `[~]` in progress.

---

## PUB-0 — Scaffold and toolchain

- [x] **PUBLIC-010** Init Astro 7 + TypeScript 5.9; commit lockfile; `npm run build` green.
- [x] **PUBLIC-011** ESLint + Prettier aligned with repo conventions. Evidence: `eslint.config.js`, `.prettierrc`, `npm run lint`, `npm run format:check`, `src/public-011.toolchain.test.ts`, CI lint/format steps.
- [x] **PUBLIC-012** GitHub Actions: install, unit tests, design + SEO validation, build (Phase 1 CI). Evidence: `.github/workflows/ci.yml` on push/PR; Playwright visual optional locally.
- [x] **PUBLIC-013** ADRs: package manager, routing, deployment, testing, browsers. Evidence: `docs/architecture/README.md`, `ADR-PACKAGE-MANAGER.md`, `ADR-ROUTING.md`, `ADR-DEPLOYMENT.md`, `ADR-TESTING.md`, `ADR-BROWSER-SUPPORT.md`, `src/public-013.adr.test.ts`.

## PUB-1 — i18n, theme, fonts

- [x] **PUBLIC-020** Tailwind CSS 4 on semantic CSS variables from design authority.
- [x] **PUBLIC-030** `astro:i18n` for `fa`/`en`; strict no-fallback policy.
- [x] **PUBLIC-040** Language gateway `/` per `ROUTE-REGISTRY.md`.
- [x] **PUBLIC-050** Self-host Newsreader, Inter, Estedad, Vazirmatn (OFL + license files). WOFF2 under `public/fonts/`; `@font-face` in `src/styles/fonts.css`; CDN removed from `BaseLayout.astro`; locale tokens wired per `FONT-ACQUISITION-PLAN.md`. **Remaining for PS-10:** subset/coverage fixtures, CLS/preload budget (PUBLIC-290).
- [x] **PUBLIC-060** `--font-display` / `--font-body` per locale; computed-style tests. Evidence: `docs/quality/PUBLIC-060-FONT-COMPUTED-EVIDENCE.md`, `public-060.font-tokens.test.ts`, Playwright `@foundation` probes on home EN/FA. Subset/coverage fixtures remain open per FONT-ACQUISITION-PLAN PS-10.
- [x] **PUBLIC-070** Light / Dark / system theme foundation; resolved before paint, persisted, and multi-instance safe. Evidence: WP-10 focused Playwright acceptance covers requested/resolved state, preference changes, persistence, event detail/count, and multiple controls.
- [x] **PUBLIC-080** Focus, skip link, reduced-motion baseline. Evidence: WP-10 keyboard-focus and reduced-motion acceptance; `docs/quality/PUBLIC-080-A11Y-AUDIT.md`, `public-080.a11y-audit.test.ts`, Playwright `@a11y` WCAG 2.2 AA crawl (29 passed). Manual keyboard/screen-reader/zoom matrix remains open per PUBLIC-190 §3.

## PUB-2 — API and routes

> **Independent verification 2026-09-02:** PUBLIC-100/110/120 re-verified against their done-when criteria (client published-only gate, fa/en route helpers + canonical/hreflang, env schema + dev proxy) — lint, format:check, vitest 244/244, build, validate:design, validate:seo all pass. Central board synced.

- [x] PS-05 OpenAPI accepted; client generation unblocked.
- [x] **PUBLIC-090** Generate types from accepted public OpenAPI hash.
- [x] **PUBLIC-100** Typed client; enforce published-only gate on reads.
- [x] **PUBLIC-110** Route helpers, canonical URLs, hreflang, alternates.
- [x] **PUBLIC-120** Env schema + dev proxy to backend (`LOCAL-DEVELOPMENT.md`).

## PUB-3 — Design system and atlas

> **Independent verification 2026-09-02:** PUBLIC-140 (24/24 primitives vs pinned authority snapshot), PUBLIC-150 (shell + a11y crawl), PUBLIC-160 (6/6 templates), PUBLIC-170 (prod build excludes `/_design/`), PUBLIC-180 (state components, 15 behavior tests) — all VERIFIED; hygiene: `npm run format` applied to 21 drifted files, format:check green.

- [x] **PUBLIC-130** Pin and validate semantic tokens from `agent-kit/tokens.json`; complete primitive/semantic/type/motion/layout/component projection and portable snapshot validate locally and against central authority.
- [x] **PUBLIC-140** Primitives per `components.json` (24 components). Evidence: Vitest `public-140`, design contract, Atlas gallery on `main`.
- [x] **PUBLIC-150** Header, Footer, shell, navigation (RTL/LTR). Evidence: `public-150` Vitest + Playwright shell/a11y gates.
- [x] **PUBLIC-160** Six templates per `templates.json`. Evidence: `public-160` Vitest + Atlas template gallery.
- [x] **PUBLIC-170** Visual Atlas `/_design/` local-only; excluded from production. Evidence: `public-170` Vitest + atlas e2e gate.
- [x] **PUBLIC-180** State components: loading, empty, unavailable, error, untranslated, no-results. Evidence: `public-180.behavior.test.ts` + Atlas state sheet specimens.

## PUB-4 — Page families (PF-01..PF-08)

**Recovery freeze:** Page-family development `PUBLIC-200` through `PUBLIC-240` remains frozen until `PUBLIC-190` receives independent visual QA `PASS` and explicit owner acceptance. `WP-25` and `PUBLIC-260` remain allowed. The prerequisite chain is `PUBLIC-070 → PUBLIC-080 → PUBLIC-130 → PUBLIC-140 → PUBLIC-150 → PUBLIC-160 → PUBLIC-170`, plus `PUBLIC-180` and `BACKEND-070`, before visual acceptance can close `PUBLIC-190`.

**After `PUBLIC-190` PASS (owner evidence only):** unfreezes visual acceptance for `PUBLIC-201` through `PUBLIC-221` (routes already implemented); allows `PUBLIC-350` release-evidence `ready` evaluation to proceed past owner-acceptance blocker; enables coordination R4 page-family adoption checklist and R8 quality closure sign-off per `docs/quality/PUBLIC-350-RELEASE-EVIDENCE.md`. Does **not** auto-complete published PF-02 CMS detail (empty-shell preview exists; Category A slug still open), staging smoke (`PUBLIC-320`), or production telemetry (`PUBLIC-290`).

- [~] **PUBLIC-190** Home `/{locale}/` — **structure complete; visual acceptance open**. PF-02 honest empty-shell detail @ pending tip; Phase 8 Home split hero + Gateway 200% @ `84e83e9`; compare **39/48** ready (+ 4 PF-02 shell now capturable) @ `c14508a`. Coordination remediation pack: `Docs/10-tracking/PUBLIC-190-asset-prompts/` (owner regenerate decorative masters), `PUBLIC-190-VISUAL-REMEDIATION-PLAN.md`, `PUBLIC-190-IMPLEMENTATION-REQUIREMENTS.md`. **Open:** owner asset handback, CMS Category A, Category D nav labels, manual compare. Independent QA and owner approval remain required — **do not mark PASS**.
- [x] **PUBLIC-200** About — profile sections; fetch only `/api/profiles/{locale}/about`. Unavailable ContentState when unpublished; anchor sections when API returns published profile.
- [~] **PUBLIC-201** Research + publications indexes and details — implemented; frozen pending visual acceptance. Evidence: `public-201.behavior.test.ts`, `public-201.content.test.ts`, routes `/{locale}/research/`, `/{locale}/publications/`.
- [~] **PUBLIC-210** Projects index + detail; sanitized media only — implemented; frozen pending visual acceptance. Evidence: `public-210.behavior.test.ts`, `public-210.content.test.ts`, routes `/{locale}/projects/`.
- [~] **PUBLIC-211** Writing index + long-form detail — implemented; frozen pending visual acceptance. Evidence: `public-211.behavior.test.ts`, `public-211.content.test.ts`, routes `/{locale}/writing/`.
- [~] **PUBLIC-212** Books, talks, downloads — embedded in parent route families per `ROUTE-REGISTRY.md` (books → `writing` index via `listBooks`, talks → `teaching` index/detail via `listTalks`, downloads → `cv` via `GET /api/site`). No standalone `/books/`, `/talks/`, or `/downloads/` routes; honest unavailable states when API records absent. Evidence: `public-212.content.test.ts`.
- [~] **PUBLIC-220** Teaching + creative with **seed v1.1 empty states** (`seed.empty.teaching.*`, `seed.empty.creative.*`) — implemented; frozen pending visual acceptance. Evidence: `public-220.behavior.test.ts`, `public-221.behavior.test.ts` (creative), routes `/{locale}/teaching/`, `/{locale}/creative/`.
- [~] **PUBLIC-221** CV/resume with **seed.empty.cv.*** until owner files approved — implemented; frozen pending visual acceptance. Evidence: `public-221.content.test.ts`, route `/{locale}/cv/`.
- [x] **PUBLIC-230** Contact — form + JSON; handle 422 HTML per error matrix.
- [x] **PUBLIC-240** Pagefind search per locale.

## PUB-5 — SEO, assets, quality

- [x] **PUBLIC-250** sitemap, robots, canonical, hreflang validation. Evidence: `@astrojs/sitemap`, `public/robots.txt`, `npm run validate:seo`, `public-250.seo.test.ts`.
- [x] **PUBLIC-260** Asset promotion group A (decorative) per `ASSET-PROMOTION-LEDGER.md`. Evidence: `public-260.asset-promotion.test.ts`, promoted atmosphere masters in `src/assets/media`, legacy `public/media/art/portal-*` removed, ThemePicture atmosphere pipeline.
- [x] **PUBLIC-261** Asset promotion group B (previews, rails, brand shell) per `ASSET-PROMOTION-LEDGER.md`. Evidence: `public-261.asset-promotion.test.ts`, promoted preview/rail/brand masters in `src/assets/media`, legacy `public/media/art/project-*` and `public/media/brand/taha-mark-primary.png` removed, Header/Footer wired to PromotedPicture `brand.mark`.
- [~] **PUBLIC-270** PF visual comparison vs `concepts/page-families/`. Evidence: `docs/quality/PUBLIC-270-PAGE-FAMILY-VISUAL-EVIDENCE.md`, `public-270.page-family-visual.test.ts`, Playwright `@visual` capture stubs at 1440/390 (36 index + 4 PF-02 empty-shell). Manual owner compare and `PUBLIC-190` acceptance remain open.
- [~] **PUBLIC-280** Responsive matrix: 6 widths × 2 locales × 2 themes. Evidence: `docs/quality/PUBLIC-280-RESPONSIVE-MATRIX-EVIDENCE.md`, `public-280.responsive-matrix.test.ts`, `page-family-index-captures.ts`, Playwright `@visual` dual-theme index captures (216 = 36 locale-route-theme combos × 6 widths; PF-02 empty-shell not yet in six-width matrix). Manual owner compare and `PUBLIC-190` acceptance remain open.
- [~] **PUBLIC-290** Performance budget (LCP, CLS, font preload, local INP probe). Evidence: `docs/quality/PUBLIC-290-PERFORMANCE-BUDGET.md`, `public-290.performance-budget.test.ts`, Playwright `@performance` probes on home + creative index + theme-toggle INP. Production 75th-percentile telemetry remains open.
- [x] **PUBLIC-300** No-JS readability audit all route families. Evidence: `docs/quality/PUBLIC-300-NO-JS-AUDIT.md`, `public-300.no-js-audit.test.ts`, Playwright `@nojs` crawl of static routes with JS disabled. PF-02 empty-shell is built; published creative detail still CMS-gated.
- [x] **PUBLIC-310** Contract fixture tests in CI. Evidence: `docs/quality/PUBLIC-310-CONTRACT-FIXTURES.md`, `public-310.contract-fixtures.test.ts`, consumer fixtures under `tests/fixtures/contracts/`.
- [~] **PUBLIC-320** Integrated staging smoke with backend. Evidence: `docs/quality/PUBLIC-320-STAGING-SMOKE.md`, `public-320.staging-smoke.test.ts`, Playwright `@smoke` probes via `npm run test:smoke` (skipped until `PUBLIC_STAGING_SITE_URL` + `BACKEND-180` staging).
- [~] **PUBLIC-350** Release evidence (`R4` + `R8` public). Evidence: `docs/quality/PUBLIC-350-RELEASE-EVIDENCE.md`, `public-350.release-evidence.test.ts`, `src/test-harness/release-evidence.ts`. Honest `ready: false` until owner acceptance, staging smoke, and frozen page-family routes close; does **not** mark `PUBLIC-190` PASS.

---

## Completed baseline

- [x] Repository connected; greenfield policy documented.
- [x] Design authority + PF contracts read.
- [x] Static-first Astro architecture accepted (ADR-0002).
