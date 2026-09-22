# Plan C — Knowledge Atlas public frontend: complete delivery report

**Date:** 2026-09-21  
**Branch:** `feat/knowledge-atlas-public`  
**Worktree:** `D:/Project/.atlas-worktrees/public-site-plan-c`  
**Progress:** **24 / 24** (Task 19 evidence-based skip accepted)  
**Status:** **OFFICIALLY CLOSED**  
**Official close tip:** `f007296`

This report, together with `docs/quality/EVIDENCE-C-TASKS.md`, is an **official Plan D parent reference**. It closes Plan C for the public Atlas frontend (Task 9 URL/selection freeze through Task 24 acceptance gates). Plan D must consume this closed evidence as baseline and must **not** re-validate or redesign Plan C unless a real regression is found.

---

## 1. Executive verdict

Plan C is **accepted on the fixture-backed surface** with Hero/Home frozen and no new runtime dependency.

| Surface                      | Result                                               |
| ---------------------------- | ---------------------------------------------------- |
| Unit suite                   | 119 files · 717 passed · 4 skipped                   |
| Production build             | 46 pages                                             |
| Hermetic Atlas Playwright    | **16 / 16 passed**                                   |
| Live published Atlas API     | Honest skip when inactive (Plan D activation)        |
| Hero / Home vs `origin/main` | **empty diff**                                       |
| Pick p95 @ 72/136            | **PASS** (≪ 8 ms) → Task 19 skipped                  |
| Presentation DOM @ 72/136    | **FAIL vs 2500** (5309) — ceiling not raised (§19.6) |

---

## 2. Architecture delivered

Pure logic lives under `src/lib/atlas/*` (model → validate → snapshot → refresh → selection → url-state → search → filters → neighborhood → inspector → layout → projection-2d → performance budgets). Graphics orchestration lives under `src/lib/visual/atlas/*` (enhancement, scene, controls, picking, motion-preference), reusing Research Universe primitives without copying them.

Presentation: Astro routes `/en/atlas/` + `/fa/atlas/` (+ draft preview shells), shared body presentation, inspector/controls, deterministic SVG projection, lazy 3D enhancement gated by WebGL + `min-width: 1024px`.

### Frozen contracts held through Tasks 10–24

- Task 9 focus grammar / `selection.ts` remain source of truth — no parallel selection store.
- Preview credential stays fragment → Bearer only; never public fallback; never in `?focus`.
- Refresh uses Task 7 semantics only.
- Hero v2 / Home / backend untouched.
- No new npm dependency.

---

## 3. Task-by-task outcomes (9–24)

| #   | Deliverable                      | Commit       | Notes                                                    |
| --- | -------------------------------- | ------------ | -------------------------------------------------------- |
| 9   | Selection + URL codec            | `db1de76`    | Total `parseFocus`, canonical `%7E`, kind-aware identity |
| 10  | Search / filters / neighbourhood | `93f70a3`    | Pure; no URL/selection coupling                          |
| 11  | Inspector projection             | `8738d5b`    | §17.3 / §17.4 sections omit empty                        |
| 12  | Layout consumption               | `5f872e1`    | Stored coords only; always-label cap helper              |
| 13  | 2D SVG engine                    | `de70cba`    | Deterministic overview / about-preview caps              |
| 14  | Inspector + controls UI          | `2dbb8cc`    | SSR registry; 44px contract                              |
| 15  | Enhancement orchestrator         | `17c30dc`    | Capability gates; refresh before scene; Task 9 wiring    |
| 16  | Desktop 3D scene                 | `1a6dc97`    | Render-on-demand; dual sphere tiers; idle no rAF         |
| 17  | Interaction / framing / tiers    | `4886032`    | Click-vs-drag; Escape restore; inspector-aware frame     |
| 18  | Pick benchmark                   | `80ba2cf`    | p95 ≈ 0.26 ms → **Task 19 SKIP**                         |
| 19  | Broad-phase                      | —            | Not executed (evidence-backed)                           |
| 20  | Mobile 2D + neighbourhood view   | `82b18e1`    | Same selection/URL path; topology untouched              |
| 21  | Parity / RTL / a11y              | `89628e2`    | EN=FA geometry; logical CSS; live reduced-motion         |
| 22  | Perf budget verification         | `63453c3`    | Ledger in `KNOWLEDGE-ATLAS-PERFORMANCE.md`               |
| 23  | Hermetic + live browser suites   | `4c90683`    | `product-atlas.e2e.ts`, `ka-live.e2e.ts`, configs        |
| 24  | Acceptance evidence              | (this close) | `docs/quality/EVIDENCE-C-TASKS.md`                       |

---

## 4. Product behaviour proven in browser (hermetic)

`npx playwright test tests/e2e/product-atlas.e2e.ts --workers=1` → **16 passed**:

1. Desktop region publishes revision + presentation
2. Compact (<1024) is non-3d with SVG projection  
   3–6. EN/FA node + relation deep links update `data-atlas-state` + inspector
3. Back/Forward restores selection
4. Search + filters present; identity never a chip
5. Reduced motion keeps ready status
6. WebGL unavailable → non-3d
7. No-JS semantic index (4 nodes)  
   12–15. axe WCAG on en/fa × light/dark
8. Idle|budget settle probe

---

## 5. Performance ledger (honest)

Full table: `docs/quality/KNOWLEDGE-ATLAS-PERFORMANCE.md`.

**Pass:** pick p95, payload/snapshot gzip, label-chip headroom, unit idle-rAF.  
**Fail (documented, not waived):**

```text
DOM presentation on fixture 72/136 = 5309
Target ceiling = 2500
Status = DEBT / NOT WAIVED
Remediation = virtualize or defer inspector SSR
```

**Deferred / N/A:** interactive first-frame & drag p95 full instrumentation; backend layout timing (Plan A).

---

## 6. Acceptance commands (reproduce)

```bash
npm run lint
npm run format:check
npm test
npm run validate:design
npm run build
npm run validate:seo
npx playwright test tests/e2e/product-atlas.e2e.ts --workers=1
npx playwright test --config playwright.knowledge-atlas.config.ts
git diff --stat origin/main...HEAD -- src/components/home src/components/hero src/styles/hero-sequence.css src/styles/hero-graph.css
```

---

## 7. Handoff to Plan D

### Official parent references

1. `docs/quality/EVIDENCE-C-TASKS.md`
2. `docs/quality/PLAN-C-COMPLETE-DELIVERY-REPORT.md` (this file)

### Entry baseline (do not re-prove Plan C)

| Gate | Value |
| ---- | ----- |
| Lint / format | green |
| Unit | 717 pass / 4 skip |
| Design / SEO | PASS |
| Build | 46 pages |
| Atlas e2e | 16 / 16 |
| Live API | honest skip (unpublished active version) |
| Hero / Home vs `origin/main` | empty diff |
| Close tip | `f007296` |

### §19.6 carry-forward (explicit; not waived)

```text
DOM presentation on fixture 72/136 = 5309
Target ceiling = 2500
Status = DEBT / NOT WAIVED
Remediation = virtualize or defer inspector SSR
```

### Plan D rule

Plan D may switch About to the Atlas about-preview mode and retire the About Research Universe scene **after** citing the two parent references above. It must schedule the §19.6 inspector DOM remediation deliberately (virtualize or defer inspector SSR). Optional later: live-API green once an active Atlas version is published; expanded first-frame/drag telemetry. **Do not** reopen Plan C for redesign or full re-validation absent a real regression against this baseline.

---

## 8. File map (high signal)

- Logic: `src/lib/atlas/*`
- Visual: `src/lib/visual/atlas/*`
- UI: `src/components/atlas/*`
- Routes: `src/pages/{en,fa}/atlas/**`
- Evidence: `docs/quality/EVIDENCE-C-TASKS.md`, `KNOWLEDGE-ATLAS-PERFORMANCE.md`, `KNOWLEDGE-ATLAS-PICK-BENCHMARK.md`
- Browser: `tests/e2e/product-atlas.e2e.ts`, `tests/knowledge-atlas/*`, `playwright.knowledge-atlas*.ts`
