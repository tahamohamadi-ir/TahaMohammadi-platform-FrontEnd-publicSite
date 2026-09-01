# PUBLIC-280 Responsive Matrix Evidence Checklist

**Packet:** PUBLIC-280  
**Public-site base:** follows `PUBLIC-270` index route map  
**Widths:** 320, 390, 768, 1024, 1280, 1440 CSS pixels (`src/test-harness/responsive-matrix-widths.ts`)  
**Themes:** light and dark (`src/test-harness/page-family-index-captures.ts`)  
**Contract:** `Docs/04-design/VISUAL-QA-CONTRACT.md`, page-family visual atlas  
**Status:** automated six-width dual-theme index captures for PF-01 and PF-03..PF-08; PF-02 detail remains open.

This checklist does **not** close `PUBLIC-190`. Automated gates may pass while manual visual acceptance stays `REVISE`.

---

## Automated gate

| Gate | Command | Result | Notes |
|---|---|---|---|
| Build | `npm run build` | PASS | 23 static pages |
| Vitest scaffold | `npm test` (includes `public-280.responsive-matrix.test.ts`) | PASS | six-width + dual-theme + route map guard |
| Visual capture | `npm run test:visual -- --grep PUBLIC-280` | **216 passed** | 36 locale-route-theme combos × 6 widths; overflow gate at all widths |
| CI | `.github/workflows/ci.yml` | push/PR | unit + design + SEO + build (visual optional locally) |

---

## Capture matrix (PF-01, PF-03..PF-08 index routes)

Compare each implementation screenshot against the matching concept at the same viewport, locale, theme, and honest content state.

| PF | Route(s) | Locales | Themes | Widths | Capture path | Automated gate | Manual owner compare |
|---|---|---|---|---|---|---|---|
| PF-01 | `/{locale}/creative/` | EN, FA | Light, Dark | 320–1440 | `test-results/visual/public-280-pf01-{locale}-{width}-{theme}.png` | PASS (24 captures) | [ ] |
| PF-03 | `/{locale}/writing/` | EN, FA | Light, Dark | 320–1440 | `test-results/visual/public-280-pf03-{locale}-{width}-{theme}.png` | PASS (24 captures) | [ ] |
| PF-04 | `/{locale}/projects/` | EN, FA | Light, Dark | 320–1440 | `test-results/visual/public-280-pf04-{locale}-{width}-{theme}.png` | PASS (24 captures) | [ ] |
| PF-05 | `/{locale}/research/`, `/{locale}/publications/` | EN, FA | Light, Dark | 320–1440 | `public-280-pf05-research-{locale}-{width}-{theme}.png`, `public-280-pf05-publications-{locale}-{width}-{theme}.png` | PASS (48 captures) | [ ] |
| PF-06 | `/{locale}/teaching/` | EN, FA | Light, Dark | 320–1440 | `test-results/visual/public-280-pf06-{locale}-{width}-{theme}.png` | PASS (24 captures) | [ ] |
| PF-07 | `/{locale}/about/`, `/{locale}/cv/` | EN, FA | Light, Dark | 320–1440 | `public-280-pf07-about-{locale}-{width}-{theme}.png`, `public-280-pf07-cv-{locale}-{width}-{theme}.png` | PASS (48 captures) | [ ] |
| PF-08 | `/{locale}/contact/` | EN, FA | Light, Dark | 320–1440 | `test-results/visual/public-280-pf08-{locale}-{width}-{theme}.png` | PASS (24 captures) | [ ] |

**Stub output directory:** `test-results/visual/` (gitignored).

**Runner:** `npm run test:visual -- --grep PUBLIC-280`

**Coverage count:** 216 files (18 locale-routes × 2 themes × 6 widths). PF-02 creative detail excluded until a published detail route exists in the static build.

**Capture path pattern:** `test-results/visual/public-280-{route-id}-{locale}-{width}-{theme}.png`

---

## Open after index matrix

| Item | Notes |
|---|---|
| PF-02 detail | `/{locale}/creative/{slug}/` light/dark captures when detail route ships |
| Manual owner compare | all PF rows above |
| PUBLIC-290 | performance budget follows matrix evidence |

---

## Blockers and notes

- **Overflow gate:** applies at all six widths (`scrollWidth <= innerWidth`); PF-01 320px header overflow cleared on EN creative index (`shell.css`).
- **PUBLIC-270:** 1440/390 index captures must stay green before owner compare at six widths.
- **PUBLIC-190:** structure complete; visual acceptance open until independent QA `PASS` and explicit owner approval. Do not mark PASS without owner evidence.
- **PF-02 detail:** detail routes remain open until published creative detail pages exist in the static build.
