import type { RuntimeAssetId } from './authority-checksums';
import { PROMOTED_ASSET_REGISTRY } from './promoted-media-registry';
import { ATMOSPHERE_WIDTHS, GRAPH_BACKPLATE_WIDTHS, PREVIEW_WIDTHS, PROMOTED_FORMATS } from './transform-recipes';

export interface DerivativeEntry {
  assetId: RuntimeAssetId;
  authorityPath: string;
  sourceSha256: string;
  intrinsic: { width: number; height: number };
  formats: readonly string[];
  widths: readonly number[];
  sizes: string;
  fit: 'cover' | 'contain';
  status: 'active' | 'deferred';
}

/** Build-time derivative plan for AVIF/WebP responsive output. */
export const DERIVATIVE_MANIFEST: readonly DerivativeEntry[] = Object.values(PROMOTED_ASSET_REGISTRY).map(
  (record) => ({
    assetId: record.id,
    authorityPath: record.authorityPath,
    sourceSha256: record.sourceSha256,
    intrinsic: record.intrinsic,
    formats: PROMOTED_FORMATS,
    widths: record.transform.kind === 'atmosphere'
      ? ATMOSPHERE_WIDTHS
      : record.transform.kind === 'preview'
        ? PREVIEW_WIDTHS
        : record.transform.kind === 'graph-backplate'
          ? GRAPH_BACKPLATE_WIDTHS
          : record.transform.widths,
    sizes: record.transform.sizes,
    fit: record.transform.fit,
    status: 'active' as const,
  }),
);

/** Deferred entries for assets not yet promoted into runtime. */
export const DEFERRED_DERIVATIVE_ENTRIES: readonly DerivativeEntry[] = [];

export function getDerivativePlan(assetId: string): DerivativeEntry | undefined {
  return DERIVATIVE_MANIFEST.find((entry) => entry.assetId === assetId);
}
