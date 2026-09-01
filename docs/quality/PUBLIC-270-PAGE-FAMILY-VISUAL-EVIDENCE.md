# PUBLIC-270 Page-Family Visual Evidence Checklist

**Packet:** PUBLIC-270  
**Public-site base:** `fe4dbbe` (`main`; PUBLIC-261)  
**Concept authority:** `Docs/references/frontend-design-authority/concepts/page-families/`  
**Contract:** `Docs/04-design/PAGE-FAMILY-UI-UX-CONTRACT.md`, `Docs/04-design/VISUAL-QA-CONTRACT.md`  
**Status:** scaffold — automated capture stubs only; owner comparison and acceptance remain open.

This checklist does **not** close `PUBLIC-190`. Automated gates may pass while manual visual acceptance stays `REVISE`.

---

## Capture matrix (PF-01..PF-08)

Compare each implementation screenshot against the matching concept at the same viewport, locale, theme, and honest content state.

| PF | Concept reference | Primary route(s) | Contract theme | Required QA locales | Capture stub (1440 / 390) | Manual owner compare |
|---|---|---|---|---|---|---|
| PF-01 | `creative-index-light.png` | `/{locale}/creative/` | Light | EN, FA narrow | `public-270-pf01-{locale}-{width}-light.png` | [ ] |
| PF-02 | `creative-detail-dark.png` | `/{locale}/creative/{slug}/` | Dark | EN, FA | `public-270-pf02-{locale}-{width}-dark.png` (when detail built) | [ ] |
| PF-03 | `writing-index-light.png` | `/{locale}/writing/` | Light | EN, FA | `public-270-pf03-{locale}-{width}-light.png` | [ ] |
| PF-04 | `projects-index-dark.png` | `/{locale}/projects/` | Dark | EN, FA | `public-270-pf04-{locale}-{width}-dark.png` | [ ] |
| PF-05 | `research-publications-index-light.png` | `/{locale}/research/`, `/{locale}/publications/` | Light | EN, FA | `public-270-pf05-research-{locale}-{width}-light.png`, `public-270-pf05-publications-{locale}-{width}-light.png` | [ ] |
| PF-06 | `teaching-index-dark.png` | `/{locale}/teaching/` | Dark | EN, FA | `public-270-pf06-{locale}-{width}-dark.png` | [ ] |
| PF-07 | `about-cv-light.png` | `/{locale}/about/`, `/{locale}/cv/` | Light | EN, FA | `public-270-pf07-about-{locale}-{width}-light.png`, `public-270-pf07-cv-{locale}-{width}-light.png` | [ ] |
| PF-08 | `contact-dark.png` | `/{locale}/contact/` | Dark | EN, FA | `public-270-pf08-{locale}-{width}-dark.png` | [ ] |

**Stub output directory:** `test-results/visual/` (gitignored; hash and attach in QA report when captured).

**Widths in this packet:** 1440 and 390 CSS pixels (`PUBLIC-280` adds the full six-width matrix).

---

## Honest state coverage (manual, per contract)

| PF | States to review before acceptance |
|---|---|
| PF-01 | ready, empty, unavailable, error |
| PF-02 | ready, media unavailable, private, error |
| PF-03 | ready, empty, filtered, no-results, error |
| PF-04 | ready, empty, filtered, error |
| PF-05 | ready, empty, filtered, unavailable, error |
| PF-06 | ready, empty, unavailable, error |
| PF-07 | ready, untranslated, document unavailable, error |
| PF-08 | idle, client validation, submitting, sent, server error, rate-limited |

---

## Automated scaffold

| Artifact | Role |
|---|---|
| `tests/e2e/public-270-page-families.visual.e2e.ts` | Playwright `@visual` capture stubs at 1440/390 for built index routes |
| `src/public-270.page-family-visual.test.ts` | Vitest guard: checklist exists and PF route map matches contract |
| `npm run test:visual -- --grep PUBLIC-270` | Runs only PUBLIC-270 capture stubs |

---

## Blockers and notes

- **PF-02 detail:** capture runs only when a published creative detail route exists in the static build; otherwise index/unavailable evidence is recorded and detail remains open.
- **PUBLIC-190:** remains structure complete with visual acceptance open until independent QA `PASS` and explicit owner approval.
- **PUBLIC-280:** follows this checklist with the full responsive matrix once evidence stubs are stable.
