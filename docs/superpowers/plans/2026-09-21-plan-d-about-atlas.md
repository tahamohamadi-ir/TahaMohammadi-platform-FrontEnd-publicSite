# Plan D About Atlas + DOM Debt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch About to a thin Atlas `about-preview` surface and defer Atlas inspector SSR until presentation DOM ≤ 2500.

**Architecture:** Phase 1 adds `AboutAtlasPreview` (snapshot + capped SVG + CTA) and removes About RU wiring. Phase 2 changes `AtlasInspector` to a deferred mount filled from pure inspector models on selection.

**Tech Stack:** Astro, Vitest, Playwright, existing `src/lib/atlas/*` + `AtlasProjection2d`.

## Global Constraints

- Parent baseline: Plan C tip `f007296`; cite `EVIDENCE-C-TASKS.md` / `PLAN-C-COMPLETE-DELIVERY-REPORT.md`.
- Do not re-validate/redesign Plan C unless real regression.
- Hero/Home frozen vs `origin/main`.
- Task 9 selection/URL frozen.
- §19.6: never raise presentation DOM ceiling above 2500.
- No new npm dependencies.

---

### Task 1: AboutAtlasPreview component (TDD)

**Files:**

- Create: `src/components/about/AboutAtlasPreview.astro`
- Create: `src/components/about/AboutAtlasPreview.test.ts`
- Modify: `src/components/about/AboutPageContent.astro`
- Delete: `src/components/about/ResearchUniverse.astro` (after unwired)

**Interfaces:**

- Consumes: `fetchAtlasSnapshot`, `AtlasProjection2d`, `AtlasSnapshot`
- Produces: region `[data-about-atlas]` with `data-atlas-status`, ready → `data-atlas-projection="about-preview"`, CTA `a[href$="/atlas/"]`

- [ ] **Step 1:** Write failing unit tests (ready fixture → about-preview + CTA; unavailable honest; no `data-universe-mode="about"`).
- [ ] **Step 2:** Implement `AboutAtlasPreview` (optional `snapshot` prop; else `fetchAtlasSnapshot`).
- [ ] **Step 3:** Wire into `AboutPageContent`; remove graph/`ResearchUniverse`.
- [ ] **Step 4:** Delete `ResearchUniverse.astro`.
- [ ] **Step 5:** Run targeted unit tests; commit.

### Task 2: About browser coverage

**Files:**

- Create: `tests/e2e/about-atlas.e2e.ts`
- Delete or retire: `tests/e2e/ru-about.e2e.ts`
- Modify: comments in `tests/e2e/ca05-graph-interaction.e2e.ts`, `tests/e2e/ca03-hero-semantic.e2e.ts`

- [ ] **Step 1:** Hermetic checks: About region ready (when fixture API up), projection about-preview, CTA to atlas, no universe-mode=about.
- [ ] **Step 2:** Remove/retire `ru-about.e2e.ts`.
- [ ] **Step 3:** Run about-atlas + product-atlas e2e; commit.

### Task 3: Phase 1 evidence

**Files:**

- Create: `docs/quality/EVIDENCE-D-PHASE1.md`
- Modify: `docs/quality/PLAN-C-COMPLETE-DELIVERY-REPORT.md` handoff note (Phase 1 done pointer only)

- [ ] **Step 1:** Record gates relevant to About switch + Hero empty-diff.
- [ ] **Step 2:** Commit.

### Task 4: Defer inspector SSR (Phase 2)

**Files:**

- Modify: `src/components/atlas/AtlasInspector.astro`
- Modify: `src/lib/visual/atlas/enhancement.ts` (syncInspector / panel apply)
- Modify: `src/components/atlas/AtlasInspector.test.ts`
- Modify: `src/lib/atlas/performance-budget.test.ts` (assert ≤ 2500)
- Modify: `docs/quality/KNOWLEDGE-ATLAS-PERFORMANCE.md`

**Interfaces:**

- Consumes: `nodeInspectorModel`, `relationInspectorModel`, embedded payload
- Produces: SSR shell + client single active panel under `[data-atlas-inspector-mount]`

- [ ] **Step 1:** Failing tests: no per-node SSR panels; DOM ≤ 2500 on benchmark.
- [ ] **Step 2:** Implement deferred mount + enhancement render.
- [ ] **Step 3:** Keep selection/a11y announcement behaviour.
- [ ] **Step 4:** Re-measure; close debt register; commit.

### Task 5: Phase 2 / Plan D close evidence

**Files:**

- Create: `docs/quality/EVIDENCE-D-PHASE2.md` (or combined `EVIDENCE-D-TASKS.md`)

- [ ] **Step 1:** Record DOM ≤ 2500 + Atlas e2e still green.
- [ ] **Step 2:** Commit.
