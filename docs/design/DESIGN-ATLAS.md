# Visual Atlas

The Visual Atlas is a local-only design inventory served at `/_design/` when `DESIGN_ATLAS=1`.

## Build

```bash
npm run build:atlas
```

Production builds must omit `dist/_design/`. The default `npm run build` path keeps Atlas output excluded.

## Scope

- Foundations and token specimens
- All 24 pinned inventory components and representative states
- Six slot-based templates
- Home and Gateway structural specimens
- English and Persian locale panels
- Light/Dark/system theme parity via existing bootstrap
- Reduced-motion-safe surfaces

## Route injection

Atlas registration lives in `src/integrations/design-atlas.mjs` and is wired through `astro.config.mjs` only when `DESIGN_ATLAS=1`.
