# Task 16 — Desktop Atlas 3D scene

Status: Complete

Implemented:

- Added the render-on-demand Atlas scene with one shared scene core/renderer, bounded orbit and zoom, focus/reset motion, theme/visibility/resize controls, and deterministic disposal.
- Consumed payload coordinates through `resolveLayout`; no layout simulation was introduced.
- Reused Research Universe scene core, materials, profiles, nodes, edges, core object, hit testing, theme, and disposal patterns.
- Added process-wide 32×20 and 16×12 sphere tiers. Atlas batches nodes per `(tier, profile)` and keeps emphasis to colour/material state without removing nodes.
- Wired the enhancement default to `import('./scene')` while preserving injectable loaders and Task 15 behavior.

Verification:

- TDD RED: focused test failed because `./scene` did not exist.
- Focused Atlas/shared tests: 29/29 passed.
- Full Vitest suite: 700 passed, 4 skipped across 114 files.
- Changed-file ESLint and IDE diagnostics: passed.
- Production Astro build: passed, 46 pages.
- Browser smoke skipped: `tests/e2e/product-atlas.e2e.ts` does not exist yet (Task 23).

Concerns:

- Task 17/18 control and picking modules are still absent, so the orchestrator retains its documented 2D fallback until those lazy modules land.
- Repository-wide `tsc --noEmit` has pre-existing errors outside Task 16; no production Task 16 file appeared in the filtered diagnostics.
