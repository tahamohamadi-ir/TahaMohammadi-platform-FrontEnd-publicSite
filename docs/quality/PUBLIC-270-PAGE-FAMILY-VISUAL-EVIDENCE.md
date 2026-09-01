# PUBLIC-270 Page-Family Visual Evidence Checklist

**Packet:** PUBLIC-270  
**Public-site base:** `29db66e` (`main`; PUBLIC-270 scaffold + capture gate)  
**Concept authority:** `Docs/references/frontend-design-authority/concepts/page-families/`  
**Contract:** `Docs/04-design/PAGE-FAMILY-UI-UX-CONTRACT.md`, `Docs/04-design/VISUAL-QA-CONTRACT.md`  
**Status:** automated 1440/390 index captures green; owner comparison and acceptance remain open.

This checklist does **not** close `PUBLIC-190`. Automated gates may pass while manual visual acceptance stays `REVISE`.

---

## Automated gate (2026-09-01)

| Gate            | Command                                                       | Result                   | Notes                                            |
| --------------- | ------------------------------------------------------------- | ------------------------ | ------------------------------------------------ |
| Build           | `npm run build`                                               | PASS                     | 23 static pages                                  |
| Vitest scaffold | `npm test` (includes `public-270.page-family-visual.test.ts`) | PASS                     | PF route map guard                               |
| Visual capture  | `npm run test:visual -- --grep PUBLIC-270`                    | **36 passed, 1 skipped** | PF-02 detail skipped (no published detail route) |

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

| Artifact                                           | Role                                                                  |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| `tests/e2e/public-270-page-families.visual.e2e.ts` | Playwright `@visual` capture stubs at 1440/390 for built index routes |
| `src/public-270.page-family-visual.test.ts`        | Vitest guard: checklist exists and PF route map matches contract      |
| `src/test-harness/responsive-matrix-widths.ts`     | Shared width constants for PUBLIC-270/280                             |
| `npm run test:visual -- --grep PUBLIC-270`         | Runs only PUBLIC-270 capture stubs                                    |

---

## Blockers and notes

- **PF-02 detail:** capture runs only when a published creative detail route exists in the static build; otherwise index/unavailable evidence is recorded and detail remains open.
- **PUBLIC-190:** remains structure complete with visual acceptance **open** (`REVISE` at coordination `a17f3a5`); independent QA `PASS` and explicit owner approval still required. Do not mark PASS without owner evidence.
- **PUBLIC-280:** scaffold added (`docs/quality/PUBLIC-280-RESPONSIVE-MATRIX-EVIDENCE.md`); PF-01 six-width stubs follow stable PUBLIC-270 captures.
