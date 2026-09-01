# PUBLIC-060 Font Computed-Style Evidence

**Packet:** PUBLIC-060  
**Authority:** `Docs/04-design/FONT-ACQUISITION-PLAN.md`, `src/styles/tokens.css`, `src/styles/fonts.css` (PUBLIC-050)  
**Environment:** local static preview — Playwright builds `dist/` and serves via `scripts/serve-dist.mjs`.  
**Status:** automated computed-style probes on home EN/FA for `--font-display` / `--font-body` locale wiring; subset/coverage fixtures remain open per FONT-ACQUISITION-PLAN PS-10.

This checklist does **not** close `PUBLIC-190`. Passing computed-style probes does not claim visual acceptance.

---

## Locale font contract

| Locale | `--font-display`    | `--font-body`      | Preload (PUBLIC-050)                                                                 |
| ------ | ------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| `en`   | Newsreader Variable | Inter Variable     | `/fonts/inter/InterVariable.woff2`, `/fonts/newsreader/Newsreader-Variable.woff2`    |
| `fa`   | Estedad Variable    | Vazirmatn Variable | `/fonts/vazirmatn/Vazirmatn-Variable.woff2`, `/fonts/estedad/Estedad-Variable.woff2` |

Runtime rules:

1. Components consume `--font-display` and `--font-body` only (no hard-coded family names).
2. `html[lang='en']` and `html[lang='fa']` swap the active token pair before paint.
3. `font-display: swap` on all self-hosted `@font-face` rules.

---

## Automated gate

| Gate                | Command                                                | Result       | Notes                                                 |
| ------------------- | ------------------------------------------------------ | ------------ | ----------------------------------------------------- |
| Build               | `npm run build`                                        | PASS         | 23 static pages                                       |
| Vitest scaffold     | `npm test` (includes `public-060.font-tokens.test.ts`) | PASS         | 187 tests; token wiring + harness guard               |
| Font computed probe | `npm run test:foundation -- --grep PUBLIC-060`         | **4 passed** | body + h1 computed `font-family`, CSS vars, 200% zoom |
| Design authority    | `npm run validate:design`                              | PASS         | 24 components, 6 templates                            |
| SEO                 | `npm run validate:seo`                                 | PASS         | sitemap/hreflang/canonical                            |

**Runner:** `npm run test:foundation -- --grep PUBLIC-060`

**Measurement date:** 2026-09-01 (local Windows host, loopback static preview)

---

## Probe routes

| Route  | Locale | Checks                                                                   |
| ------ | ------ | ------------------------------------------------------------------------ |
| `/en/` | `en`   | body → Inter Variable; h1 → Newsreader Variable                          |
| `/fa/` | `fa`   | body → Vazirmatn Variable; h1 → Estedad Variable (or Vazirmatn fallback) |

Additional probes:

- `--font-display` / `--font-body` custom properties resolve to locale-specific primary families on `html` (browser returns expanded stacks, not `var()` references).
- 200% root `font-size` does not change resolved body/display families on FA home.

---

## Remaining (not in this packet)

| Item                                     | Owner / gate                |
| ---------------------------------------- | --------------------------- |
| Persian + Latin subset coverage fixtures | FONT-ACQUISITION-PLAN PS-10 |
| Mixed-direction string fixture           | deferred                    |
| CLS budget under preload                 | PUBLIC-290                  |
| Manual owner visual compare              | PUBLIC-190                  |
