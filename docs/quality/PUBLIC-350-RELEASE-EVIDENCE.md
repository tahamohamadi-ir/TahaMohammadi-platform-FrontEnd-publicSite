# PUBLIC-350 Public Release Evidence

**Packet:** PUBLIC-350  
**Authority:** `Docs/05-delivery/RELEASE-GATES.md` (R4 product delivery, R8 quality closure), `Docs/templates/RELEASE-REPORT-TEMPLATE.md`  
**Repository:** `Front-End/public-site`  
**Status:** scaffold shipped; **R4 + R8 public slice not complete** â€” owner acceptance, staging smoke, and frozen page-family routes remain open.

This checklist does **not** close `PUBLIC-190`, mark `R4` complete on the coordination board, or claim production readiness.

---

## Gate slice summary

| Gate | Complete | Scaffold | Blocked | Open | Total |
| ---- | -------: | -------: | ------: | ---: | ----: |
| R4   |        4 |        1 |       0 |    6 |    11 |
| R8   |        2 |        5 |       2 |    0 |     9 |

**Release ready:** no â€” `summarizeReleaseEvidence()` returns `ready: false` until every slice is `complete` and staging/owner blockers clear.

**Harness:** `src/test-harness/release-evidence.ts`, `src/public-350.release-evidence.test.ts`

---

## R4 â€” Public page families (repository slice)

| Task       | Route family            | Status   | Evidence / blocker                  |
| ---------- | ----------------------- | -------- | ----------------------------------- |
| PUBLIC-040 | Language gateway        | complete | `npm run build` â€” `/`             |
| PUBLIC-190 | Home EN/FA              | scaffold | structure built; visual QA `REVISE` |
| PUBLIC-200 | About                   | complete | profile fetch + unavailable honesty |
| PUBLIC-201 | Research + publications | open     | frozen until PUBLIC-190 PASS        |
| PUBLIC-210 | Projects                | open     | frozen until PUBLIC-190 PASS        |
| PUBLIC-211 | Writing                 | open     | frozen until PUBLIC-190 PASS        |
| PUBLIC-212 | Books, talks, downloads | open     | frozen until PUBLIC-190 PASS        |
| PUBLIC-220 | Teaching + creative     | open     | frozen until PUBLIC-190 PASS        |
| PUBLIC-221 | CV/resume               | open     | frozen until PUBLIC-190 PASS        |
| PUBLIC-230 | Contact                 | complete | form + 422 HTML matrix              |
| PUBLIC-240 | Search                  | complete | per-locale Pagefind                 |

---

## R8 â€” Quality closure (repository slice)

| Task       | Check                             | Status   | Command / evidence                                    |
| ---------- | --------------------------------- | -------- | ----------------------------------------------------- |
| PUBLIC-060 | Locale font computed styles       | scaffold | `npm run test:foundation`                             |
| PUBLIC-270 | Page-family visual captures       | scaffold | `npm run test:visual -- --grep PUBLIC-270`            |
| PUBLIC-280 | Responsive matrix (216 captures)  | scaffold | `npm run test:visual -- --grep PUBLIC-280`            |
| PUBLIC-290 | Performance budget probes         | scaffold | `npm run test:performance`                            |
| PUBLIC-300 | No-JS crawl (23 routes)           | complete | `npm run test:nojs`                                   |
| PUBLIC-310 | Contract fixtures                 | complete | `npm test` (includes `public-310`)                    |
| PUBLIC-320 | Integrated staging smoke          | blocked  | `npm run test:smoke` â€” staging URL unset            |
| PUBLIC-080 | Automated a11y probes             | scaffold | `npm run test:a11y` â€” 29 passed; manual matrix open |
| PUBLIC-190 | Owner visual + content acceptance | blocked  | `Docs/10-tracking/PUBLIC-190-VISUAL-QA.md`            |

Detailed evidence per task: `docs/quality/PUBLIC-060-FONT-COMPUTED-EVIDENCE.md` through `PUBLIC-320-STAGING-SMOKE.md`, `PUBLIC-080-A11Y-AUDIT.md`.

---

## Automated gate (scaffold)

**Gate-sweep SHA:** `572d6de` (2026-09-02). Playwright suites run with `--workers=1` on Windows after clean `dist/` rebuild. `summarizeReleaseEvidence().ready` remains **false**.

| Gate              | Command                                    | Result  | Notes                                                                                           |
| ----------------- | ------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------- |
| Lint              | `npm run lint`                             | PASS    | ESLint flat config                                                                              |
| Format            | `npm run format:check`                     | PASS    | Prettier + `prettier-plugin-astro`                                                              |
| Build             | `npm run build`                            | PASS    | 23 static pages                                                                                 |
| Vitest            | `npm test`                                 | PASS    | **232 passed**; includes `public-080.a11y-audit.test.ts`, `public-350.release-evidence.test.ts` |
| Design authority  | `npm run validate:design`                  | PASS    | 24 components, 6 templates                                                                      |
| SEO               | `npm run validate:seo`                     | PASS    | sitemap/hreflang/canonical + Pagefind                                                           |
| Foundation        | `npm run test:foundation`                  | PASS    | 6 passed                                                                                        |
| Performance       | `npm run test:performance`                 | PASS    | 6 passed                                                                                        |
| PUBLIC-270 visual | `npm run test:visual -- --grep PUBLIC-270` | PASS    | 36 passed, 1 skipped (PF-02 detail open)                                                        |
| PUBLIC-280 visual | `npm run test:visual -- --grep PUBLIC-280` | PASS    | 216 passed                                                                                      |
| No-JS             | `npm run test:nojs`                        | PASS    | 23 passed                                                                                       |
| A11y crawl        | `npm run test:a11y`                        | PASS    | **29 passed** â€” 23 route WCAG 2.2 AA scans + 6 foundation probes (`PUBLIC-080`)               |
| Visual compare    | `npm run report:visual-compare`            | PASS    | **39 / 48** honest pairs (viewport-aware home @ `cc4b851`)                                      |
| Staging smoke     | `npm run test:smoke`                       | skip    | `PUBLIC_STAGING_SITE_URL` unset                                                                 |
| Owner acceptance  | manual                                     | blocked | PUBLIC-190 visual QA `REVISE`                                                                   |

---

## Release report fields (template)

Fill `Docs/templates/RELEASE-REPORT-TEMPLATE.md` only after R7 staging and owner acceptance close. Until then:

| Field                | Value (current)                                   |
| -------------------- | ------------------------------------------------- |
| Release identifier   | _not tagged â€” scaffold only_                    |
| Repository commits   | public-site `main` @ `572d6de`                    |
| Artifact hashes      | _pending immutable staging build_                 |
| Automated checks     | Vitest 232; Playwright tags per table above       |
| Manual checks        | PUBLIC-190 owner visual compare â€” **open**      |
| Deferred validations | staging smoke, production telemetry, PF-02 detail |
| Gate result          | **R4/R8 public slice incomplete**                 |

---

## Blockers

| Blocker                   | Owner      | Notes                                              |
| ------------------------- | ---------- | -------------------------------------------------- |
| PUBLIC-190 visual QA      | Owner      | Independent PASS required; current result `REVISE` |
| PUBLIC-200+ page families | Public     | Frozen until PUBLIC-190 PASS                       |
| `BACKEND-180` + R7        | Backend    | Staging deployment before live smoke               |
| `PUBLIC_STAGING_SITE_URL` | Operations | No staging URL checked into this repository        |
| Production telemetry      | Platform   | PUBLIC-290 75th-percentile field data open         |

---

## After PUBLIC-190 PASS (owner evidence only)

When `Docs/10-tracking/PUBLIC-190-VISUAL-QA.md` records owner sign-off and verdict `PASS`:

| Unlocks                                       | Notes                                                                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC-201`â€“`PUBLIC-221` visual acceptance | Routes and behavior tests already shipped; freeze lifts for owner compare on research, projects, writing, teaching, creative, CV families |
| `PUBLIC-350` owner-acceptance slice           | `summarizeReleaseEvidence()` may mark owner blocker cleared; `ready` still false until staging smoke + remaining R8 slices                |
| Coordination R4 adoption                      | MASTER-TASK-LIST PF adoption and frozen route checklist may advance per release gates                                                     |
| PF-02 creative detail                         | **Still open** until a published API slug exists in static build or an honest preview shell ships                                         |
| `PUBLIC-320` staging smoke                    | Still blocked on `BACKEND-180` + `PUBLIC_STAGING_SITE_URL`                                                                                |
| `PUBLIC-290` production telemetry             | Still open â€” local probes do not close budget                                                                                           |

Owner one-command review assist: `npm run review:visual` (build â†’ captures â†’ compare report â†’ prints `file://` path).

---

## Follow-on

| Task       | Notes                                                         |
| ---------- | ------------------------------------------------------------- |
| PUBLIC-190 | Owner visual acceptance â€” do not mark PASS without evidence |
| PUBLIC-320 | Live staging smoke after R7                                   |
| COORD-080  | Cross-repo R8 sign-off package                                |
| R9         | Production tag + rollback after R7â€“R8 closure               |
