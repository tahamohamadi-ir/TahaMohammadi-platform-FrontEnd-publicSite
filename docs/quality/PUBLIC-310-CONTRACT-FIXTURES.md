# PUBLIC-310 Contract Fixture Evidence

**Packet:** PUBLIC-310  
**Authority:** `Docs/03-contracts/CONTRACT-FIXTURE-PATHS.md`, accepted public OpenAPI hash pin  
**Environment:** local Vitest — consumer fixtures validated against backend authoritative copies and accepted OpenAPI components  
**Status:** automated contract fixture validation in unit tests; integrated staging smoke remains `PUBLIC-320`.

This checklist does **not** close `PUBLIC-190`. Passing contract fixture validation does not claim visual acceptance.

---

## Automated gate

| Gate | Command | Result | Notes |
|---|---|---|---|
| Build | `npm run build` | required | unchanged production surface |
| Vitest contract fixtures | `npm test` (includes `public-310.contract-fixtures.test.ts`) | required | OpenAPI hash pin + fixture drift + schema shape |
| Design authority | `npm run validate:design` | required | semantic token contract |
| SEO | `npm run validate:seo` | required | sitemap/hreflang/canonical |
| CI | `.github/workflows/ci.yml` | push/PR | unit + design + SEO + build |

**Harness:** `src/test-harness/contract-fixtures.ts`, `src/public-310.contract-fixtures.test.ts`

---

## Consumer fixture paths

| Path | Purpose |
|---|---|
| `tests/fixtures/contracts/responses/` | Published public DTO examples copied from `Back-End/tests/fixtures/contracts/public/` |
| `tests/fixtures/contracts/errors/` | Public error matrix rows copied from `Back-End/tests/fixtures/contracts/errors/` |

Each consumer file is byte-compared to the backend authoritative fixture. Response fixtures additionally validate against accepted OpenAPI components (profile detail uses the observed field set until Gap A closes).

---

## Response coverage

| Fixture | OpenAPI component |
|---|---|
| `landing.get.200.json` | `LandingOut` |
| `articles.get.200.json` | `PagedArticleListOut` / `ArticleListOut` items |
| `articles-detail.get.200.json` | `ArticleDetailOut` |
| `profile-detail.get.200.json` | observed profile detail field set (Gap A) |
| `publication-detail.get.200.json` | `PublicationDetailOut` |
| `project-detail.get.200.json` | `ProjectDetailOut` |
| `site.get.200.json` | `PublicSiteSettingsOut` |

---

## Error matrix coverage

Aligned with `Docs/03-contracts/ERROR-COMPATIBILITY-MATRIX.md`:

| Fixture | Matrix row |
|---|---|
| `profile-not-found.404.json` | Public profile not found (`detail` string, 404) |
| `contact.post.error.json` | Public contact JSON failure (`ok: false`, `error`) |
| `contact.post.validation.html` | Public contact HTML 422 (progressive form path) |

`framework-validation.unhandled.json` remains backend-only until accepted in OpenAPI.

---

## Follow-on

| Task | Notes |
|---|---|
| PUBLIC-320 | integrated staging smoke scaffold shipped; live probes skip until staging URL + `BACKEND-180` |
| PUBLIC-190 | owner visual QA remains `REVISE` |
