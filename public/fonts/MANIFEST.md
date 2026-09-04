# Self-hosted font manifest

Pinned WOFF2 binaries for PUBLIC-050. License: SIL OFL 1.1 (`OFL.txt` beside each family).

| Family              | File                                   | Upstream                                                                                                                     | SHA-256                                                            |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Inter Variable      | `inter/InterVariable.woff2`            | [rsms/inter](https://github.com/rsms/inter) `docs/font-files/InterVariable.woff2`                                            | `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3` |
| Newsreader Variable | `newsreader/Newsreader-Variable.woff2` | [productiontype/Newsreader](https://github.com/productiontype/Newsreader) `fonts/variable/woff2/Newsreader[opsz,wght].woff2` | `1faa3380ac0e87e057b180e03fd94bd708a612afb67d2590677be4508909fae9` |
| Vazirmatn Variable  | `vazirmatn/Vazirmatn-Variable.woff2`   | [rastikerdar/vazirmatn](https://github.com/rastikerdar/vazirmatn) `fonts/webfonts/Vazirmatn[wght].woff2`                     | `4e3fa217d38fdafc1fea4414ceb58ca5e662cf0ab5fa735a8c8c20e8b42cad92` |
| Estedad Variable    | `estedad/Estedad-Variable.woff2`       | [aminabedi68/Estedad](https://github.com/aminabedi68/Estedad) `fonts/webfonts/Estedad[wght].woff2`                           | `18a2278ad5c9c2f60e034270ea2d5856d04c4e984e47c65483aa63b41e3c5a1e` |

Locale pairing (see `Docs/04-design/FONT-ACQUISITION-PLAN.md`):

- **en:** Newsreader Variable (display) + Inter Variable (body)
- **fa:** Estedad Variable (display) + Vazirmatn Variable (body)

## PS-10 subsets (pyftsubset, fonttools 4.64.0, `--flavor=woff2 --layout-features='*'`)

Latin: `U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD`.
Arabic: `U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200D,U+FB50-FDFF,U+FE70-FEFF`.
Variation axes preserved (`wght` everywhere; `opsz` on Inter/Newsreader). Full binaries stay as unicode-range-less fallback faces.
Coverage proofs: `tests/fixtures/fonts/subset-coverage.json` (per-file cmap probes, enforced by `src/public-050.font-subsets.test.ts`).
Preloads: EN latin pair (231 KB vs 554 KB full); FA arabic pair (100 KB vs 234 KB full). U+200E/U+200F are absent from the upstream Inter binary too (default-ignorable controls: no tofu).

| Family (script)      | File                                         | Size (full)         | SHA-256                                                            |
| -------------------- | -------------------------------------------- | ------------------- | ------------------------------------------------------------------ |
| Inter Variable latin | `inter/InterVariable-latin.woff2`            | 97.4 KB (344.0 KB)  | `13f685d4b9cf5384a2b01a5692fed6e537ba5a80b0ad968aa93d0efe176a8df5` |
| Newsreader latin     | `newsreader/Newsreader-Variable-latin.woff2` | 133.6 KB (209.8 KB) | `9c8b500fc31dcd61005dc78bfc09428f68f915edef4233f059a8a41dd0ed89b2` |
| Vazirmatn latin      | `vazirmatn/Vazirmatn-Variable-latin.woff2`   | 43.4 KB (108.5 KB)  | `779d9ba754ac7f46dcc25c337ec97d53ed13c7de995cc27d548fab477f7ec2a7` |
| Vazirmatn arabic     | `vazirmatn/Vazirmatn-Variable-arabic.woff2`  | 43.3 KB (108.5 KB)  | `c0601f44e37bcc1a78f59488edde078c78ea0f2313b504cf38ba07ff6546eb09` |
| Estedad latin        | `estedad/Estedad-Variable-latin.woff2`       | 39.0 KB (125.3 KB)  | `529c91a2d078b35f40ee47141a6fac5549fdf5760196f85d23328dcdb82383c6` |
| Estedad arabic       | `estedad/Estedad-Variable-arabic.woff2`      | 56.4 KB (125.3 KB)  | `9862262e5fbb6535c1493964b726e83c68956b8a030d5396978d3362d7c4a68c` |
