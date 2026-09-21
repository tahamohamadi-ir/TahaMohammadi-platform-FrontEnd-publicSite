# Knowledge Atlas — screen-space picking benchmark (Task 18)

**Spec:** §19.2 pick latency budget **8 ms** (p95) at v1 scale (72 nodes / 136 relations).

## What was measured

Node-only timing of the production pick path used by `AtlasScene.pickAt`:

1. `projectNodes` + `projectEdges` (view-projection of all nodes and sampled edge polylines)
2. `pickAt` (O(n) screen-space node radius tests + edge polyline distance tests)

Modules are bundled from `src/lib/visual/atlas/picking.ts` and related layout/hit-testing code via esbuild (`scripts/atlas-pick-benchmark.mjs`). No DOM or WebGL is involved; the view matrix matches Atlas **home orbit** (FOV 42°, yaw 0.22, pitch 0.24) on a **1440×900** viewport.

**Not measured here:** GPU draw calls or triangle counts (require a live WebGL scene).

## Run

```bash
node scripts/atlas-pick-benchmark.mjs --fixture tests/fixtures/atlas/benchmark.json --iterations 200
```

Fixed PRNG seed `0x41544c18` → **10** screen probe points; **200** timed picks (20 rounds × 10 points), plus 20 warmup picks.

## Recorded run

| Field            | Value                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| **Date**         | 2026-09-21                                                                                             |
| **Machine**      | DESKTOP-K05IG1H · win32 x64 · 13th Gen Intel(R) Core(TM) i7-13620H · 39.6 GiB RAM                      |
| **Command**      | `node scripts/atlas-pick-benchmark.mjs --fixture tests/fixtures/atlas/benchmark.json --iterations 200` |
| **Fixture**      | `tests/fixtures/atlas/benchmark.json` (72 nodes, 136 relations)                                        |
| **Viewport**     | 1440 × 900                                                                                             |
| **p50**          | **0.069 ms**                                                                                           |
| **p95**          | **0.257 ms**                                                                                           |
| **Budget (p95)** | 8 ms                                                                                                   |
| **Result**       | **PASS** (p95 ≤ 8 ms)                                                                                  |

## Broad-phase decision

**broad-phase: not required**

At v1 scale, O(n) screen-space picking stays far below the §19.2 budget on this machine. **Task 19 (broad-phase implementation) should be SKIPPED** unless scale or measured client hardware later exceeds the budget.
