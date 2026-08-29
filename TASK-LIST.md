# Public Site Task List

## Repository baseline

- [x] Connect the independent Git repository.
- [x] Define scope, ownership, agent rules, roadmap, and quality contracts.
- [x] Record the legacy frontend rejection policy.
- [x] Publish the greenfield documentation baseline to `origin/main`.
- [x] Accept the static-first Astro and bounded React-island architecture.
- [ ] Accept package-manager, detailed routing, deployment, testing, and browser-support ADRs.
- [ ] Scaffold the runtime with locked dependencies and CI.
- [x] Read the tracked frontend design authority and PF-01 through PF-08 contract.

## Foundation

- [ ] Add validated public environment schema.
- [ ] Confirm PS-01 through PS-04, PS-06, and PS-07 are still passing before any runtime scaffold.
- [ ] Implement typed API client from the accepted OpenAPI snapshot (`Docs/03-contracts/OPENAPI-ACCEPTANCE.md`).
- [x] PS-05 accepted public OpenAPI artifact exists; client generation is unblocked for scaffold foundation work.
- [ ] Implement locale-aware route helpers and alternate links.
- [ ] Implement only route families accepted by the central Route Registry.
- [ ] Implement design tokens, fonts, themes, focus, and reduced motion.
- [ ] Block runtime font activation until PS-10 completes.
- [ ] Implement shared loading, empty, unavailable, error, and ready states.
- [ ] Add test fixtures for both locales and all content states.

## Experiences

- [ ] Language gateway.
- [ ] Responsive global shell and navigation.
- [ ] Home composition using Light/Dark and RTL visual references.
- [ ] PF-07 About/profile/CV using owner-approved content only.
- [ ] PF-05 Research/publications and PF-04 projects using accepted public DTOs only.
- [ ] PF-03 Writing and PF-01/PF-02 Creative using accepted public DTOs only.
- [ ] PF-06 Teaching using accepted public DTOs only.
- [ ] CV/resume downloads with truthful availability.
- [ ] Contact flow with privacy and abuse controls.
- [ ] Search with usable unavailable and zero-result states.

## Release evidence

- [ ] Keyboard, screen-reader, zoom, contrast, and RTL review.
- [ ] Mobile, tablet, desktop, and wide-layout visual review.
- [ ] Light, dark, and system-theme review.
- [ ] Performance-budget report.
- [ ] Metadata, sitemap, robots, canonical, and hreflang validation.
- [ ] Backend failure and recovery tests.
- [ ] Content and asset reconciliation against canonical registers.
- [ ] Verify each promoted asset against central SHA-256, promotion ledger, crop, alt/caption, and derivative decision.
- [ ] Preview release, rollback drill, and owner acceptance.
