# PUBLIC-270 Page-Family Visual Evidence Checklist

**Packet:** PUBLIC-270  
**Public-site base:** `27fc859` (`main`; PUBLIC-270 re-run 2026-09-01)  
**Concept authority:** `Docs/references/frontend-design-authority/concepts/page-families/`  
**Contract:** `Docs/04-design/PAGE-FAMILY-UI-UX-CONTRACT.md`, `Docs/04-design/VISUAL-QA-CONTRACT.md`  
**Status:** automated 1440/390 index captures green; owner comparison and acceptance remain open.

This checklist does **not** close `PUBLIC-190`. Automated gates may pass while manual visual acceptance stays `REVISE`.

---

## Automated gate (2026-09-01 @ `27fc859`)

| Gate            | Command                                                       | Result                   | Notes                                            |
| --------------- | ------------------------------------------------------------- | ------------------------ | ------------------------------------------------ |
| Build           | `npm run build`                                               | PASS                     | 23 static pages                                  |
| Vitest scaffold | `npm test` (includes `public-270.page-family-visual.test.ts`) | PASS                     | 214 tests; PF route map guard                    |
| Visual capture  | `npm run test:visual -- --grep PUBLIC-270`                    | **36 passed, 1 skipped** | PF-02 detail skipped (no published detail route) |

**Capture artifacts:** 36 PNG files under `test-results/visual/public-270-*.png` (gitignored; regenerate with command above).

---

## Capture matrix (PF-01..PF-08)

Compare each implementation screenshot against the matching concept at the same viewport, locale, theme, and honest content state.

| PF    | Concept reference                       | Primary route(s)                                 | Contract theme | Required QA locales | Capture path (1440 / 390)                                                                                                            | Automated gate             | Manual owner compare |
| ----- | --------------------------------------- | ------------------------------------------------ | -------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | -------------------- |
| PF-01 | `creative-index-light.png`              | `/{locale}/creative/`                            | Light          | EN, FA narrow       | `test-results/visual/public-270-pf01-{locale}-{width}-light.png`                                                                     | PASS (4 captures)          | [ ]                  |
| PF-02 | `creative-detail-dark.png`              | `/{locale}/creative/{slug}/`                     | Dark           | EN, FA              | `public-270-pf02-{locale}-{width}-dark.png` (when detail built)                                                                      | **SKIP** (no detail route) | [ ]                  |
| PF-03 | `writing-index-light.png`               | `/{locale}/writing/`                             | Light          | EN, FA              | `test-results/visual/public-270-pf03-{locale}-{width}-light.png`                                                                     | PASS (4 captures)          | [ ]                  |
| PF-04 | `projects-index-dark.png`               | `/{locale}/projects/`                            | Dark           | EN, FA              | `test-results/visual/public-270-pf04-{locale}-{width}-dark.png`                                                                      | PASS (4 captures)          | [ ]                  |
| PF-05 | `research-publications-index-light.png` | `/{locale}/research/`, `/{locale}/publications/` | Light          | EN, FA              | `test-results/visual/public-270-pf05-research-{locale}-{width}-light.png`, `public-270-pf05-publications-{locale}-{width}-light.png` | PASS (8 captures)          | [ ]                  |
| PF-06 | `teaching-index-dark.png`               | `/{locale}/teaching/`                            | Dark           | EN, FA              | `test-results/visual/public-270-pf06-{locale}-{width}-dark.png`                                                                      | PASS (4 captures)          | [ ]                  |
| PF-07 | `about-cv-light.png`                    | `/{locale}/about/`, `/{locale}/cv/`              | Light          | EN, FA              | `test-results/visual/public-270-pf07-about-{locale}-{width}-light.png`, `public-270-pf07-cv-{locale}-{width}-light.png`              | PASS (8 captures)          | [ ]                  |
| PF-08 | `contact-dark.png`                      | `/{locale}/contact/`                             | Dark           | EN, FA              | `test-results/visual/public-270-pf08-{locale}-{width}-dark.png`                                                                      | PASS (4 captures)          | [ ]                  |

**Stub output directory:** `test-results/visual/` (gitignored; hash and attach in QA report when captured).

**Widths in this packet:** 1440 and 390 CSS pixels (`PUBLIC-280` adds the full six-width matrix).

**Capture inventory (36 files, 2026-09-01):** `public-270-pf01-en-1440-light.png`, `public-270-pf01-en-390-light.png`, `public-270-pf01-fa-1440-light.png`, `public-270-pf01-fa-390-light.png`, `public-270-pf03-en-1440-light.png`, `public-270-pf03-en-390-light.png`, `public-270-pf03-fa-1440-light.png`, `public-270-pf03-fa-390-light.png`, `public-270-pf04-en-1440-dark.png`, `public-270-pf04-en-390-dark.png`, `public-270-pf04-fa-1440-dark.png`, `public-270-pf04-fa-390-dark.png`, `public-270-pf05-research-en-1440-light.png`, `public-270-pf05-research-en-390-light.png`, `public-270-pf05-research-fa-1440-light.png`, `public-270-pf05-research-fa-390-light.png`, `public-270-pf05-publications-en-1440-light.png`, `public-270-pf05-publications-en-390-light.png`, `public-270-pf05-publications-fa-1440-light.png`, `public-270-pf05-publications-fa-390-light.png`, `public-270-pf06-en-1440-dark.png`, `public-270-pf06-en-390-dark.png`, `public-270-pf06-fa-1440-dark.png`, `public-270-pf06-fa-390-dark.png`, `public-270-pf07-about-en-1440-light.png`, `public-270-pf07-about-en-390-light.png`, `public-270-pf07-about-fa-1440-light.png`, `public-270-pf07-about-fa-390-light.png`, `public-270-pf07-cv-en-1440-light.png`, `public-270-pf07-cv-en-390-light.png`, `public-270-pf07-cv-fa-1440-light.png`, `public-270-pf07-cv-fa-390-light.png`, `public-270-pf08-en-1440-dark.png`, `public-270-pf08-en-390-dark.png`, `public-270-pf08-fa-1440-dark.png`, `public-270-pf08-fa-390-dark.png`.

---

## Honest state coverage (manual, per contract)

| PF    | States to review before acceptance                                    |
| ----- | --------------------------------------------------------------------- |
| PF-01 | ready, empty, unavailable, error                                      |
| PF-02 | ready, media unavailable, private, error                              |
| PF-03 | ready, empty, filtered, no-results, error                             |
| PF-04 | ready, empty, filtered, error                                         |
| PF-05 | ready, empty, filtered, unavailable, error                            |
| PF-06 | ready, empty, unavailable, error                                      |
| PF-07 | ready, untranslated, document unavailable, error                      |
| PF-08 | idle, client validation, submitting, sent, server error, rate-limited |

---

## Automated scaffold

| Artifact                                           | Role                                                                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/public-270-page-families.visual.e2e.ts` | Playwright `@visual` capture stubs at 1440/390 for built index routes                                                       |
| `src/public-270.page-family-visual.test.ts`        | Vitest guard: checklist exists and PF route map matches contract                                                            |
| `scripts/page-family-visual-compare.mjs`           | Canonical capture → concept reference mapping (PF-01..PF-08 + home)                                                         |
| `scripts/generate-visual-compare-report.mjs`       | HTML side-by-side owner compare report from existing PNGs                                                                   |
| `scripts/extract-visual-signoff-hashes.mjs`        | Markdown/JSON/TSV SHA-256 table for QA §4 paste (does not auto-approve)                                                     |
| `src/test-harness/responsive-matrix-widths.ts`     | Shared width constants for PUBLIC-270/280                                                                                   |
| `npm run test:visual -- --grep PUBLIC-270`         | Runs only PUBLIC-270 capture stubs                                                                                          |
| `npm run report:visual-compare`                    | Generates `test-results/visual/compare-report.html` (no new captures)                                                       |
| `npm run report:signoff-hashes`                    | Prints §4 sign-off markdown table from local PNGs (alias: `extract:visual-hashes`; add `-- --ready-only` for concept pairs) |

---

## Owner visual compare workflow (does not close PUBLIC-190)

1. Regenerate captures (if missing or stale). From repo root: `cd Front-End/public-site` first. When your shell is already in `Front-End/public-site`, run commands below directly (no nested `cd`):

   ```powershell
   npm run build
   npm run test:visual -- --grep PUBLIC-270
   ```

   One command (build + captures + compare report): `npm run review:visual`

2. Optional home/gateway captures (WP-40):

   ```powershell
   npm run test:visual -- --grep "WP-40 home captures"
   ```

3. Generate side-by-side HTML report:

   ```powershell
   npm run report:visual-compare
   ```

   Open `test-results/visual/compare-report.html` in a browser. The report pairs each `public-270-*.png` capture with its concept reference under `Docs/references/frontend-design-authority/concepts/page-families/`, and WP-40 home captures with `concepts/home-*.png`. SHA-256 hashes are shown for owner sign-off in `Docs/10-tracking/PUBLIC-190-VISUAL-QA.md`.

4. Print §4 paste table (after manual review — does **not** change verdict):

   ```powershell
   npm run report:signoff-hashes
   npm run report:signoff-hashes -- --ready-only
   npm run report:signoff-hashes -- --from-report
   ```

5. Override design authority root when not in the coordination workspace:

   ```powershell
   $env:DESIGN_AUTHORITY_ROOT = "D:\path\to\frontend-design-authority"
   npm run report:visual-compare
   ```

**Mapping source of truth:** `scripts/page-family-visual-compare.mjs` (guarded by `src/public-270-visual-compare.test.ts`).

| Capture pattern                            | Concept reference (under design authority)                     |
| ------------------------------------------ | -------------------------------------------------------------- |
| `public-270-pf01-*-light.png`              | `concepts/page-families/creative-index-light.png`              |
| `public-270-pf03-*-light.png`              | `concepts/page-families/writing-index-light.png`               |
| `public-270-pf04-*-dark.png`               | `concepts/page-families/projects-index-dark.png`               |
| `public-270-pf05-research-*-light.png`     | `concepts/page-families/research-publications-index-light.png` |
| `public-270-pf05-publications-*-light.png` | `concepts/page-families/research-publications-index-light.png` |
| `public-270-pf06-*-dark.png`               | `concepts/page-families/teaching-index-dark.png`               |
| `public-270-pf07-about-*-light.png`        | `concepts/page-families/about-cv-light.png`                    |
| `public-270-pf07-cv-*-light.png`           | `concepts/page-families/about-cv-light.png`                    |
| `public-270-pf08-*-dark.png`               | `concepts/page-families/contact-dark.png`                      |
| `wp40-home-en-768-light.png`               | _(none — no EN tablet concept)_                                |
| `wp40-home-en-768-dark.png`                | _(none — no EN tablet/dark narrow concept)_                    |
| `wp40-home-fa-768-light.png`               | `concepts/home-mobile-fa-light-concept-v1.png` (390 mobile)    |
| `wp40-home-fa-768-dark.png`                | _(none — no FA dark mobile concept)_                           |
| `wp40-home-fa-200pct-light.png`            | `concepts/home-mobile-fa-light-concept-v1.png` (390 mobile)    |
| `wp40-gateway-200pct-light.png`            | `concepts/language-gateway-dark-concept-v1.png` (layout only)  |

768px EN captures no longer pair with 1440 desktop concepts. Pairing uses `resolveHomeConceptReference()` in `scripts/page-family-visual-compare.mjs`.

Manual owner compare columns in the matrix above remain `[ ]` until explicit owner approval.

---

## Blockers and notes

- **PF-02 detail:** capture runs only when a published creative detail route exists in the static build; otherwise index/unavailable evidence is recorded and detail remains open.
- **PUBLIC-190:** remains structure complete with visual acceptance **open** (`REVISE` at coordination `a17f3a5`); independent QA `PASS` and explicit owner approval still required. Do not mark PASS without owner evidence.
- **PUBLIC-280:** scaffold added (`docs/quality/PUBLIC-280-RESPONSIVE-MATRIX-EVIDENCE.md`); PF-01 six-width stubs follow stable PUBLIC-270 captures.
