# Knowledge Atlas performance budgets (Plan C Task 22)

Measured 2026-09-22. Spec §19.2. Machine: DESKTOP-K05IG1H (Windows, Node
v22.23.2). Suite: `tests/e2e/product-atlas-budgets.e2e.ts` on the
fixture-backed build (`PUBLIC_API_BASE_URL=http://127.0.0.1:4488`,
fixtures `tests/fixtures/atlas/{en,fa}.json`, 4 nodes / 3 relations each).

```bash
npx playwright test tests/e2e/product-atlas-budgets.e2e.ts
```

Expected: 5 passed. Pick p95 comes from the Task 18 benchmark
(`docs/quality/KNOWLEDGE-ATLAS-PICK-BENCHMARK.md`); drag-frame p95 is
reported honestly below.

## Result

| Metric                                                   | Budget   | Measured                                                                                                                                                                               | Verdict            |
| -------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| First interactive Atlas frame after document-interactive | ≤ 900 ms | navigation-to-`data-atlas-state`-set, local Chromium (spec passes; exact ms recorded per run in the Playwright reporter)                                                               | **PASS**           |
| Pick latency p95 at v1 scale (72 nodes / 136 relations)  | ≤ 8 ms   | 0.002–0.003 ms (Task 18, esbuild-bundled real modules, 200 picks)                                                                                                                      | **PASS**           |
| Frame duration during a drag p95                         | ≤ 16 ms  | not instrumented at v1 scale — Scene renders on demand only (no idle loop); drag path is one `rotateBy` + one coalesced frame. Recorded as **not measured**, not as pass-by-assumption | **OPEN**           |
| Runtime payload gzip                                     | ≤ 60 KB  | en fixture 782 B, fa fixture 844 B gzip                                                                                                                                                | **PASS**           |
| Embedded snapshot gzip                                   | ≤ 40 KB  | 778 B gzip (3,042 B raw `#atlas-payload` in `dist/en/atlas/index.html`)                                                                                                                | **PASS**           |
| Label chips in the DOM at once                           | ≤ 40     | 6 filter chips (`all` + 5 type options)                                                                                                                                                | **PASS**           |
| DOM nodes added by the Atlas presentation                | ≤ 2,500  | ~144 tags in `[data-atlas-region]`                                                                                                                                                     | **PASS**           |
| Idle draw calls over 1500 ms                             | 0        | 0 (all four entry points instrumented; −1 honest path when no GL context)                                                                                                              | **PASS**           |
| Layout computation on activation (80/150)                | ≤ 2 s    | backend-owned (Plan A); frontend consumes stored coordinates only                                                                                                                      | **N/A (frontend)** |

## Notes

- The runtime payload is fetched at BUILD time (SSR snapshot): the static
  server serves no `/api/*`, so no payload request fires on browser page
  load. The payload budget is asserted against the embedded snapshot —
  byte-identical to the fixture the build consumed.
- No ceiling was raised (spec §19.6). The single OPEN item (drag-frame p95)
  is a measurement gap at benchmark scale, flagged for Plan D browser work,
  not a budget breach.
