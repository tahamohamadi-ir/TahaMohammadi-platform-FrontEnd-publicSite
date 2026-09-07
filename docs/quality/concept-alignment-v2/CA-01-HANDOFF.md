# CA-01 Handoff — Version the V2 consumer contract

> **R1 revision (appended 2026-09-05, handoff revision R1):** coordinator
> review `Docs/05-delivery/concept-alignment-v2/reviews/CA-01-R1.md`
> (REVISE, uncommitted) applied in the same five allowlisted paths.
> Consumer overlay is now **2.1.0**. The original R0 history below is
> preserved; R1 evidence is appended in §10. Stop marker:
> **`CA-01_R1_HANDOFF_READY`** — central status remains REVISE until
> coordinator review.

Task ID: CA-01
Repository: PUBLIC — `Front-End/public-site`
Branch: `main` (packet suggested `cx/concept-v2-ca-01`; no new branch or
worktree was created in this execution — work was done in the current
checkout while preserving unrelated dirty files listed below)
Base HEAD: `b895b2cb9c6ad9519d55bd2663448461931c0a39`
Resulting state: **uncommitted** — no commit, push, merge, or deploy was
performed. Changes are exactly the allowlisted paths below.
Stop marker: **`CA-01_HANDOFF_READY`** (with one pre-existing, out-of-scope
baseline failure reported separately — see §7)

## 1. Dependencies

`execution-tasks.json` (v2.1.0, 2026-09-05) records CA-01 with
`depends_on: []`, status `NOT_STARTED`, repository `PUBLIC`.
No dependency handoff commits were required. PU-01/PU-02/PU-19 are
`DOC_COMPLETE` at coordination root; none gates CA-01. CA-02 was not
started and no CA-02 files were touched.

## 2. Changed paths (exact allowlist only)

- `contracts/design-authority/v2-overlay.json` (NEW) — versioned public
  consumer overlay (2.0.0) for the merged hero and allowed scene
  dependencies; mirrors the central `design-overlay.json` decisions.
- `scripts/validate-design-authority.mjs` (MODIFIED) — retains all old
  hash/count checks byte-for-byte in behavior; appends V2 overlay
  validation that rejects contradictory ordering and portal placement.
- `src/foundation.contract.test.ts` (MODIFIED) — new `CA-01 versioned V2
consumer overlay` describe block (5 tests); pre-existing tests untouched.
- `src/components/templates/public-160.behavior.test.ts` (MODIFIED) — new
  `CA-01 overlay baseline against templates` test; pre-existing tests
  untouched.
- `docs/quality/concept-alignment-v2/CA-01-HANDOFF.md` (NEW, this file).

No other repository, central queue file, route, component, style, or
dependency file was modified. `execution-tasks.json`, `TASK-LIST.md`, and
central statuses were intentionally left to the coordinator.

## 3. What was implemented

1. `v2-overlay.json` records as an explicit overlay (not a snapshot
   rewrite): `home.hero = identity-and-research-graph`,
   `home.portal = false`, `home.standaloneGraphSection = false`, the
   accepted 7-entry home order starting with `identity-lead-with-graph`,
   `gateway.portal = procedural-threejs` with native HTML locale links,
   `portalDecorationRoutes = ["/"]`, `rendering` (threejs-vanilla-typescript
   / gsap / semantic-html labels / native-html-list no-JS /
   static-pose-instant-selection / semantic-fallback / render-on-change),
   `graph` (endpoint `/api/graph/{locale}`, `GraphPayloadOut`,
   `groupsFieldExists: false`, related records `[family, id]`, no invented
   edges/hrefs, no truncation to three), widths/locales/themes,
   `referencePolicy` (`preserve-pinned-bytes`, adoption `CA-01`),
   `pinnedSnapshot` (24 components / 6 templates), `allowedSceneDependencies`
   (gsap existing `^3.15.0` unchanged; three bounded-allowed from CA-04, not
   installed by CA-01), and `runtimeChange` all false.
2. The validator keeps every old check (snapshot date `2026-08-29`, raw and
   normalized hashes, 24 unique components, 6 unique templates, central
   cross-check when available) and then enforces the overlay contract above,
   including: three must NOT be installed by CA-01 while gsap must exist.
   PASS lines keep their original substrings and append
   `V2 overlay 2.0.0 validated.`
3. Tests prove both directions: the overlay validates, and mutated fixtures
   with contradictory ordering (`relationship-graph` before
   `identity-lead-with-graph`) or portal placement (`home.portal: true`,
   decoration on `/fa/` `/en/`) are rejected with explicit messages.

## 4. Failing-before / passing-after evidence (focused checks)

Baseline before edits (clean allowlist, dirty unrelated files preserved):

- `npm run validate:design` → PASS (24 components, 6 templates).
- `npm test -- src/foundation.contract.test.ts
src/components/templates/public-160.behavior.test.ts` → 13 passed /
  1 failed. The single failure is the pre-existing, out-of-scope
  `freezes only the defined page-family range` assertion (see §7).

Failing-before for the behavior change (after adding CA-01 tests, before
overlay/validator): 13 passed / **7 failed** — all 6 new CA-01 tests failed
with `v2-overlay.json must exist` / ENOENT, plus the same pre-existing
TASK-LIST failure.

Passing-after (final, post-prettier):

- `npm run validate:design` → **PASS**: `snapshot validated locally and
against central authority (24 components, 6 templates). V2 overlay 2.0.0
validated.`
- `npm test -- src/foundation.contract.test.ts
src/components/templates/public-160.behavior.test.ts` → **19 passed /
  1 failed (20 total)**. All 6 CA-01 tests pass (overlay pinned, validator
  positive, ordering rejection, portal rejection, no-dependency-change,
  template baseline). The 1 failure is the unchanged pre-existing TASK-LIST
  assertion from baseline.
- `eslint` on the three modified script/test files → clean.
- `prettier --check` on the four allowlisted source/test files → clean
  (targeted `--write` applied to allowlisted files only; no repo-wide
  format run).

## 5. Source / schema hashes (baseline record)

- Pinned snapshot: `manifest.json` version `1.0.0`,
  `snapshotDate 2026-08-29`, inventories components 24 / templates 6.
- Central V2 overlay
  (`Docs/05-delivery/concept-alignment-v2/design-overlay.json`):
  raw SHA256 `e9803cf157fb6ccac4327d6a6e3bedd1be5bbcc56bb3d1dd6d4a22ba30dcb040`
  (recorded in the consumer overlay as `centralOverlaySha256`).
- Consumer overlay: `contracts/design-authority/v2-overlay.json`,
  version `2.0.0`, packet `CA-01`.
- Dependencies: `gsap ^3.15.0` present and unchanged; `three` absent from
  `dependencies` and `devDependencies` (asserted by validator and test).
- Runtime CSS: unchanged — `git diff` shows no delta in `package.json`,
  `src/styles/`, `HomeTemplate.astro`, or `templates/index.ts`.

## 6. Screenshots / rendered output

None — CA-01 is a contract/baseline packet with explicitly **no runtime UI
change** (`runtimeChange` all false, no CSS/dependency/route/component
delta). Fixture-vs-published labeling: the negative tests use synthetic
mutated overlays in OS temp dirs (`tm-ca01-order-*`, `tm-ca01-portal-*`)
and never write public output; no published record, fixture route, or mock
personal record was introduced. Visual acceptance remains open per ADR-0008
and PUBLIC-190; a passing automated check is not claimed as visual
acceptance.

## 7. Unrelated baseline failure (reported separately, not repaired)

`src/foundation.contract.test.ts > freezes only the defined page-family
range while allowing WP-25 and PUBLIC-260` fails both before and after this
packet because the dirty (pre-existing, out-of-scope) `TASK-LIST.md` V2.1
queue no longer contains the literal strings `` `PUBLIC-200` through
`PUBLIC-240` `` / `` `WP-25` and `PUBLIC-260` remain allowed `` (it now
reads `PUBLIC-201 through PUBLIC-221`, etc.). Fixing it would require
editing `TASK-LIST.md`, which is outside the CA-01 allowlist, so it was
left intact per the packet rule on unrelated baseline failures.

## 8. Dirty status and boundaries kept

Pre-existing dirty/untracked files were preserved untouched:
`AGENTS.md`, `PROJECT-MANIFEST.md`, `README.md`, `ROADMAP.md`,
`TASK-LIST.md`, `docs/architecture/ARCHITECTURE.md`,
`docs/architecture/README.md`,
`docs/architecture/ADR-CONCEPT-ALIGNMENT-V2.md` (untracked),
`docs/architecture/ADR-PRODUCT-V2-EXECUTION.md` (untracked).
No secrets, publication, deploy, force push, legacy code copy (`apps/web`
was never read), invented content/API fields/routes, or `Front-End/Assets`
use. No next packet started; PUBLIC-190/PUBLIC-350 acceptance untouched.
Central queue/TASK-LIST status update is left to the coordinator.

## 9. Done-when verification

- [x] V2 is read as an explicit overlay (`v2-overlay.json` 2.0.0).
- [x] Old snapshots/hashes still validate (`validate:design` PASS, old
      assertions retained).
- [x] 24 primitives and 6 templates remain (validator + tests).
- [x] No runtime CSS or dependency change (diff-clean + asserted).
- [x] Before/after evidence recorded with fixture-vs-published labels.

## 10. R1 revision evidence (appended 2026-09-05)

Branch/HEAD unchanged: `main` at
`b895b2cb9c6ad9519d55bd2663448461931c0a39`, still uncommitted, same
checkout with exclusive ownership of the five allowlisted paths. No next
packet started; no commit, push, or deploy. No visual acceptance claimed.

- **R1.1 — obsolete freeze-text assertion replaced** (same allowlisted
  test file, historical milestone text untouched): the new test `points
active PUBLIC dispatch at the V2 execution queue, not retired CA
packets` asserts `TASK-LIST.md` contains `execution-tasks.json`,
  `EXECUTION.md`, and `retired CA IDs are not assignments`.
- **R1.2 — three rule is now a handoff diff check, not a lifetime
  invariant**: the validator no longer fails when `three` is present (a
  declared version range is accepted; rendering/portal rules are
  unchanged). A `DESIGN_AUTHORITY_PACKAGE_JSON` override enables isolated
  temporary fixtures — no real package installation in CA-01. New tests
  prove the positive case (`V2 overlay 2.1.0 validated` with a synthetic
  `three` fixture) and that contradictory portal placement still fails
  while `three` is present. The current-revision fact (`three` absent,
  `runtimeChange` false) is retained as handoff diff evidence only.
- **R1.3 — central `design-overlay.json` 2.1.0 adopted** (coordinator
  specification correction reconciled with PRODUCT-SPEC F02): consumer
  overlay version `2.1.0`, six-entry home order
  (`identity-lead-with-graph`, `audience-paths`, `selected-work`,
  `research-axes`, `recent-writing`, `collaboration-cv-contact`),
  `centralOverlaySha256`
  `301806119c176110f8f6f43bfadf8778c073d81ccfd1364d94c7a5177da78345`,
  `productAuthority` ADR-0010. Pinned historical snapshots preserved
  (`manifest.json` 1.0.0, `2026-08-29`, 24 components / 6 templates —
  untouched, still hash-validated).
- **R1.4 — actual packet diff evidence**: `git status --short` and
  `git diff --stat` in this checkout show zero changes to `package.json`,
  `package-lock.json`, `src/styles/`, `src/pages/`, `src/layouts/`; every
  changed path under `src/` is one of the two allowlisted test files
  (`src/foundation.contract.test.ts`,
  `src/components/templates/public-160.behavior.test.ts`). The new test
  `leaves CSS, dependency, route and component surfaces untouched`
  enforces exactly this. Recorded status:

  ```text
  M scripts/validate-design-authority.mjs
  M src/components/templates/public-160.behavior.test.ts
  M src/foundation.contract.test.ts
  ?? contracts/design-authority/v2-overlay.json
  ?? docs/quality/concept-alignment-v2/
  ```

  (Remaining `M`/`??` entries outside these five paths are the
  pre-existing unrelated documentation changes noted in the R1 review.)

- **R1 results**:
  - `npm.cmd run validate:design` → PASS: `snapshot validated locally
and against central authority (24 components, 6 templates). V2
overlay 2.1.0 validated.` Old snapshot hash checks preserved.
  - `npm.cmd test -- src/foundation.contract.test.ts
src/components/templates/public-160.behavior.test.ts` → **23 passed
    / 0 failed** (16 foundation + 7 template), including regression
    coverage for contradictory order, contradictory portal (with and
    without `three`), and the future allowed Three.js positive case.
  - Focused `eslint` on the three modified script/test files → clean.
  - `prettier --check` on all five allowlisted paths → clean (targeted
    writes only, no repo-wide format run).

---

## 11. Stop Marker

**CA-01_R1_HANDOFF_READY**
