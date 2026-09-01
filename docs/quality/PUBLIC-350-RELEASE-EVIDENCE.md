# PUBLIC-350 Public Release Evidence

**Packet:** PUBLIC-350  
**Authority:** `Docs/05-delivery/RELEASE-GATES.md` (R4 product delivery, R8 quality closure), `Docs/templates/RELEASE-REPORT-TEMPLATE.md`  
**Repository:** `Front-End/public-site`  
**Status:** scaffold shipped; **R4 + R8 public slice not complete** — owner acceptance, staging smoke, and frozen page-family routes remain open.

This checklist does **not** close `PUBLIC-190`, mark `R4` complete on the coordination board, or claim production readiness.

---

## Gate slice summary

| Gate | Complete | Scaffold | Blocked | Open | Total |
| ---- | -------: | -------: | ------: | ---: | ----: |
| R4   |        4 |        1 |       0 |    6 |    11 |
| R8   |        2 |        5 |       2 |    0 |     9 |

**Release ready:** no — `summarizeReleaseEvidence()` returns `ready: false` until every slice is `complete` and staging/owner blockers clear.

**Harness:** `src/test-harness/release-evidence.ts`, `src/public-350.release-evidence.test.ts`

---

## R4 — Public page families (repository slice)

| Task        | Route family              | Status   | Evidence / blocker                          |
| ----------- | ------------------------- | -------- | ------------------------------------------- |
| PUBLIC-040  | Language gateway          | complete | `npm run build` — `/`                       |
| PUBLIC-190  | Home EN/FA                | scaffold | structure built; visual QA `REVISE`         |
| PUBLIC-200  | About                     | complete | profile fetch + unavailable honesty         |
| PUBLIC-201  | Research + publications   | open     | frozen until PUBLIC-190 PASS                |
| PUBLIC-210  | Projects                  | open     | frozen until PUBLIC-190 PASS                |
| PUBLIC-211  | Writing                   | open     | frozen until PUBLIC-190 PASS                |
| PUBLIC-212  | Books, talks, downloads   | open     | frozen until PUBLIC-190 PASS                |
| PUBLIC-220  | Teaching + creative       | open     | frozen until PUBLIC-190 PASS                |
| PUBLIC-221  | CV/resume                 | open     | frozen until PUBLIC-190 PASS                |
| PUBLIC-230  | Contact                   | complete | form + 422 HTML matrix                      |
| PUBLIC-240  | Search                    | complete | per-locale Pagefind                         |

---

## R8 — Quality closure (repository slice)

| Task        | Check                              | Status   | Command / evidence                          |
| ----------- | ---------------------------------- | -------- | ------------------------------------------- |
| PUBLIC-060  | Locale font computed styles        | scaffold | `npm run test:foundation`                   |
| PUBLIC-270  | Page-family visual captures        | scaffold | `npm run test:visual -- --grep PUBLIC-270`  |
| PUBLIC-280  | Responsive matrix (216 captures)   | scaffold | `npm run test:visual -- --grep PUBLIC-280`  |
| PUBLIC-290  | Performance budget probes          | scaffold | `npm run test:performance`                  |
| PUBLIC-300  | No-JS crawl (23 routes)            | complete | `npm run test:nojs`                         |
| PUBLIC-310  | Contract fixtures                  | complete | `npm test` (includes `public-310`)          |
| PUBLIC-320  | Integrated staging smoke           | blocked  | `npm run test:smoke` — staging URL unset    |
| PUBLIC-080  | Automated a11y probes              | scaffold | `npm run test:a11y`                         |
| PUBLIC-190  | Owner visual + content acceptance  | blocked  | `Docs/10-tracking/PUBLIC-190-VISUAL-QA.md`  |

Detailed evidence per task: `docs/quality/PUBLIC-060-FONT-COMPUTED-EVIDENCE.md` through `PUBLIC-320-STAGING-SMOKE.md`.

---

## Automated gate (scaffold)

| Gate                 | Command                                                  | Result          | Notes                              |
| -------------------- | -------------------------------------------------------- | --------------- | ---------------------------------- |
| Build                | `npm run build`                                          | required        | 23 static pages                    |
| Vitest release slice | `npm test` (includes `public-350.release-evidence.test.ts`) | required        | honest `ready: false` guard        |
| Design authority     | `npm run validate:design`                                | required        | semantic token contract            |
| SEO                  | `npm run validate:seo`                                   | required        | sitemap/hreflang/canonical         |
| Foundation           | `npm run test:foundation`                                | required        | 6 passed @ `f3acb24` gate sweep    |
| Performance          | `npm run test:performance`                               | required        | 6 passed @ `f3acb24` gate sweep    |
| Visual matrix        | `npm run test:visual -- --grep PUBLIC-280`               | required        | 216 passed @ `f3acb24` gate sweep  |
| No-JS                | `npm run test:nojs`                                      | required        | 23 passed @ `f3acb24` gate sweep   |
| Staging smoke        | `npm run test:smoke`                                     | skip when unset | requires `PUBLIC_STAGING_SITE_URL` |
| Owner acceptance     | manual                                                   | blocked         | PUBLIC-190 visual QA `REVISE`      |

---

## Release report fields (template)

Fill `Docs/templates/RELEASE-REPORT-TEMPLATE.md` only after R7 staging and owner acceptance close. Until then:

| Field               | Value (current)                                      |
| ------------------- | ---------------------------------------------------- |
| Release identifier  | _not tagged — scaffold only_                         |
| Repository commits  | public-site `main` @ gate-sweep SHA                  |
| Artifact hashes     | _pending immutable staging build_                    |
| Automated checks    | Vitest 210+; Playwright tags per table above           |
| Manual checks       | PUBLIC-190 owner visual compare — **open**           |
| Deferred validations| staging smoke, production telemetry, PF-02 detail    |
| Gate result         | **R4/R8 public slice incomplete**                    |

---

## Blockers

| Blocker                   | Owner      | Notes                                                     |
| ------------------------- | ---------- | --------------------------------------------------------- |
| PUBLIC-190 visual QA      | Owner      | Independent PASS required; current result `REVISE`        |
| PUBLIC-200+ page families | Public     | Frozen until PUBLIC-190 PASS                              |
| `BACKEND-180` + R7        | Backend    | Staging deployment before live smoke                      |
| `PUBLIC_STAGING_SITE_URL` | Operations | No staging URL checked into this repository               |
| Production telemetry      | Platform   | PUBLIC-290 75th-percentile field data open                |

---

## Follow-on

| Task       | Notes                                            |
| ---------- | ------------------------------------------------ |
| PUBLIC-190 | Owner visual acceptance — do not mark PASS without evidence |
| PUBLIC-320 | Live staging smoke after R7                      |
| COORD-080  | Cross-repo R8 sign-off package                   |
| R9         | Production tag + rollback after R7–R8 closure    |
