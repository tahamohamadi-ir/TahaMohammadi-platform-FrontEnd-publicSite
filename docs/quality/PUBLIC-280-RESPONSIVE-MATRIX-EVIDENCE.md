# PUBLIC-280 Responsive Matrix Evidence Checklist

**Packet:** PUBLIC-280  
**Public-site base:** follows `PUBLIC-270` capture stubs  
**Widths:** 320, 390, 768, 1024, 1280, 1440 CSS pixels (`src/test-harness/responsive-matrix-widths.ts`)  
**Contract:** `Docs/04-design/VISUAL-QA-CONTRACT.md`, page-family visual atlas  
**Status:** scaffold — PF-01 six-width capture stubs only; full PF-01..PF-08 matrix remains open.

This checklist does **not** close `PUBLIC-190`. Automated gates may pass while manual visual acceptance stays `REVISE`.

---

## Scaffold scope (this slice)

| PF | Route(s) | Locales | Theme | Widths | Capture stub | Automated gate | Manual owner compare |
|---|---|---|---|---|---|---|---|
| PF-01 | `/{locale}/creative/` | EN, FA | Light | 320, 390, 768, 1024, 1280, 1440 | `public-280-pf01-{locale}-{width}-light.png` | scaffold only | [ ] |

**Stub output directory:** `test-results/visual/` (gitignored).

**Runner:** `npm run test:visual -- --grep PUBLIC-280`

---

## Full matrix (open after scaffold stabilizes)

Extend the `PUBLIC-270` index route map across all six widths and both themes per page-family contract. `PUBLIC-290` performance budget follows matrix evidence.

---

## Blockers and notes

- **320px overflow (PF-01):** cleared — EN creative index reflows within 320 CSS px after narrow shell utility tightening (`shell.css`); PUBLIC-280 overflow gate applies at all six widths.
- **PUBLIC-270:** 1440/390 index captures must stay green before expanding width coverage.
- **PUBLIC-190:** structure complete; visual acceptance open until independent QA `PASS` and explicit owner approval.
- **PF-02 detail:** detail routes remain open until published creative detail pages exist in the static build.
