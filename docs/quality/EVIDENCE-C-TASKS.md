# Plan C acceptance evidence (Task 24)

Recorded 2026-09-21 on `feat/knowledge-atlas-public` in worktree
`D:/Project/.atlas-worktrees/public-site-plan-c`.

Machine: DESKTOP-K05IG1H · win32 x64 · 13th Gen Intel(R) Core(TM) i7-13620H · 39.6 GiB RAM.

**Plan C status: OFFICIALLY CLOSED.** Progress **24 / 24** (Task 19 evidence-based skip accepted).

Official close tip: `f007296` (`docs(atlas): pin Plan C evidence tip SHA`).

This file and `docs/quality/PLAN-C-COMPLETE-DELIVERY-REPORT.md` are the **sole official parent references** for Plan D. Plan D must treat this closed evidence as its parent baseline and must **not** re-validate or redesign Plan C unless a real regression is found.

DOM debt lock amendment after close tip: `0c70b58` (`docs(atlas): lock DOM presentation debt as not waived`) — ceiling and status only; does not reopen Plan C.

## Gate outputs

| Gate               | Command                                                                                                                                | Output                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Lint               | `npm run lint`                                                                                                                         | exit 0 (clean)                                                    |
| Format             | `npm run format:check`                                                                                                                 | All matched files use Prettier code style                         |
| Unit               | `npm test`                                                                                                                             | **119 passed** files; **717 passed**, 4 skipped                   |
| Design authority   | `npm run validate:design`                                                                                                              | PASS (24 components, 6 templates; V2 overlay 2.1.0)               |
| Build              | `npm run build`                                                                                                                        | **46 page(s)** built                                              |
| SEO                | `npm run validate:seo`                                                                                                                 | PASS; sitemap 16 index routes × 2 locales; Pagefind en/fa present |
| Hermetic Atlas e2e | `npx playwright test tests/e2e/product-atlas.e2e.ts --workers=1`                                                                       | **16 passed** (23.3s)                                             |
| Live Atlas API     | `npx playwright test --config playwright.knowledge-atlas.config.ts`                                                                    | see live row below                                                |
| Frozen Hero/Home   | `git diff --stat origin/main...HEAD -- src/components/home src/components/hero src/styles/hero-sequence.css src/styles/hero-graph.css` | **empty**                                                         |

## Live API

Run against `TM_E2E_API_BASE_URL` (default `https://tahamohamadi.ir`). When the published Atlas has no active version, the suite **skips honestly** and the fixture-backed hermetic suite remains the acceptance surface until Plan D activation.

## Performance budgets (§19.2)

Source of truth: `docs/quality/KNOWLEDGE-ATLAS-PERFORMANCE.md` and
`docs/quality/KNOWLEDGE-ATLAS-PICK-BENCHMARK.md`.

| Budget                                   | Verdict                                                             |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Pick p95 ≤ 8 ms                          | **PASS** (≈ 0.26–0.36 ms) · Task 19 **SKIP**                        |
| Runtime / embedded gzip                  | **PASS**                                                            |
| Always-label cap ≤ 10 / chip budget ≤ 40 | **PASS**                                                            |
| Idle rAF (unit)                          | **PASS**                                                            |
| Presentation DOM ≤ 2500                  | **FAIL** (measured **5309** on 72/136 SSR; ceiling unchanged §19.6) |
| First-frame / drag p95 (browser)         | Covered by e2e idle                                                 | budget probes; full timing DEFERRED to expanded instrumentation |

## Task ledger (Plan C public frontend)

| Task | Status           | Commit (subject)                           |
| ---- | ---------------- | ------------------------------------------ |
| 1–8  | COMPLETE (prior) | contract → preview shell lineage           |
| 9    | COMPLETE         | `db1de76` selection + URL codec            |
| 10   | COMPLETE         | `93f70a3` search / filters / neighbourhood |
| 11   | COMPLETE         | `8738d5b` inspector projection             |
| 12   | COMPLETE         | `5f872e1` layout consumption               |
| 13   | COMPLETE         | `de70cba` 2D SVG projection                |
| 14   | COMPLETE         | `2dbb8cc` inspector + controls UI          |
| 15   | COMPLETE         | `17c30dc` enhancement orchestrator         |
| 16   | COMPLETE         | `1a6dc97` desktop 3D scene                 |
| 17   | COMPLETE         | `4886032` interaction / framing / tiers    |
| 18   | COMPLETE         | `80ba2cf` pick benchmark                   |
| 19   | **SKIPPED**      | broad-phase not required                   |
| 20   | COMPLETE         | `82b18e1` mobile 2D neighbourhood          |
| 21   | COMPLETE         | `89628e2` parity / RTL / a11y              |
| 22   | COMPLETE         | `63453c3` performance budgets              |
| 23   | COMPLETE         | `4c90683` hermetic + live browser suites   |
| 24   | COMPLETE         | this evidence commit                       |

## Frozen surfaces

Hero v2 and Home paths listed above are byte-identical to `origin/main` for this branch range (empty `git diff --stat`).

## Plan D parent baseline (entry lock)

Plan D starts from this closed Plan C surface. Do **not** re-run Plan C acceptance as a redesign gate; cite this evidence and the delivery report, then proceed. Re-open Plan C only on proven regression against this baseline.

| Gate | Baseline at Plan C close |
| ---- | ------------------------ |
| Lint / format | green |
| Unit | **717** passed / **4** skipped |
| Design / SEO | PASS |
| Build | **46** pages |
| Atlas e2e (hermetic) | **16 / 16** |
| Live Atlas API | honest skip (no published active version) |
| Hero / Home vs `origin/main` | empty diff |
| Close tip | `f007296` |

### §19.6 carry-forward (required; not waived)

```text
DOM presentation on fixture 72/136 = 5309
Target ceiling = 2500
Status = DEBT / NOT WAIVED
Remediation = virtualize or defer inspector SSR
```

### Plan D scope note

- Public Atlas routes `/en/atlas/` and `/fa/atlas/` ship with hybrid freshness, URL focus, search/filters, inspector, 2D+3D presentations, preview shell (`noindex`), and measured pick budget under 8 ms.
- About extraction and RU retirement remain Plan D work, using this parent baseline.
