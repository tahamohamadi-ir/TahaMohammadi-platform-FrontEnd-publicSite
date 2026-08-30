/**
 * Canonical SHA-256 checksums from coordination authority SHA256SUMS.txt.
 * Runtime promotion must match these exact bytes before derivatives ship.
 */
export const AUTHORITY_CHECKSUMS = {
  'portal-centered-dark': '5520a6063c223dd7ad3896e26c7e0b52aa321bfb427a04ef620de7563b975181',
  'portal-centered-light': '855fd82d363c7f2840d5e9359331e8cd29e1d1a54ea2e432f6cf2ae15fd09e2f',
  'portal-orbit-dark': 'e10ff56456b6d9f7b3596311a378197f3600bee92d0993169216ff4caf3edd50',
  'portal-orbit-light': '3e9316a95370a3401da8b3cd7c0007e404fe3bd985aeb70a082e13b7ff1fbf2b',
  'brand-primary': '232276518f4b97351574fdfffc7b230fdd402bb7356c096a3694701959cd5cc8',
  'brand-favicon': '3019401d3a84e042616398990f9322419252fc2e24c81a793e5feb22b5029ca8',
  'project-dashboard-systems': 'c33ee40fcf13ffe3a7c359285c74eb9eb45415d92b061e550e1c5b2c35029ba4',
  'project-data-architecture': 'b31c2bced438d03337daa225d284fe10aa3f6595785afe5db36b3f458eb925f1',
  'blog-coral-stairs': '908e890360742228f27fabbd21569588eb0302cb656f9889a545f42749d04720',
  'learning-sage-library': '21ef859df5e6e2177538eb5a71d0f44d8615d32fa53f1586d8b8d3d5461e1418',
  'gallery-ivory-forms': '855296e8dd1541f173c529c30293f3848ef3d45eb3b07d92e64ffb89a4140d4e',
  'project-visual-communication-network':
    'fbceedb903700246442f201f113cfc9b59df18f5f4a5681c379ca8cd61b9db33',
  'project-placeholder-ivory-stairs':
    'b8c237066aaeb903889eebb5cd8f3153c37997fdf8de5ff389e840ec8aec1d3c',
} as const satisfies Record<string, string>;

export type AuthorityAssetId = keyof typeof AUTHORITY_CHECKSUMS;

export const DEFERRED_ASSET_IDS = [
  'project-visual-communication-network',
  'project-placeholder-ivory-stairs',
  'home-graph-backplate-light',
  'home-graph-backplate-dark',
] as const;

export type DeferredAssetId = (typeof DEFERRED_ASSET_IDS)[number];

export const RUNTIME_ASSET_IDS = [
  'portal-centered-dark',
  'portal-centered-light',
  'portal-orbit-dark',
  'portal-orbit-light',
  'brand-primary',
  'brand-favicon',
  'project-dashboard-systems',
  'project-data-architecture',
  'blog-coral-stairs',
  'learning-sage-library',
  'gallery-ivory-forms',
] as const satisfies readonly AuthorityAssetId[];

export type RuntimeAssetId = (typeof RUNTIME_ASSET_IDS)[number];

export function isDeferredAssetId(id: string): id is DeferredAssetId {
  return (DEFERRED_ASSET_IDS as readonly string[]).includes(id);
}

export function isRuntimeAssetId(id: string): id is RuntimeAssetId {
  return (RUNTIME_ASSET_IDS as readonly string[]).includes(id);
}
