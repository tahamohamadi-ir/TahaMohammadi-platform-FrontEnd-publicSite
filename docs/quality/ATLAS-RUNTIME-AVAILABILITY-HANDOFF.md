# ATLAS-RUNTIME-AVAILABILITY-HANDOFF

Honest client-side revalidation for the public Knowledge Atlas.

|                   |                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------- |
| **Base commit**   | `bddcebea0a653dfd8b2402f9e2d76d99b0a2de6b` (`main`)                                           |
| **Branch**        | `fix/atlas-runtime-availability`                                                              |
| **Worktree**      | `D:/Project/.atlas-worktrees/public-site-atlas-runtime`                                       |
| **Result commit** | _recorded below after commit_                                                                 |
| **Status**        | Implemented and verified locally. **NOT deployed. NOT owner-accepted. NOT pushed or merged.** |

---

## 1. The defect

`GET https://tahamohamadi.ir/api/atlas/en` returns 200 with a valid payload
(4 nodes / 3 relations), but `/en/atlas/`, `/fa/atlas/` and the About preview
all ship `data-atlas-status="unavailable"`.

Two independent causes, both confirmed by reading the code and then reproduced
locally from the built artifact:

1. **Build time** — `src/lib/atlas/snapshot.ts::fetchAtlasSnapshot()` returns
   `{status:'unavailable'}` when `canFetchPublicApi()` is false.
   `src/lib/api/resolve-url.ts::canFetchPublicApi()` returns false whenever
   `PUBLIC_API_BASE_URL` is empty in a non-DEV build, so no fetch is even
   attempted and the honest-but-wrong state is embedded into the static HTML.

2. **Run time (the fatal one)** — `src/scripts/atlas-runtime.ts` selected only
   `'[data-atlas-region][data-atlas-status="ready"]'`. An `unavailable` region
   was never even examined, so **no recovery path existed at all**.
   `enhanceAtlasRegion()` compounded this by returning
   `{state:'list', reason:'not-eligible'}` for any non-ready status.

Net effect: a healthy API could never rescue the page. The feature shipped dead.

**Local reproduction of the shipped state** (from `dist/` after `npm run build`
on the base commit, empty `PUBLIC_API_BASE_URL`):

```
data-atlas-status=data-atlas-status="unavailable"
unavailable copy present: True
ready payload script present: False
```

---

## 2. What changed

Three paths. No new dependency. No new copy, no invented labels, no second renderer.

### `src/lib/visual/atlas/revalidate.ts` (new)

Owns the recovery decision and the single request.

- `resolveRevalidationTarget(root)` — selects the **bare** `[data-atlas-region]`
  and returns `{region, locale, needsRevalidation}`. This is where the old
  ready-only selector lived; the fix is to match the region and return the
  decision _as data_, so one selection path serves both cases.
- `revalidateAtlasRegion(region, {locale, fetchFn})` — **one** same-origin
  `GET /api/atlas/{locale}` with `credentials: 'omit'` and
  `Accept: application/json`. No `Authorization`, no `If-None-Match` (there is
  no embedded ETag to be conditional against — this is a first fetch, not the
  Task-7 refresh), no token, no reader identifier, nothing in the URL or fragment.
- The body goes through the **existing** `validateAtlasPayload`. On success the
  payload is rendered with the **existing** `buildSharedAtlasBodyHtml`, so
  recovery reuses the one shared presentation path and the one honest copy source.
- Every failure path (`404`, non-OK, network throw, unparseable JSON, invalid
  payload) returns a `kept-*` outcome and **leaves the server-rendered state
  byte-for-byte untouched**. The function never throws.

### `src/scripts/atlas-runtime.ts` (modified)

`enhanceAtlas()` now uses `resolveRevalidationTarget`. A ready region proceeds
straight to the existing `startEnhancement()` (the old body of the function,
renamed). A non-ready region is revalidated once, and only wires the region when
the outcome is `recovered` — otherwise the honest SSR state simply stays.

### `src/lib/visual/atlas/revalidate.test.ts` (new, 14 tests)

---

## 3. RED before GREEN — real output

### RED 1 — the recovery capability did not exist

```
 FAIL  src/lib/visual/atlas/revalidate.test.ts [ src/lib/visual/atlas/revalidate.test.ts ]
Error: Cannot find module './revalidate' imported from
  D:/Project/.atlas-worktrees/public-site-atlas-runtime/src/lib/visual/atlas/revalidate.test.ts
 > src/lib/visual/atlas/revalidate.test.ts:6:1
      6| import { revalidateAtlasRegion } from './revalidate'
       |  ^
 Test Files  1 failed (1)
      Tests  no tests
```

### RED 2 — the runtime still ignored non-ready regions

After the module existed, the wiring defect was still red (7 failed / 6 passed):

```
 x src/lib/visual/atlas/revalidate.test.ts (13 tests | 7 failed) 32ms
 Failed Tests 7
 FAIL  ... > resolveRevalidationTarget - runtime wiring > selects an unavailable region and asks for revalidation
TypeError: resolveRevalidationTarget is not a function
 FAIL  ... > resolveRevalidationTarget - runtime wiring > selects an invalid region and asks for revalidation
TypeError: resolveRevalidationTarget is not a function
 FAIL  ... > resolveRevalidationTarget - runtime wiring > selects a ready region but never revalidates it
TypeError: resolveRevalidationTarget is not a function
 FAIL  ... > resolveRevalidationTarget - runtime wiring > reads the fa locale from the region contract
TypeError: resolveRevalidationTarget is not a function
 FAIL  ... > resolveRevalidationTarget - runtime wiring > returns null when the page has no Atlas region
TypeError: resolveRevalidationTarget is not a function
 FAIL  ... > atlas-runtime entry wiring (regression guard) > no longer selects only ready regions (the production defect)
 FAIL  ... > atlas-runtime entry wiring (regression guard) > does not add a second renderer or new copy
 Test Files  1 failed (1)
      Tests  7 failed | 6 passed (13)
```

The two `atlas-runtime entry wiring` failures are the ones that pin the actual
production defect: they assert the ready-only selector is gone and that the
runtime calls the shared revalidation module. A source-level guard is used
because the entry is a top-level side-effecting module that cannot be imported
into a node-environment test without a DOM.

### GREEN — final focused run

```
 v src/lib/visual/atlas/revalidate.test.ts (14 tests) 12ms

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Duration  352ms
```

## 4. Acceptance commands — real output

All four ran in the worktree on the final state.

**`npm run lint`**

```
> tahamohammadi-public-site@0.0.1 lint
> eslint .
```

Clean — no findings, exit 0.

**`npm test`**

```
 Test Files  121 passed (121)
      Tests  727 passed | 4 skipped (731)
   Start at  04:54:39
   Duration  177.90s (transform 19.16s, setup 0ms, import 108.03s, tests 52.23s, environment 10ms)
```

The 4 skipped are pre-existing skips, not new ones.

**`npm run build`**

```
[pagefind] Pagefind indexed 22 en pages into ...\dist\pagefind\en
[pagefind] Pagefind indexed 22 fa pages into ...\dist\pagefind\fa
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] 46 page(s) built in 5.87s
[build] Complete!
```

**`npm run validate:seo`**

```
PASS: SEO artifacts validated; sitemap covers 16 index routes x 2 locales;
44 locale HTML pages passed canonical/hreflang checks; per-locale Pagefind indexes present.
```

**Focused test** — see GREEN in section 3, 14/14.

**Not run:** the Playwright suites (`test:nojs`, `test:a11y`, `test:visual`,
`test:smoke`). They need browsers and, for `@smoke`, live staging credentials
this environment does not have. Stated here rather than implied as a pass.

---

## 5. Design decision: the About preview

**Decision: `AboutAtlasPreview.astro` needs the same recovery — but I did not
implement it in this slice, deliberately.**

The reasoning, both sides:

_Why it should have it:_

- The About preview carries the **same** production symptom: `data-about-atlas`
  with `data-atlas-status="unavailable"` while the API is healthy. A visitor on
  `/en/about/` sees "Atlas unavailable" next to a perfectly valid knowledge map.
- Fixing only `/atlas/` leaves a visibly inconsistent public site — two pages
  disagreeing about the same published version. The About page already ships a
  CTA into the full Atlas, so the narrative would contradict itself.

_Why it is not in this commit:_

- `AboutAtlasPreview.astro` renders its stage through the Astro component
  `AtlasProjection2d.astro` and **ships no runtime script at all**.
  `atlas-runtime.ts` is referenced only by `src/pages/{en,fa}/atlas/index.astro`

---

## 6. No-JS and accessibility

- **No-JS is unchanged and still truthful.** The static build still embeds the
  honest state; recovery is additive and only runs in a browser. With JS off the
  visitor sees "The Atlas has no published version right now." — which, at build
  time, was true.
- **Every failure keeps the honest state.** No partial model, no fabricated
  nodes, no optimistic swap.
- **A validator validates, never reshapes.** `revalidate.ts` uses
  `validateAtlasPayload` unchanged; on rejection there is no partial render.
- **Accessibility is asserted, not assumed.** A dedicated test asserts the
  recovered markup contains no `tabindex` anywhere, keeps `aria-hidden="true"`
  on the decorative 2D projection, and exposes interactive facts only as native
  `<button>` / `<input>` — never a div with a handler.
- **One renderer.** A runtime test asserts `atlas-runtime.ts` does _not_ import
  `buildSharedAtlasBodyHtml`; recovery markup must come from the shared path in
  `revalidate.ts`.
- **Locale parity.** `resolveRevalidationTarget` reads `data-atlas-locale`, so
  `/fa/atlas/` requests `/api/atlas/fa`. Covered by a test.

---

## 7. Remaining risks

1. **The About preview is still unavailable in production** (section 5). Known,
   accepted for this slice, needs a follow-up with its own entry.
2. **The first fetch is unconditional.** `If-None-Match` is deliberately omitted
   because an `unavailable` region embeds no ETag. Once recovered, the normal
   Task-7 refresh takes over with conditional requests. Cost: one extra request
   per cold visit to a recovering page. Bounded and intentional.
3. **First region only.** `resolveRevalidationTarget` returns the first matching
   region. No current route has two; noted rather than pre-solved.
4. **The build-time cause is untouched.** `fetchAtlasSnapshot` still returns
   `unavailable` when `PUBLIC_API_BASE_URL` is empty, so the _static_ HTML is
   still wrong and the fix is entirely client-side. Setting
   `PUBLIC_API_BASE_URL` at build time would fix first paint properly and is
   arguably the better long-term route — but it needs deployment/owner
   configuration, which is out of scope here. Until then, recovery is the
   only thing standing between a visitor and the Atlas.

---

## 8. What is NOT proven

This is the most important section in the handoff.

- **NOT deployed.** Nothing was pushed, merged, or released. The production URLs
  still serve the defective `unavailable` markup.
- **NOT owner-accepted.** No owner has reviewed this change.
- **NOT verified against the live production API.** All verification used the
  checked-in fixture `tests/fixtures/atlas/en.json` and a local static build.
  That the _real_ `https://tahamohamadi.ir/api/atlas/en` body passes
  `validateAtlasPayload` end-to-end in a browser is **assumed, not measured**.
- **NOT verified in a real browser.** No Playwright run. The runtime entry is
  covered by a source-level guard plus a unit-tested module, not a live DOM.
- **NOT verified visually.** No screenshots, no light/dark parity check, no
  responsive check of the recovered layout, no confirmation that the recovered
  2D projection renders acceptably after a client-side swap.
- **NOT a no-JS crawl proof.** `@nojs` was not executed.
- **No performance evidence.** The recovery path's cost on a cold visit is
  reasoned about, not measured.

An unexecuted command is not a pass. Sections 4 and 8 together are the honest
state of this work.

(plus a comment in `AtlasPageContent.astro`). There is no
`[data-atlas-body]` mount and no bundled entry on that route.

- Fixing it properly therefore means adding a second client entry for the About
  route, or generalising the existing one. That is a larger change with its own
  performance budget and no-JS surface on a page outside this task's scope —
  it deserves its own reviewed slice, not a drive-by inside an availability fix.

**What is therefore still true:** the About preview remains `unavailable` in
production after this change. Both its JS and no-JS states are honest and
correct — it is not lying, it is under-informed. Tracked as risk 1 below.

---
