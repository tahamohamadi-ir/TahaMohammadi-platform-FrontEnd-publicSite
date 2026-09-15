/**
 * Canonical SHA-256 checksums from coordination authority SHA256SUMS.txt.
 * Runtime promotion must match these exact bytes before derivatives ship.
 */
export const AUTHORITY_CHECKSUMS = {
  'portal-centered-dark':
    '5520a6063c223dd7ad3896e26c7e0b52aa321bfb427a04ef620de7563b975181',
  'portal-centered-light':
    '855fd82d363c7f2840d5e9359331e8cd29e1d1a54ea2e432f6cf2ae15fd09e2f',
  'portal-orbit-dark':
    'e10ff56456b6d9f7b3596311a378197f3600bee92d0993169216ff4caf3edd50',
  'portal-orbit-light':
    '3e9316a95370a3401da8b3cd7c0007e404fe3bd985aeb70a082e13b7ff1fbf2b',
  'portal-world-dark':
    '32a57a81a6649c7a41b1b6b54b58eeacaffd1449da5cdfaa8be95876c143e953',
  'portal-world-light':
    '6c293e6320c4d528c14802575c989090341c8ff4f526eb8e2f9c775a41c48690',
  'brand-primary':
    '232276518f4b97351574fdfffc7b230fdd402bb7356c096a3694701959cd5cc8',
  'brand-favicon':
    '3019401d3a84e042616398990f9322419252fc2e24c81a793e5feb22b5029ca8',
  'project-dashboard-systems':
    'c33ee40fcf13ffe3a7c359285c74eb9eb45415d92b061e550e1c5b2c35029ba4',
  'project-data-architecture':
    'b31c2bced438d03337daa225d284fe10aa3f6595785afe5db36b3f458eb925f1',
  'blog-coral-stairs':
    '908e890360742228f27fabbd21569588eb0302cb656f9889a545f42749d04720',
  'learning-sage-library':
    '21ef859df5e6e2177538eb5a71d0f44d8615d32fa53f1586d8b8d3d5461e1418',
  'gallery-ivory-forms':
    '855296e8dd1541f173c529c30293f3848ef3d45eb3b07d92e64ffb89a4140d4e',
  'home-graph-backplate-light':
    '22d8faf5f2848a79028f44dad2509806970d97f8ec557296c12e9b594f63df18',
  'home-graph-backplate-dark':
    '6687d39e8ec8bab477e1d05436e5c5d221bb98afbcf5a0ff419703f658842d23',
  'project-visual-communication-network':
    'fbceedb903700246442f201f113cfc9b59df18f5f4a5681c379ca8cd61b9db33',
  'project-placeholder-ivory-stairs':
    'b8c237066aaeb903889eebb5cd8f3153c37997fdf8de5ff389e840ec8aec1d3c',
  // Hero v2 (Stage 3 → Stage 4). Authority is the approved Stage 3 render set:
  // Design-Assets/hero-v2/renders/stage3/alpha/*.png, validated 22/22 by
  // Design-Assets/hero-v2/validation/hero-v2-stage3-validation.json and approved by the
  // owner (card 2026-09-15). These are the transparent production masters, so the page
  // canvas supplies the theme ground - no gradient is baked into the image.
  'hero-v2-desktop-dark-01':
    'd88e1748a3bb0e11d488509fe3a96c930b28ec1c38a4e385b3aa08fdeacdc0ff',
  'hero-v2-desktop-dark-02':
    '06cf9c51d683b635876fd7c5718e635165332344e9eec39c95e9f0abc9311cf2',
  'hero-v2-desktop-dark-03':
    '6399e9c5ef99d841a4f98ac542aaa14115d864a950a034386c6bd8c6568dd0ca',
  'hero-v2-desktop-dark-04':
    '1ca95169a04df470bc453660e16bed9f141f12b1c367f044b38a54bada8bb704',
  'hero-v2-desktop-light-01':
    '93ee80eaf0d99b5afcf6871ba1bd5c11b6b25ca699f34f3f536ce8b121cd2f9f',
  'hero-v2-desktop-light-02':
    '097a7acea9828560a75545b5d6d0ee3e981e30d4fde5574c98a39f19ea3038c6',
  'hero-v2-desktop-light-03':
    '4f71c0f9ae5183c91414972017856eccfa44ac8950b4846be119b21528ce7d4d',
  'hero-v2-desktop-light-04':
    '943eb69a2143d7f35ba70e392dad7f6cf403beea72643f9997455fc3cd6fe1cc',
  'hero-v2-mobile-dark-01':
    '162b6d22171d8f30b3bb67901e8a0efac7520074b4a0ca1d43da7d8b3684b682',
  'hero-v2-mobile-dark-02':
    'b552364bee61cc82cf4f6dc86ce47c97024a7e44ac5a0de07e4550533e49c384',
  'hero-v2-mobile-dark-03':
    'b452a7a346220dfb34f74df9a2320a60adcfe80e4caa366ccc47ae58279bacc4',
  'hero-v2-mobile-dark-04':
    '9120d57dd3bb49747e8826b8779ee385662101090e675eb095e0f86a33b26eee',
  'hero-v2-mobile-light-01':
    '892352d5d3fddf07a525dd627b1730675ca9905db952b953c337295e7d56affc',
  'hero-v2-mobile-light-02':
    'fec7166f7a30e11ff767d57082b801979d3c0253e4d1f68cc7476609893c3f2e',
  'hero-v2-mobile-light-03':
    '6fc1adf526ffba07e00fe48585001e7a58378a7990b4a9ae564c4dd87e44605d',
  'hero-v2-mobile-light-04':
    '9ebc012eb35dfb07cdc2db42f0e13ab9c9d063d25dc51fb93dfd35ceaf545806',
} as const satisfies Record<string, string>

export type AuthorityAssetId = keyof typeof AUTHORITY_CHECKSUMS

export const DEFERRED_ASSET_IDS = [
  'project-visual-communication-network',
  'project-placeholder-ivory-stairs',
] as const

export type DeferredAssetId = (typeof DEFERRED_ASSET_IDS)[number]

export const RUNTIME_ASSET_IDS = [
  'hero-v2-desktop-dark-01',
  'hero-v2-desktop-dark-02',
  'hero-v2-desktop-dark-03',
  'hero-v2-desktop-dark-04',
  'hero-v2-desktop-light-01',
  'hero-v2-desktop-light-02',
  'hero-v2-desktop-light-03',
  'hero-v2-desktop-light-04',
  'hero-v2-mobile-dark-01',
  'hero-v2-mobile-dark-02',
  'hero-v2-mobile-dark-03',
  'hero-v2-mobile-dark-04',
  'hero-v2-mobile-light-01',
  'hero-v2-mobile-light-02',
  'hero-v2-mobile-light-03',
  'hero-v2-mobile-light-04',
  'portal-centered-dark',
  'portal-centered-light',
  'portal-world-dark',
  'portal-world-light',
  'portal-orbit-dark',
  'portal-orbit-light',
  'brand-primary',
  'brand-favicon',
  'project-dashboard-systems',
  'project-data-architecture',
  'blog-coral-stairs',
  'learning-sage-library',
  'gallery-ivory-forms',
  'home-graph-backplate-light',
  'home-graph-backplate-dark',
] as const satisfies readonly AuthorityAssetId[]

export type RuntimeAssetId = (typeof RUNTIME_ASSET_IDS)[number]

/** Group A decorative atmosphere assets promoted via PUBLIC-260. */
export const GROUP_A_DECORATIVE_ASSET_IDS = [
  'portal-centered-dark',
  'portal-centered-light',
  'portal-orbit-dark',
  'portal-orbit-light',
] as const satisfies readonly RuntimeAssetId[]

export type GroupADecorativeAssetId =
  (typeof GROUP_A_DECORATIVE_ASSET_IDS)[number]

/** Group B project previews, rail decorative assets, and brand shell (PUBLIC-261). */
export const GROUP_B_ASSET_IDS = [
  'brand-primary',
  'brand-favicon',
  'project-dashboard-systems',
  'project-data-architecture',
  'blog-coral-stairs',
  'learning-sage-library',
  'gallery-ivory-forms',
] as const satisfies readonly RuntimeAssetId[]

export type GroupBAssetId = (typeof GROUP_B_ASSET_IDS)[number]

export function isDeferredAssetId(id: string): id is DeferredAssetId {
  return (DEFERRED_ASSET_IDS as readonly string[]).includes(id)
}

export function isRuntimeAssetId(id: string): id is RuntimeAssetId {
  return (RUNTIME_ASSET_IDS as readonly string[]).includes(id)
}
