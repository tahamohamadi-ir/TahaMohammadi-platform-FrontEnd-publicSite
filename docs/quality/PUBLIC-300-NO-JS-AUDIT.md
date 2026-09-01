# PUBLIC-300 No-JS Crawl Audit Evidence

**Packet:** PUBLIC-300  
**Authority:** workspace `AGENTS.md` — keep public content readable without JavaScript  
**Environment:** local static preview — Playwright builds `dist/` and serves via `scripts/serve-dist.mjs` with `javaScriptEnabled: false`  
**Status:** automated crawl of all 23 static build routes; PF-02 creative detail excluded until a published detail route exists in the static build.

This checklist does **not** close `PUBLIC-190`. Passing the no-JS crawl does not claim visual acceptance.

---

## Automated gate

| Gate             | Command                                                | Result        | Notes                                                |
| ---------------- | ------------------------------------------------------ | ------------- | ---------------------------------------------------- |
| Build            | `npm run build`                                        | PASS          | 23 static pages                                      |
| Vitest scaffold  | `npm test` (includes `public-300.no-js-audit.test.ts`) | PASS          | route map + wiring guard                             |
| No-JS crawl      | `npm run test:nojs`                                    | **23 passed** | gateway + home + PF index + search                   |
| Design authority | `npm run validate:design`                              | PASS          | semantic token contract                              |
| SEO              | `npm run validate:seo`                                 | PASS          | sitemap/hreflang/canonical                           |
| CI               | `.github/workflows/ci.yml`                             | push/PR       | unit + design + SEO + build (no-JS optional locally) |

**Runner:** `npm run test:nojs`

**Harness:** `src/test-harness/no-js-audit.ts`, `tests/e2e/public-300-nojs-crawl.e2e.ts`

---

## Route coverage (23 static pages)

| Profile | Route(s)                                         | Locales | Assertions without JS                           |
| ------- | ------------------------------------------------ | ------- | ----------------------------------------------- |
| Gateway | `/`                                              | —       | language-selection nav, locale links, single H1 |
| Home    | `/{locale}/`                                     | EN, FA  | shell chrome, hero H1, graph node labels        |
| PF-01   | `/{locale}/creative/`                            | EN, FA  | shell, H1, main content text                    |
| PF-03   | `/{locale}/writing/`                             | EN, FA  | shell, H1, main content text                    |
| PF-04   | `/{locale}/projects/`                            | EN, FA  | shell, H1, main content text                    |
| PF-05   | `/{locale}/research/`, `/{locale}/publications/` | EN, FA  | shell, H1, main content text                    |
| PF-06   | `/{locale}/teaching/`                            | EN, FA  | shell, H1, main content text                    |
| PF-07   | `/{locale}/about/`, `/{locale}/cv/`              | EN, FA  | shell, H1, main content text                    |
| PF-08   | `/{locale}/contact/`                             | EN, FA  | shell, H1, main content text                    |
| Utility | `/{locale}/search/`                              | EN, FA  | shell, H1, GET search form (`name="q"`)         |

**Excluded:** PF-02 creative detail (`/{locale}/creative/{slug}/`) until a published detail route ships in the static build.

---

## Per-route checks

Each crawl asserts:

1. HTTP 200 from the built static preview
2. Exactly one document H1
3. Profile-specific readable content in server-rendered HTML (no client-side rendering required)
4. For locale routes: `lang`/`dir`, header primary nav link, footer, and non-empty `#main-content`

Search with a query string remains a progressive-enhancement surface: the GET form is readable without JS; full-text results require Pagefind (documented honestly in `searchCopy.noscript`).

---

## Deferrals and open items

| Item                         | Notes                                                   |
| ---------------------------- | ------------------------------------------------------- |
| PF-02 detail                 | add when creative detail pages exist in `dist/`         |
| Search results without JS    | honest noscript unavailable state when `?q=` is present |
| PUBLIC-190 visual acceptance | independent QA stays `REVISE`                           |
| PUBLIC-310                   | contract fixture tests follow this packet               |

---

## Blockers and notes

- Playwright uses `browser.newContext({ javaScriptEnabled: false })` per route (same pattern as WP-40 home probe).
- Do not commit `dist/`, `test-results/`, or browser traces.
