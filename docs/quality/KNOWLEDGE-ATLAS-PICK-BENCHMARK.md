# Knowledge Atlas pick benchmark (Plan C Task 18)

Measurement, no implementation. Recorded 2026-09-21.

## Command

```bash
node scripts/atlas-pick-benchmark.mjs --fixture tests/fixtures/atlas/benchmark.json --iterations 200
```

## Machine

- Host: DESKTOP-K05IG1H (Windows, Node v22.23.2, esbuild 0.28.2)
- Date (UTC): 2026-09-21T21:59:46Z

## Method

- Loads `tests/fixtures/atlas/benchmark.json` (72 nodes / 136 relations).
- Bundles the real modules (`src/lib/visual/atlas/picking.ts` + its
  `atlas/layout` and RU `layout`/`hit-testing` lineage) through `esbuild`,
  exactly as existing one-off probes do — what runs here is what ships.
- 200 picks round-robin over 10 pseudo-random-but-fixed screen points
  (mulberry32, seed pinned), identity view matrix, 800×520 stage.
- Triangle figure read from the shared-sphere buffer actually uploaded
  (`sharedSphereTriangles()` = 1216 for the 32×20 tier).

## Result

| Metric                             | Value                                                                             | Budget         | Verdict  |
| ---------------------------------- | --------------------------------------------------------------------------------- | -------------- | -------- |
| p50 pick latency                   | 0.001–0.002 ms                                                                    | —              | —        |
| p95 pick latency                   | 0.002–0.003 ms                                                                    | 8 ms           | **PASS** |
| Shared-sphere triangles            | 1216                                                                              | —              | —        |
| Approx scene triangles (1216 × 72) | 87552                                                                             | —              | —        |
| Draw calls (estimate)              | nodes: one InstancedMesh per (tier, profile) batch + 1 rim; edges: 1 LineSegments | small constant | —        |

Two consecutive runs agreed (p95 0.003 ms then 0.002 ms) — three orders of
magnitude inside the budget, not a borderline pass.

## Decision

**`broad-phase: not required`** — Task 19 is skipped (not executed, with this
evidence). The O(n) screen-space picker at v1 scale (72 nodes / 136
relations) holds p95 ≈ 0.003 ms against the spec's 8 ms budget. `picking.ts`
remains the only place a broad phase may be added if a future scale
benchmark demands it.
