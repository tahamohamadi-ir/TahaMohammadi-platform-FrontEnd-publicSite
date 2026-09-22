# Plan D evidence — Phase 1 + Phase 2

Recorded 2026-09-21 on `feat/knowledge-atlas-public` in worktree
`D:/Project/.atlas-worktrees/public-site-plan-c`.

**Parent baseline:** Plan C closed tip `f007296`  
**Parent refs:** `docs/quality/EVIDENCE-C-TASKS.md`, `docs/quality/PLAN-C-COMPLETE-DELIVERY-REPORT.md`  
**Design / plan:** `docs/superpowers/specs/2026-09-21-plan-d-about-atlas-design.md`, `docs/superpowers/plans/2026-09-21-plan-d-about-atlas.md`

Plan C was **not** re-validated or redesigned; only About switch + §19.6 remediation.

## Phase 1 — About Atlas preview

- Replaced About `ResearchUniverse` with thin `AboutAtlasPreview` (`mode="about-preview"`, CTA to `/atlas/`).
- Deleted `src/components/about/ResearchUniverse.astro`.
- Retiring browser suite: `tests/e2e/ru-about.e2e.ts` → `tests/e2e/about-atlas.e2e.ts`.
- Home / Hero RU path unchanged.

## Phase 2 — §19.6 deferred inspector SSR

```text
DOM presentation on fixture 72/136 = 862
Target ceiling = 2500
Status = CLEARED (was DEBT / NOT WAIVED at 5309)
Remediation applied = defer inspector SSR (single client mount)
```

Ceiling remains **2500** (§19.6 never raise).

## Unit gates exercised in Plan D

| Gate                             | Result       |
| -------------------------------- | ------------ |
| AboutAtlasPreview + About wiring | pass         |
| AtlasInspector deferred SSR      | pass         |
| presentation DOM ≤ 2500          | **862** pass |
| inspector-dom mount/clear        | pass         |
| enhancement suite                | pass         |

## Frozen surfaces

Hero / Home paths remain subject to empty-diff vs `origin/main` (same Plan C lock).
