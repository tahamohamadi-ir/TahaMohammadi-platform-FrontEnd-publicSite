# Public Site Agent Contract

## Read order

1. `README.md`
2. `PROJECT-MANIFEST.md`
3. `../../Docs/00-governance/AUTHORITY-ORDER.md`
4. `../../Docs/03-contracts/`
5. `../../Docs/04-design/`
6. `../../Docs/references/frontend-design-authority/README.md`
7. `TASK-LIST.md`
8. `../../Docs/05-delivery/MULTI-AGENT-TASK-BOARD.md` (pick one `PUBLIC-*` task)

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
