# ADR: Routing — Astro static, `fa`/`en` locales

## Status

Accepted (PUBLIC-013)

## Context

The public site must serve Persian (`fa`, RTL) and English (`en`, LTR) with locale in the URL, a language gateway at `/`, and honest untranslated states. Coordination `ROUTE-REGISTRY.md` defines canonical path families. ADR-0002 accepts a static-first Astro shell.

## Decision

Use **Astro file-based routes with `astro:i18n`** for bilingual static routing:

- Default locale: `fa`
- Supported locales: `fa`, `en`
- `prefixDefaultLocale: true` — every public page is under `/{locale}/…`
- Root `/` is the language gateway (not a locale home)
- Locale helpers (`localePath`, `buildCanonicalUrl`, hreflang/alternates) live in `src/lib/`
- Sitemap integration emits per-locale entries via `@astrojs/sitemap` `i18n` config

## Rationale

- Static HTML per route preserves no-JS readability (ADR-0002, PUBLIC-300).
- Prefixing both locales keeps URLs explicit and matches `ROUTE-REGISTRY.md`.
- `astro:i18n` is the framework-native source of locale metadata; route helpers stay thin wrappers over the registry contract.

## Consequences

- New page families add files under `src/pages/fa/` and `src/pages/en/` (or shared dynamic segments) — never a locale-free public route except `/`.
- Alternate links render only when the equivalent record is published in the other locale; missing translations surface as content states, not silent fallback.
- Design atlas routes (`/_design/`) and Pagefind assets are excluded from the production sitemap filter.

## Verification

- `astro.config.mjs` — `i18n.defaultLocale`, `locales`, `routing.prefixDefaultLocale`, sitemap `i18n`
- `src/lib/navigation.ts`, `src/lib/routes.ts` — locale path and canonical helpers
- `npm run build` — static pages under `dist/fa/`, `dist/en/`, gateway `dist/index.html`
- `npm run validate:seo` — canonical and hreflang on sample routes
- Vitest route and SEO tests (`routes.test.ts`, `public-250.seo.test.ts`)

## References

- Coordination `Docs/02-architecture/ROUTE-REGISTRY.md`
- Coordination `Docs/09-decisions/ADR-0002-STATIC-FIRST-ASTRO-PUBLIC-SITE.md`
- `TASK-LIST.md` — PUBLIC-030, PUBLIC-040, PUBLIC-110, PUBLIC-013
