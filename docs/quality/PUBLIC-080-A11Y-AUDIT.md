# PUBLIC-080 Automated Accessibility Crawl Evidence

**Packet:** PUBLIC-080  
**Authority:** `docs/quality/ACCESSIBILITY.md` — WCAG 2.2 AA target  
**Environment:** local static preview — Playwright builds `dist/` and serves via `scripts/serve-dist.mjs`  
**Status:** automated landmark + axe WCAG 2.2 AA scan of all 23 static build routes; manual keyboard, screen-reader, and zoom matrix remains open per `PUBLIC-190`.

This checklist does **not** close `PUBLIC-190`. Automated scans are necessary but not sufficient for acceptance.

---

## Automated gate

| Gate             | Command                                               | Result        | Notes                                |
| ---------------- | ----------------------------------------------------- | ------------- | ------------------------------------ |
| Build            | `npm run build`                                       | PASS          | 23 static pages                      |
| Vitest scaffold  | `npm test` (includes `public-080.a11y-audit.test.ts`) | PASS          | route map + wiring guard             |
| A11y crawl       | `npm run test:a11y`                                   | **29 passed** | 23 route scans + 6 foundation probes |
| Design authority | `npm run validate:design`                             | PASS          | semantic token contract              |
| CI               | `.github/workflows/ci.yml`                            | push/PR       | a11y optional locally                |

**Runner:** `npm run test:a11y`

**Harness:** `src/test-harness/a11y-audit.ts`, `tests/e2e/public-080-a11y-crawl.e2e.ts`

**Axe tags:** `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`

---

## Route coverage (23 static pages)

Same route map as PUBLIC-300 — gateway, home EN/FA, PF-01 and PF-03..PF-08 index routes, and search utility.

**Excluded:** PF-02 creative detail until a published detail route ships in the static build.

---

## Per-route checks

Each crawl asserts:

1. HTTP 200 from the built static preview
2. `#main-content`, header, and footer visible
3. Exactly one document H1
4. For locale routes: `lang`/`dir` attributes
5. Zero axe violations at WCAG 2.2 AA tag level

Foundation probes (WP-10/PUBLIC-150) cover skip-link focus, theme-control contrast, and reduced-motion transitions separately.

---

## Deferrals and open items

| Item                         | Notes                                           |
| ---------------------------- | ----------------------------------------------- |
| Manual keyboard matrix       | gateway, home, PF-01..PF-08, search — owner §3  |
| Real 200% browser zoom       | owner §3                                        |
| Screen-reader spot checks    | owner §3                                        |
| PF-02 detail                 | add when creative detail pages exist in `dist/` |
| PUBLIC-190 visual acceptance | independent QA stays `REVISE`                   |

---

## Blockers and notes

- Brand mark in header/footer uses `alt=""` when adjacent brand name text is present (avoids redundant-alt noise).
- Do not commit `dist/`, `test-results/`, or browser traces.
