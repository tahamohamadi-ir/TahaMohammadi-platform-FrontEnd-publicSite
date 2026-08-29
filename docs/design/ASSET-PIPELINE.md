# Asset Pipeline

## Authority

Use `../../../Docs/references/frontend-design-authority/` as the only tracked source. `concepts/` and `concepts/page-families/` define UI/UX reference; `art/` and `brand/` remain source masters until an `ASSET-PROMOTION-LEDGER.md` row is approved.

The ignored sibling `../Assets` directory is local incoming evidence only and must not be imported, copied, or treated as a fallback at build time.

Use only assets registered in the shared `ASSET-REGISTER.md`. Preserve source files outside generated output. For every production asset, record source path, checksum, intended role, crop policy, responsive derivatives, alt-text policy, license/ownership, and optimization result.

Do not stretch logos, use a logo as an empty-state illustration, bake essential text into images, or ship full-resolution backgrounds without responsive formats and an explicit performance exception.
