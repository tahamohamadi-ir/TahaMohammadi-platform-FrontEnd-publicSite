# Plan D — About Atlas switch + §19.6 DOM remediation

**Date:** 2026-09-21  
**Branch:** `feat/knowledge-atlas-public`  
**Parent baseline:** Plan C closed at tip `f007296`  
**Parent refs:** `docs/quality/EVIDENCE-C-TASKS.md`, `docs/quality/PLAN-C-COMPLETE-DELIVERY-REPORT.md`

## Goal

Replace the About Research Universe scene with a thin Atlas `about-preview` surface, then clear the carried §19.6 presentation-DOM debt on `/atlas/` without raising the 2500 ceiling.

## Non-goals

- Re-validate or redesign Plan C absent a real regression.
- Touch Hero / Home / HeroGraph.
- Change Task 9 selection / URL focus grammar.
- Raise any §19.2 ceiling (§19.6).

## Phasing (owner lock: option 3)

| Phase | Scope                                           |
| ----- | ----------------------------------------------- |
| **1** | About switch + RU About retirement              |
| **2** | §19.6: defer inspector SSR on full Atlas routes |

## Phase 1 design

### Approach

**Thin `AboutAtlasPreview` shell** (not full `AtlasPageContent`).

- New Astro component embeds Atlas snapshot + `AtlasProjection2d` with `mode="about-preview"` (cap 10).
- Copy + CTA to `/en/atlas/` or `/fa/atlas/`.
- No search/filters, no full inspector SSR on About.
- Honest `unavailable` / `invalid` / `ready` from `fetchAtlasSnapshot`.
- `AboutPageContent` swaps `ResearchUniverse` → `AboutAtlasPreview`.
- Drop About’s `loadHeroGraph` dependency used only for RU.
- Delete `ResearchUniverse.astro` once unwired.
- Leave Home RU (`mode: 'home'`) and `about-scene.ts` module intact for now; About no longer calls `enhanceUniverseRegion(..., { mode: 'about' })`.

### Contracts

- Snapshot: same Plan C `fetchAtlasSnapshot` path (E2E fixture API already serves `/api/atlas/{en,fa}`).
- Projection: existing `selectOverviewNodes` / `project2d` `about-preview` mode.
- Frozen: Hero/Home empty vs `origin/main` for listed paths.

### Evidence

- Unit: About ready HTML contains `data-atlas-projection="about-preview"` and CTA; no `data-universe-mode="about"`.
- Browser: replace `ru-about.e2e.ts` with hermetic About Atlas checks (region, projection, CTA); update comments in CA specs that pointed at `ru-about`.

## Phase 2 design

### Approach

**Defer inspector SSR** (not virtualize scroll):

- `AtlasInspector` SSRs shell only: heading, prompt, live announcement, single `data-atlas-inspector-mount` host.
- On selection, client builds one active panel from pure `nodeInspectorModel` / `relationInspectorModel` using the already-embedded Atlas payload.
- Enhancement toggles prompt / replaces mount contents instead of un-hiding N×M pre-rendered panels.
- Semantic index (`AtlasIndex` / body HTML) stays SSR for a11y and no-JS; budget target is clearing presentation DOM ≤ 2500 on fixture 72/136.

### Carry-forward register (until Phase 2 green)

```text
DOM presentation on fixture 72/136 = 5309
Target ceiling = 2500
Status = DEBT / NOT WAIVED
Remediation = virtualize or defer inspector SSR
```

After Phase 2: update `KNOWLEDGE-ATLAS-PERFORMANCE.md` with measured ≤ 2500 and close the debt.

## Success criteria

1. About ready pages show Atlas about-preview; no About RU region.
2. Hero/Home still empty-diff vs `origin/main` for frozen paths.
3. Plan C hermetic Atlas e2e still 16/16 (or honest regression fix only).
4. Phase 2: presentation DOM on benchmark fixture ≤ 2500; ceiling unchanged.
5. Evidence docs cite Plan C parent baseline; no Plan C redesign.
