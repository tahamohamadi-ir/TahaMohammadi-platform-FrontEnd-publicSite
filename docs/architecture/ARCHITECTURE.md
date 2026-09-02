# Public Site Architecture

The public site is an independently deployable consumer of the backend's published API. The accepted architecture uses Astro for routes, document structure, metadata, and static-first rendering; TypeScript for adapters and validation; Tailwind CSS over semantic tokens; and React only for bounded stateful islands.

Platform decision ADR-0002 lives in coordination `Docs/09-decisions/`. Repository-local implementation ADRs are in [docs/architecture/](README.md).

## Required layers

1. Environment validation and deployment configuration.
2. Locale-aware routing and metadata.
3. Typed API transport with timeouts and normalized errors.
4. Domain adapters that isolate backend payloads from components.
5. Accessible design-system primitives.
6. Page-family compositions.
7. Analytics and observability with privacy controls.

Page components must not call raw endpoints directly. Domain adapters own response normalization. The UI owns display states, never publication truth.

## Shared shell and page-family primitives

Repeated chrome is owned by a single component each — change once, apply everywhere:

| Primitive | Location | Consumed via |
| --- | --- | --- |
| Site footer | `src/components/Footer.astro` | `SiteLayout.astro` only (all locale routes) |
| Primary/outline buttons | `src/components/ui/Button.astro` | Hero, collaborate bands, contact forms, page-family shells |
| Collaborate band | `src/components/page-family/PageFamilyCollaborateBandShell.astro` | About, CV, Teaching, Publications empty states |
| Sub-navigation tabs | `src/components/page-family/PageFamilySubNavShell.astro` | Page-family index shells (no inline tab markup in pages) |

Footer styles live in `src/styles/shell.css`. Page-family band styles live in `src/styles/page-families.css`. Do not duplicate footer HTML or button markup in page-family files.

## Recorded implementation decisions (PUBLIC-013)

| Topic                              | ADR                                           |
| ---------------------------------- | --------------------------------------------- |
| Package manager                    | [ADR-PACKAGE-MANAGER](ADR-PACKAGE-MANAGER.md) |
| Routing (`fa`/`en`, static)        | [ADR-ROUTING](ADR-ROUTING.md)                 |
| Deployment (static `dist/`)        | [ADR-DEPLOYMENT](ADR-DEPLOYMENT.md)           |
| Testing (Vitest + Playwright tags) | [ADR-TESTING](ADR-TESTING.md)                 |
| Browser support                    | [ADR-BROWSER-SUPPORT](ADR-BROWSER-SUPPORT.md) |

Open items (preview behavior, production cache invalidation, cross-browser CI matrix) require separate tasks — not undocumented assumptions.
