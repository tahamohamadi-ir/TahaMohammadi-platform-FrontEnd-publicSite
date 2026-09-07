# Taha Mohammadi Platform — Public Site

<!-- PRODUCT-V2.1 -->

Current execution target: research-first bilingual portfolio, independently publishable detail pages and broad CMS editing under ADR-0010. Dispatch only this repository's packets from `../../Docs/05-delivery/concept-alignment-v2/EXECUTION.md` (paths here are repository-relative). Older scaffold/phase status below is a dated baseline, not current feature acceptance. Preserve current endpoints until the additive target contract is implemented and exported.
<!-- /PRODUCT-V2.1 -->

Greenfield public frontend for the bilingual personal platform. This repository intentionally contains no copied legacy frontend source. The previous implementation and the verified visual reference pack are evidence for requirements and QA, not a code base to extend.

## Current state

- Repository and governance baseline: ready.
- Runtime scaffold: Wave 0 complete (Astro 7, Tailwind 4, i18n gateway); `npm run build` green.
- Canonical cross-repository contracts: `../../Docs/` in the local platform workspace.
- Public-site execution plan: [ROADMAP.md](ROADMAP.md) and [TASK-LIST.md](TASK-LIST.md).

## Non-negotiable product properties

- Persian and English are first-class locales.
- Persian pages use correct RTL behavior; English pages use LTR.
- Content comes from the backend API and exposes honest loading, empty, error, unavailable, and ready states.
- All layouts are responsive, keyboard accessible, and validated against the reference asset register.
- No CMS/admin concerns or secrets enter the public bundle.

## Start here

Read [AGENTS.md](AGENTS.md), [PROJECT-MANIFEST.md](PROJECT-MANIFEST.md), [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md), and the [architecture ADR index](docs/architecture/README.md).
