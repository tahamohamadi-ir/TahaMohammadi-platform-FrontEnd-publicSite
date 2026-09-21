# Knowledge Atlas — v1 performance budgets (Task 22)

**Spec:** §19.2 · **Ceiling rule:** §19.6 (never raise a ceiling to pass)  
**Date:** 2026-09-21  
**Machine:** DESKTOP-K05IG1H · win32 x64 · 13th Gen Intel(R) Core(TM) i7-13620H · 39.6 GiB RAM  
**Branch tip (at write):** `feat/knowledge-atlas-public`

## Commands

```bash
npm test -- src/lib/atlas/performance-budget.test.ts
node scripts/atlas-pick-benchmark.mjs --fixture tests/fixtures/atlas/benchmark.json --iterations 200
npm test -- src/lib/visual/atlas/scene.test.ts
```

Browser idle/drag/first-frame probes live in `tests/knowledge-atlas/ka-performance.e2e.ts` and
`tests/e2e/product-atlas.e2e.ts` (Task 23). Where a live WebGL probe is not yet runnable in CI,
the row below is marked **DEFERRED** with the unit-layer evidence that already exists.

## §19.2 ledger

| Budget                        | Ceiling  | Measured                                              | Verdict          | Evidence                                                                   |
| ----------------------------- | -------- | ----------------------------------------------------- | ---------------- | -------------------------------------------------------------------------- |
| First interactive Atlas frame | ≤ 900 ms | —                                                     | **DEFERRED**     | Browser timing in Task 23 `product-atlas.e2e.ts` / `ka-performance.e2e.ts` |
| Pick latency p95 (72/136)     | ≤ 8 ms   | **0.257 ms** (re-check ≈ 0.36 ms)                     | **PASS**         | `docs/quality/KNOWLEDGE-ATLAS-PICK-BENCHMARK.md` (Task 18)                 |
| Drag frame p95                | ≤ 16 ms  | —                                                     | **DEFERRED**     | Requires instrumented live canvas; Task 23                                 |
| Runtime payload gzip          | ≤ 60 KiB | en **784 B**, fa **849 B**, benchmark **3463 B**      | **PASS**         | `performance-budget.test.ts`                                               |
| Embedded snapshot gzip        | ≤ 40 KiB | en/fa/benchmark all ≪ 40 KiB (benchmark ≈ **3463 B**) | **PASS**         | `serializeAtlasPayload` + gzip in unit test                                |
| Label chips in DOM            | ≤ 40     | always-tier keys ≤ **10** (`ALWAYS_LABEL_KEYS_CAP`)   | **PASS**         | `alwaysLabelKeys` + unit test                                              |
| Presentation DOM nodes        | ≤ 2500   | **5309** opening tags on benchmark SSR region         | **FAIL**         | Full SSR inspector+index registry; ceiling **unchanged** (§19.6)           |
| Idle draw calls               | **0**    | no idle `requestAnimationFrame` after scene settle    | **PASS** (unit)  | `scene.test.ts` “does not leave an animation frame running while idle”     |
| Layout computation (backend)  | ≤ 2 s    | —                                                     | **N/A (Plan A)** | Recorded in Plan A evidence; not owned by Plan C                           |

## Idle-draw instrumentation note

Unit coverage stubs the renderer and asserts the Atlas scene does not schedule a permanent
rAF while idle. Full four-entry-point instrumentation (`drawArrays`, `drawElements`,
`drawArraysInstanced`, `drawElementsInstanced`) over 1500 ms of no interaction is asserted
in the browser suite (Task 23).

## DOM budget honesty

The presentation DOM exceedance is caused by server-rendering **every** node/relation
inspector block (Task 14) plus the semantic index and 2D projection for the 72/136 fixture.
Remediation is virtualization / deferred inspector hydration — **not** raising 2500.

## Broad-phase

Task 18 recorded `broad-phase: not required` (Task 19 skipped).
