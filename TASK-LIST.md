# Public Site Task List

Detailed execution queue. Cross-repo board: `../../Docs/05-delivery/MULTI-AGENT-TASK-BOARD.md` (IDs prefixed `PUBLIC-`).

Status: `[x]` done, `[ ]` open, `[~]` in progress.

---

## PUB-0 — Scaffold and toolchain

- [x] **PUBLIC-010** Init Astro 7 + TypeScript 5.9; commit lockfile; `npm run build` green.
- [ ] **PUBLIC-011** ESLint + Prettier aligned with repo conventions.
- [x] **PUBLIC-012** GitHub Actions: install, unit tests, design + SEO validation, build (Phase 1 CI). Evidence: `.github/workflows/ci.yml` on push/PR; Playwright visual optional locally.
- [ ] **PUBLIC-013** ADRs: package manager, routing, deployment, testing, browsers.

## PUB-1 — i18n, theme, fonts

- [x] **PUBLIC-020** Tailwind CSS 4 on semantic CSS variables from design authority.
- [x] **PUBLIC-030** `astro:i18n` for `fa`/`en`; strict no-fallback policy.
- [x] **PUBLIC-040** Language gateway `/` per `ROUTE-REGISTRY.md`.
- [x] **PUBLIC-050** Self-host Newsreader, Inter, Estedad, Vazirmatn (OFL + license files). WOFF2 under `public/fonts/`; `@font-face` in `src/styles/fonts.css`; CDN removed from `BaseLayout.astro`; locale tokens wired per `FONT-ACQUISITION-PLAN.md`. **Remaining for PS-10:** subset/coverage fixtures, computed-style QA (PUBLIC-060), CLS/preload budget (PUBLIC-290).
- [ ] **PUBLIC-060** `--font-display` / `--font-body` per locale; computed-style tests.
- [x] **PUBLIC-070** Light / Dark / system theme foundation; resolved before paint, persisted, and multi-instance safe. Evidence: WP-10 focused Playwright acceptance covers requested/resolved state, preference changes, persistence, event detail/count, and multiple controls.
- [x] **PUBLIC-080** Focus, skip link, reduced-motion baseline. Evidence: WP-10 keyboard-focus and reduced-motion acceptance.

## PUB-2 — API and routes

- [x] PS-05 OpenAPI accepted; client generation unblocked.
- [x] **PUBLIC-090** Generate types from accepted public OpenAPI hash.
- [x] **PUBLIC-100** Typed client; enforce published-only gate on reads.
- [x] **PUBLIC-110** Route helpers, canonical URLs, hreflang, alternates.
- [x] **PUBLIC-120** Env schema + dev proxy to backend (`LOCAL-DEVELOPMENT.md`).

## PUB-3 — Design system and atlas

- [x] **PUBLIC-130** Pin and validate semantic tokens from `agent-kit/tokens.json`; complete primitive/semantic/type/motion/layout/component projection and portable snapshot validate locally and against central authority.
- [x] **PUBLIC-140** Primitives per `components.json` (24 components). Evidence: Vitest `public-140`, design contract, Atlas gallery on `main`.
- [x] **PUBLIC-150** Header, Footer, shell, navigation (RTL/LTR). Evidence: `public-150` Vitest + Playwright shell/a11y gates.
- [x] **PUBLIC-160** Six templates per `templates.json`. Evidence: `public-160` Vitest + Atlas template gallery.
- [x] **PUBLIC-170** Visual Atlas `/_design/` local-only; excluded from production. Evidence: `public-170` Vitest + atlas e2e gate.
- [x] **PUBLIC-180** State components: loading, empty, unavailable, error, untranslated, no-results. Evidence: `public-180.behavior.test.ts` + Atlas state sheet specimens.

## PUB-4 — Page families (PF-01..PF-08)

**Recovery freeze:** Page-family development `PUBLIC-200` through `PUBLIC-240` remains frozen until `PUBLIC-190` receives independent visual QA `PASS` and explicit owner acceptance. `WP-25` and `PUBLIC-260` remain allowed. The prerequisite chain is `PUBLIC-070 → PUBLIC-080 → PUBLIC-130 → PUBLIC-140 → PUBLIC-150 → PUBLIC-160 → PUBLIC-170`, plus `PUBLIC-180` and `BACKEND-070`, before visual acceptance can close `PUBLIC-190`.

- [~] **PUBLIC-190** Home `/{locale}/` — **structure complete; visual acceptance open**. No final acceptance claim; independent QA and owner approval remain required.
- [x] **PUBLIC-200** About — profile sections; fetch only `/api/profiles/{locale}/about`. Unavailable ContentState when unpublished; anchor sections when API returns published profile.
- [ ] **PUBLIC-201** Research + publications indexes and details.
- [ ] **PUBLIC-210** Projects index + detail; sanitized media only.
- [ ] **PUBLIC-211** Writing index + long-form detail.
- [ ] **PUBLIC-212** Books, talks, downloads (honest unavailable until records exist).
- [ ] **PUBLIC-220** Teaching + creative with **seed v1.1 empty states** (`seed.empty.teaching.*`, `seed.empty.creative.*`).
- [ ] **PUBLIC-221** CV/resume with **seed.empty.cv.*** until owner files approved.
- [x] **PUBLIC-230** Contact — form + JSON; handle 422 HTML per error matrix.
- [x] **PUBLIC-240** Pagefind search per locale.

## PUB-5 — SEO, assets, quality

- [x] **PUBLIC-250** sitemap, robots, canonical, hreflang validation. Evidence: `@astrojs/sitemap`, `public/robots.txt`, `npm run validate:seo`, `public-250.seo.test.ts`.
- [x] **PUBLIC-260** Asset promotion group A (decorative) per `ASSET-PROMOTION-LEDGER.md`. Evidence: `public-260.asset-promotion.test.ts`, promoted atmosphere masters in `src/assets/media`, legacy `public/media/art/portal-*` removed, ThemePicture atmosphere pipeline.
- [x] **PUBLIC-261** Asset promotion group B (previews, rails, brand shell) per `ASSET-PROMOTION-LEDGER.md`. Evidence: `public-261.asset-promotion.test.ts`, promoted preview/rail/brand masters in `src/assets/media`, legacy `public/media/art/project-*` and `public/media/brand/taha-mark-primary.png` removed, Header/Footer wired to PromotedPicture `brand.mark`.
- [~] **PUBLIC-270** PF visual comparison vs `concepts/page-families/`. Evidence: `docs/quality/PUBLIC-270-PAGE-FAMILY-VISUAL-EVIDENCE.md`, `public-270.page-family-visual.test.ts`, Playwright `@visual` capture stubs at 1440/390 (36 passed, PF-02 skipped). Manual owner compare and `PUBLIC-190` acceptance remain open.
- [~] **PUBLIC-280** Responsive matrix: 6 widths × 2 locales × 2 themes. Evidence: `docs/quality/PUBLIC-280-RESPONSIVE-MATRIX-EVIDENCE.md`, `public-280.responsive-matrix.test.ts`, Playwright `@visual` index captures (108 = 18 routes × 6 widths; PF-02 detail + dual-theme matrix open). Manual owner compare and `PUBLIC-190` acceptance remain open.
- [ ] **PUBLIC-290** Performance budget (LCP, CLS, font preload).
- [ ] **PUBLIC-300** No-JS readability audit all route families.
- [ ] **PUBLIC-310** Contract fixture tests in CI.
- [ ] **PUBLIC-320** Integrated staging smoke with backend.
- [ ] **PUBLIC-350** Release evidence (`R4` + `R8` public).

---

## Completed baseline

- [x] Repository connected; greenfield policy documented.
- [x] Design authority + PF contracts read.
- [x] Static-first Astro architecture accepted (ADR-0002).
