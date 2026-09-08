# PU-SYNC-public Handoff — HANDOFF_READY: final public consumer types generated

Task ID: PU-SYNC-public
Repository: PUBLIC — `Front-End/public-site`
Branch: `main`
Base HEAD: `b895b2cb9c6ad9519d55bd2663448461931c0a39`
Workspace HEAD: `c69e339c8c26788467d29ad346fb7df99b1c2842`
Backend source HEAD: `bd6682ea9dae7e5bf6957c36691dc3a94a00ea37`
Resulting state: **uncommitted** — no commit, push, merge, deploy.
Stop marker: **`PU-SYNC-public_HANDOFF_READY`**

Supersedes the earlier `PU-SYNC-public_BLOCKED` handoff in this lane: at
that time the pin guard refused generation (snapshot drift) and
`src/generated/public-api.ts` was owned by the in-flight PU-SYNC-graph
lane. The backend lane has since exported the final snapshot, the pin was
updated to it, and generation now passes byte-identical and idempotent.

## 1. Dependencies (satisfied)

The live public snapshot hash matches the pin (§4); all owning backend
packets have source-exported schema evidence in the working tree. CA-08's
`CA-08_HANDOFF_READY` stands in this checkout (re-verified §5);
PU-SYNC-graph's accepted-local lane owns no conflicting edit — the
generated file regenerated cleanly with no diff after this packet's run.

## 2. Changed paths (exact allowlist + coordinator extensions)

- `src/generated/public-api.ts` (REGENERATED, idempotent) — final
  operations: resolver, lessons, collections/series, localized site
  settings, analytics events; legacy list/detail/file operations retained.
- `src/lib/product-api.contract.test.ts` (NEW) — pin + final-operation +
  additive-compatibility + admin-separation contract test.
- `contracts/openapi.public.sha256` (pin, `47980f8f…d21b41` — predates
  this packet, verified unchanged by it).
- `src/generated/openapi-hash.json` (pin record, 48 paths, v0.4.0 —
  predates this packet, verified unchanged by it).
- Coordinator extensions verified present, untouched by this packet:
  `src/lib/hero-graph-resolve.test.ts`,
  `src/test-harness/contract-fixtures.ts`, the three response fixtures.
- `docs/quality/product-v2/PU-SYNC-public-HANDOFF.md` (this file).

## 3. Failing-before / passing-after

Failing-before: no `product-api.contract.test.ts`; earlier generation
refused by the pin guard (hash drift, quoted in the superseded handoff).
Passing-after:

- `npm.cmd run generate:api-types` → exit 0, output byte-identical on
  re-run (no drift; `git diff` unchanged by the second run).
- `npm.cmd test -- src/lib/product-api.contract.test.ts` → **4 passed**
  (pin triple-match incl. 48 paths / v0.4.0; 7 final routes + 8 final
  schemas; 4 legacy routes retained; `publication-jobs` and
  `/api/v1/admin/` absent from the public consumer).
  (One interim failure — wrong repo-root depth in the new test — fixed
  test-side before the green run.)

## 4. Schema hash / impact

- Accepted public-OpenAPI pin: `47980f8f…d21b41` (CRLF-normalized hash of
  the backend source file — matches byte-for-byte).
- Consumer-type impact: additive — final operations added, legacy kept, no
  consumer code retargeted here (families are later packets).
- No content, routes, translations, or publication state invented.

## 5. Checks executed

- `npm.cmd run generate:api-types` → pass, idempotent.
- `npm.cmd test -- src/lib/product-api.contract.test.ts` → 4/4 pass.
- `npm.cmd test -- src/components/shell/public-150.behavior.test.ts
src/lib/hero-graph-resolve.test.ts` → 18/18 pass (CA-08 shell intact).
- `npm.cmd run lint` → clean (0 errors, 0 warnings).
- `npm.cmd run build` → green, 33 pages, Pagefind en+fa indexed.

## 6. Screenshots

N/A — no visual surface changed.

## 7. Dirty status and boundaries kept

CA-01..08 and PU-SYNC-graph local work preserved untouched; no backend,
admin, central-queue, or `Front-End/Assets` file touched; no central status
edit (coordinator owns status transitions); no secrets, publication,
deploy, or legacy copy.

## 8. Remaining risks

- Uncommitted: needs coordinator review + commit before family packets
  (`PU-13-*`) consume the types.
- CA-07's pre-existing wp40 accessible-name deviation (brand whitespace,
  recorded in `CA-07-HANDOFF.md` §7) is unchanged and out of scope here.

---

## 9. 2026-09-08 — Consumer-type re-sync for additive featured/brand fields

- Backend `247dafe` added optional `featuredRecords`/`brandMedia` to
  `LocalizedSiteSettingsPublicOut` (48 paths, version 0.4.0 unchanged).
  Pins moved to `02dcfff0…`: `contracts/openapi.public.sha256`,
  `src/generated/openapi-hash.json`, and the in-test accepted hash.
- `npm run generate:api-types` regenerated `src/generated/public-api.ts`
  (+13 lines: `LocalizedFeaturedRecordOut`, the two optional fields).
- Evidence: contract suite **4/4**, `lint` clean. No consumer code changed:
  `home-content.ts` already reads `featuredRecords` through an optional
  local type, so the re-sync is behavior-preserving.

## 10. Stop Marker

**PU-SYNC-public_HANDOFF_READY**
