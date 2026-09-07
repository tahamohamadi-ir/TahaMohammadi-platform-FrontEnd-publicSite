# CA-02 Revision Handoff — CATALOG-GRAPH-REVIEW G1–G3

Task ID: CA-02 (REVISE → ready for re-review)
Repository: PUBLIC — `Front-End/public-site`
Branch: `main` (packet suggested `cx/concept-v2-ca-02`; no new branch/worktree —
work done in current checkout, unrelated dirty files preserved)
Base HEAD: `b895b2cb9c6ad9519d55bd2663448461931c0a39`
Resulting state: **uncommitted** — no commit, push, merge or deploy.
Stop marker: **`CA-02_HANDOFF_READY`**

## 1. Dependencies

`execution-tasks.json` v2.1.0: `depends_on [CA-01, PU-SYNC-graph]`.

- CA-01: present, `validate:design` + foundation/template tests green (unchanged).
- PU-SYNC-graph: accepted-local fixture
  `tests/fixtures/contracts/product-record-resolver.json` unchanged; its
  `sourceOpenApiSha256` pin still matches backend export
  (`47980f8f1992d885398676cf984b80e7068c7aa8e8b8f76a856565ffc9033681`).
  `resolveLessonCurrentlyUnsupported` (lesson 400) is the contract basis for G3.
- No CA-03 files touched. `src/lib/hero-graph-resolve.test.ts`
  (owned by PU-SYNC-public, IMPLEMENTED_UNREVIEWED) was **not** edited; it
  remains green with the relaxed singleton handling below (see §7).

## 2. Changed paths (exact CA-02 allowlist only)

- `src/lib/hero-graph-content.ts` (MODIFIED): G1/G2/G3 corrections.
- `src/lib/hero-graph-content.test.ts` (MODIFIED): updated bounds + 7 new G1–G3 tests.
- `tests/fixtures/contracts/hero-graph.json` (UNCHANGED): synthetic 5-node fixture,
  SHA `4677419b649dddc1613a3ca0b5b7e77487bd158d481c27eef757fc9c59983dc9`.
- `docs/quality/concept-alignment-v2/CA-02-HANDOFF.md` (THIS FILE).

Adapter SHA: `ce5b843d4cae9180ca57d20fa2a94b7f439bfa5d500b6fa9ab0cb31472d994d5`.
Test SHA: `d1d40d39c42711c6b25ac0327920d789cbe364d574828cd902844dae0100b741`.
No other repo, route, component, style or dependency file modified.

## 3. What was corrected (existing implementation, not rebuilt)

- **G1 — safe href mapping (`workRefToHref`)**:
  - One authoritative `CANONICAL_ROUTE_FAMILY` table (§I02 + backend
    `ROUTE_FAMILY_MAP`); generic families verify `routeFamily === expected`,
    never shape-only. Mismatches (`article`+`research`, `../x`) stay non-links.
  - Strict single-segment validation `isSafeSlugSegment()`: Unicode
    letters/numbers + `_-` only (`/^[\p{L}\p{N}_-]+$/u`), length 1–200, no
    surrounding whitespace, rejects `.`/`..`, `/ \ ? # %`, whitespace;
    `decodeURIComponent` mismatch → reject. Catches `..`, `%2e%2e`, `%2F`,
    `a/b`, backslashes, `has space`, empty, non-strings — all return
    `undefined`, never throw (guards `typeof object/null/Array` + field types).
  - Singleton Home/About per route contract: `landing:home → /{locale}/`,
    `profile:about → /{locale}/about/` via fixed paths (incoming routeFamily
    not trusted for singletons to preserve existing synthetic fixtures);
    other landing/profile slugs → non-link. Lesson builds fixed
    `/{locale}/education/{courseSlug}/lessons/{slug}/` from validated+encoded
    segments only.
  - All dynamic segments `encodeURIComponent`-encoded: Persian slug
    `مقاله-تستی` → `/fa/blog/%D9%85.../`; `new URL(href, base).pathname === href`
    asserted (no silent normalization).
- **G2 — signed 64-bit IDs (`isValidRelatedRecordId`)**:
  - `MAX = '9223372036854775807'` (BigAutoField, matches backend
    `record_resolver.MAX_ID`); bounded decimal-string compare
    (length + lexicographic, no lossy `Number()`); signature `(id: unknown)`
    returns false on non-strings. `2147483648` + `99999999999` + max now valid;
    `9223372036854775808`/20-digit/leading-zero/Unicode/zero/negative rejected.
    IDs stay strings on the wire.
- **G3 — no batch poisoning**:
  - New `RESOLVER_SUPPORTED_FAMILIES` (13, backend `RESOLVER_FAMILIES`) vs
    `ELIGIBLE_RELATED_FAMILIES` (15, adapter-visible). `collectRelatedRefs()`
    collects only resolver-supported + valid IDs (lesson/collection excluded
    so they never trigger a backend 400 for the whole batch); unsupported
    remain `unresolved` non-links via `adaptHeroGraph`. `fetchRecordResolutions()`
    defensively filters to supported+valid before batching (≤50). No lesson
    support advertised; future I05 work stays under PU-05/PU-06 + resolver sync
    with parent-course/exact-locale guards.

## 4. Failing-before / passing-after

Failing-before (review repro, pre-fix):

- `workRefToHref({family:article, slug:'..', routeFamily:'blog'}, 'en')`
  → `'/en/blog/../'` (browser `'/en/'`); after fix `undefined`.
- `isValidRelatedRecordId('2147483648')` → false (32-bit cap); after fix true.
- Graph with `article:7 + lesson:9` → single batch `article:7,lesson:9` → backend
  400 → `article:7` suppressed; after fix `collect` → `[{article:7}]`, lesson
  unresolved, article links.

## 5. Checks (each run separately from public-site)

- `npm.cmd test -- src/lib/hero-graph-content.test.ts src/lib/hero-graph-resolve.test.ts src/lib/product-resolver.contract.test.ts`
  → **49 passed / 0 failed** (30 + 10 + 9). Was 42 (23+10+9); +7 new G1–G3 tests
  in the allowlisted test file; `hero-graph-resolve` (10) + contract (9) unchanged
  and green — no shared-test edit required.
- `npm.cmd run lint` → clean (ESLint, no new warnings).
- New tests in `src/lib/hero-graph-content.test.ts`:
  `distinguishes adapter-visible vs resolver-supported`, `G1 safe href`
  (traversal/encoded/mapping/singleton/normalized+Persian), `G2 boundary/max/
overflow/canonical`, `G3 mixed batch (article kept, lesson/collection excluded)`;
  updated `accepts canonical IDs` to 64-bit bounds + non-string safety.
- Published staging graph: **not observed** (no `PUBLIC_API_BASE_URL`);
  fixture PASS is separate from published-data readiness. No fixture or
  production output published; Vite SSR probes from review were not rerun —
  equivalent browser-normalization asserted via `new URL().pathname`.

## 6. Source / schema hashes

- Consumer input `src/generated/public-api.ts` untouched; openapi pin
  `src/generated/openapi-hash.json` still equals fixture
  `sourceOpenApiSha256` (`47980f...`).
- No public route/component/style changed; FA/EN + Light/Dark parity untouched
  (adapter-only packet, no UI).

## 7. Dirty status, boundaries, risks

- Only the 4 CA-02 allowlisted paths (plus this handoff) changed; all other
  `M`/`??` entries pre-existed and were preserved. No secrets, deploy, legacy
  copy, invented content/routes, or `Front-End/Assets` use.
- Shared-file impact: `hero-graph-content.ts` is CA-02-owned (REVISE); its
  consumers (`hero-graph-resolve.test.ts` owned by PU-SYNC-public) remain green
  without edits due to relaxed singleton handling (fixed paths, routeFamily
  ignored for landing/lesson). Strict route validation applies to generic
  families where the review found the flaw. No accepted-file (`CA-01`,
  `PU-03-*`, `PU-SYNC-graph`) hash was refreshed.
- Remaining: real resolver mixed-batch round-trip against staging (lesson 400 +
  article 200 in one request) still to be observed when backend staging is
  available; visual acceptance and rollout remain OPEN per review.

---

**CA-02_HANDOFF_READY**
