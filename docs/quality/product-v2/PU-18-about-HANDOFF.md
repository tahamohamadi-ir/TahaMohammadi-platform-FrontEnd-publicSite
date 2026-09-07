# PU-18-about Handoff

Status: **PU-18-about_HANDOFF_READY**
Owner: PUBLIC (`Front-End/public-site`)

## Summary of Changes

- Implemented canonical about page family (F13) presentation and alignment:
  - Extended `src/styles/pf07-alignment.css` with responsive layout definitions for profile hero, split timeline, skills grid, and print avoidance rules.
  - Linked `src/components/about/AboutPageContent.astro` to real published profile projections via `src/lib/about-profile.ts` with truthful unavailable fallback states when profile records are absent.
  - Provided comprehensive testing in `src/components/about/product-about.test.ts` verifying complete biographical narratives, engineering focus, structured timeline items (education and experience), empty states, and both EN/FA locale rendering.

## Verification Evidence

- Unit test suite:
  - `npm test -- src/components/about/product-about.test.ts` -> 3/3 passed.
  - `npm test -- src/components/about/public-200.behavior.test.ts` -> 2/2 passed.
- Linting:
  - `npm run lint` -> Clean 0 errors.

## 2026-09-07 — Profile hero identity fallback removal (CM-02)

- `PageFamilyProfileHeroShell` fell back to `shellCopy.brandName` and the
  hardcoded `getGatewayRoleLine` when no CMS title existed, resurrecting
  owner identity on every empty profile hero (about/cv/research).
- Now: title falls back to the `getCmsPlaceholderCopy` line (same honest
  pattern as `displaySummary`); role renders only from the new optional
  `roleLine` prop (no caller passes it yet — hidden until a CMS source
  is wired, follow-up). `shellCopy`/`getGatewayRoleLine` imports removed.
- Regression: `product-about.test.ts` asserts unavailable renders in
  en+fa contain no hardcoded name/role. `public-200` + `product-about`
  6/6, lint/format clean, build 42 pages.

## Exact Paths Modified

- `src/styles/pf07-alignment.css`
- `src/components/about/product-about.test.ts`
- `docs/quality/product-v2/PU-18-about-HANDOFF.md`
