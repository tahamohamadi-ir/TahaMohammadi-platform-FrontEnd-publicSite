# PU-SYNC-graph Delivery Handoff

Owner repository: `PUBLIC` (`Front-End/public-site`)  
Packet: `PU-SYNC-graph`  
Specification: `Docs/05-delivery/concept-alignment-v2/product-packets/PU-SYNC-graph.md`  
Contract: `Docs/03-contracts/PRODUCT-INTERFACES-V2.md` §I04 & §I03  
Status: **PU-SYNC-graph_HANDOFF_READY** (explicitly uncommitted)  
Base commit: `bd6682ea9dae7e5bf6957c36691dc3a94a00ea37`  
Result commit: uncommitted working directory

---

## 1. Summary of Changes

Synchronized public TypeScript types and generated consumer contract fixture/tests for the product record resolver endpoint `GET /api/v1/records/{locale}/resolve`:

- Generated TypeScript types into `src/generated/public-api.ts` from backend OpenAPI snapshot `Back-End/docs/contracts/openapi/current/public-openapi.json` containing the new resolver operation (`apps_api_record_resolver_resolve_records`) and components (`RecordResolveOut`, `WorkRefOut`, `UnresolvedRefOut`, `ErrorEnvelopeOut`).
- Created synthetic contract fixture `tests/fixtures/contracts/product-record-resolver.json` covering:
  - 200 OK batch resolution with preserved request order and unresolved items.
  - Persian locale batch resolution with exact-locale synthetic records.
  - Lesson resolution including parent `courseSlug`.
  - Comprehensive 13-family mapping to canonical `routeFamily` values (`home`, `about`, `blog`, `blog/series`, `research`, `research/statements`, `projects`, `publications`, `books`, `talks`, `resources`, `education`, `gallery`).
  - Empty refs handling (`items: []`, `unresolved: []`).
  - 400 Bad Request error envelopes for malformed reference syntax, non-canonical leading zero IDs, and >50 reference limit.
  - 404 Not Found error envelope for unsupported locales.
  - Strictly synthetic records; zero real persona claims or profile facts.
- Created contract test `src/lib/product-resolver.contract.test.ts` validating:
  - Export of resolver path and schemas in `src/generated/public-api.ts`.
  - Conformance of fixture scenarios to `RecordResolveOut` and `ErrorEnvelopeOut`.
  - Strict preservation of request order among resolved items.
  - Canonical ASCII decimal ID format `[1-9][0-9]*`.
  - Canonical routeFamily mappings for all 13 supported families.
  - 50-reference limit enforcement semantics.

---

## 2. Changed Paths (Within Exact Allowlist)

- `src/generated/public-api.ts` (MODIFIED): Regenerated TypeScript definitions incorporating resolver endpoint and schemas.
- `tests/fixtures/contracts/product-record-resolver.json` (NEW): Synthetic contract fixture for resolver scenarios.
- `src/lib/product-resolver.contract.test.ts` (NEW): Contract test suite verifying resolver schemas, ordering, and constraints.
- `docs/quality/product-v2/PU-SYNC-graph-HANDOFF.md` (NEW): This delivery report.

---

## 3. Schema Hashes & Pin Record

- **Source OpenAPI file**: `../../Back-End/docs/contracts/openapi/current/public-openapi.json`
- **Source OpenAPI SHA-256**: `8739e5db7883b805bb3bc76830c62198c8027f568c36df93114145a156d21b41`
- **Historical accepted pin** (`OPENAPI-ACCEPTANCE.md` / `contracts/openapi.public.sha256`): `0f672693de28ed33286789e5119eb3226c062693fb15168b1aba5513c257c0a5`
- **Hash Drift Status**: Per PRODUCT-INTERFACES-V2 §I08, separate synchronization packets pin the accepted backend schema hash in their handoff. The historical repository pin in `contracts/openapi.public.sha256` and `src/generated/openapi-hash.json` is outside the PU-SYNC-graph exact write allowlist and remains untouched until milestone acceptance.
- **Generation Command**:
  ```bash
  npx openapi-typescript ../../Back-End/docs/contracts/openapi/current/public-openapi.json -o src/generated/public-api.ts
  ```

---

## 4. Verification and Test Results

### 4.1 Contract Test

```bash
npm.cmd test -- src/lib/product-resolver.contract.test.ts
```

**Result**: `8 passed (8)` in 298ms.

- `verifies generated public-api.ts exports resolver path and schemas` (PASS)
- `loads and validates the synthetic resolver contract fixture structure` (PASS)
- `validates batch resolution 200 OK scenario against WorkRefOut shape` (PASS)
- `verifies request order preservation in resolved items` (PASS)
- `validates lesson record includes courseSlug while non-lessons have null courseSlug` (PASS)
- `validates canonical routeFamily mappings for all 13 supported families` (PASS)
- `validates error envelopes conform to ErrorEnvelopeOut schema` (PASS)
- `enforces maximum 50 reference limit semantics per §I04` (PASS)

### 4.2 Linter & Formatter

```bash
npx prettier --check src/generated/public-api.ts tests/fixtures/contracts/product-record-resolver.json src/lib/product-resolver.contract.test.ts
npx eslint src/lib/product-resolver.contract.test.ts
```

**Result**: Clean pass, zero errors or warnings.

---

## 5. UI Changes

None (pure contract and type synchronization packet; no UI changed).

---

## 6. Dirty Status & Remaining Risks

- Repository contains uncommitted changes strictly matching the write allowlist for `PU-SYNC-graph`.
- Pre-existing uncommitted files from CA-01/CA-02/CA-03 in the workspace were left undisturbed.
- Downstream consumer packet `CA-02` can now consume the generated resolver types and fixture.

---

## 7. Stop Marker

**PU-SYNC-graph_HANDOFF_READY**
