# Public Site Agent Contract

<!-- PRODUCT-V2.1 -->

Current product work: read `../../Docs/09-decisions/ADR-0010-UNIFIED-EXECUTION-CONTRACTS.md`, `../../Docs/05-delivery/concept-alignment-v2/EXECUTION.md`, and the assigned **PUBLIC** leaf packet. New target interfaces live in `../../Docs/03-contracts/PRODUCT-INTERFACES-V2.md`; generated OpenAPI remains current implementation evidence. Old prefix-only task selection and family freezes are superseded for this queue. CA-09–16 must not be dispatched separately.
<!-- /PRODUCT-V2.1 -->

## Current visual-recovery entry point

Read `../../Docs/09-decisions/ADR-0008-HOME-GRAPH-HERO-AND-PROCEDURAL-MOTION.md` and `../../Docs/05-delivery/concept-alignment-v2/README.md` before visual recovery. CA-* packets are the active bounded subqueue. Home combines identity and graph in one hero; only the language gateway has portal decoration. The new ADR supersedes conflicting historical no-GSAP/no-Three.js and separate-graph rules for assigned packets. Old pinned references remain evidence; runtime adoption is CA-01 onward and acceptance remains open.

## Read order

1. `README.md`
2. `PROJECT-MANIFEST.md`
3. `../../Docs/00-governance/AUTHORITY-ORDER.md`
4. `../../Docs/03-contracts/`
5. `../../Docs/04-design/`
6. `../../Docs/references/frontend-design-authority/README.md`
7. `TASK-LIST.md`
8. `../../Docs/05-delivery/MULTI-AGENT-TASK-BOARD.md` (select one active PUBLIC packet from execution-tasks.json)

## Scope

This repository owns the public browsing experience only. It may consume published public API resources. It does not own backend schemas, admin workflows, publishing permissions, or source profile facts.

## Rules

- Treat the new frontend as greenfield. Do not copy code or CSS from `D:\Project\Taha-personal-platform\apps\web`.
- Reference assets are evidence, not permission to invent copy or change their meaning.
- Use `../../Docs/references/frontend-design-authority/` only; never treat the ignored `../Assets` local input as routine implementation authority.
- Treat `concepts/` as UI/UX authority and `concepts/page-families/` as required visual detail. Do not reproduce text embedded in concepts as public content.
- Do not adopt a runtime image until its central Asset Promotion Ledger row is approved.
- Never invent API fields, endpoints, profile data, links, publication records, or translation status.
- Keep locale in the URL and set `lang`, `dir`, canonical, and alternate links from one route contract.
- **Theme and locale parity:** ship Light and Dark together for every visual surface; ship `fa` and `en` together for every user-facing string, route, and layout change. Do not merge a feature that only works in one theme or one locale.
- Build every data surface with loading, empty, error, unavailable, and ready states.
- Use semantic HTML before components; preserve keyboard order and visible focus.
- Add tests with each behavior change and update the task list and handoff evidence.
- Do not commit secrets, generated output, browser traces, or dependency directories.

## Required completion evidence

Report changed files, commands run, results, screenshots for visual work, unresolved risks, and contract changes. A passing build alone is not visual or accessibility acceptance.

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
