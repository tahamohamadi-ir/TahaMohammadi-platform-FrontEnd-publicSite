/**
 * RU-01 — Published graph → Research Universe adapter.
 *
 * This is the ONLY bridge between published facts and the renderer-facing
 * universe. It consumes the already-validated semantic model produced by
 * `lib/hero-graph-content.ts` (CA-02) rather than the raw payload, so it
 * inherits every existing guarantee for free: exact-locale resolution,
 * resolver-verified hrefs only, explicit empty/error/unavailable states, and no
 * invented nodes, edges or links.
 *
 * It adds exactly two things the presentations need: presentation kinds/levels
 * (see `hierarchy.ts`) and a resolved presentation anchor. It never adds,
 * removes, renames or re-links a research fact.
 */

import type { HeroGraphModel } from '../hero-graph-content'
import { buildUniverseHierarchy } from './hierarchy'
import {
  UNIVERSE_MODEL_VERSION,
  findDanglingEdges,
  type ReadyUniverse,
  type UniverseModel,
  type UniverseNode,
} from './model'

export interface AdaptUniverseOptions {
  /**
   * Presentation-only anchor used ONLY when the published payload has no
   * identity node. Facts must come from existing site/profile content.
   */
  profileAnchor?: { label: string; href: string | null } | null
  /** Marks fixture-derived input so it can never be mistaken for published. */
  source?: 'published' | 'synthetic-fixture'
}

/**
 * Adapt a semantic hero-graph model into the shared universe model.
 *
 * Non-ready semantic states pass through unchanged — the universe renders the
 * same honest fallbacks, never an empty-but-enhanced scene.
 */
export function adaptResearchUniverse(
  model: HeroGraphModel,
  options: AdaptUniverseOptions = {},
): UniverseModel {
  if (model.status === 'empty') {
    return { status: 'empty', locale: model.locale, warnings: model.warnings }
  }
  if (model.status === 'error') {
    return { status: 'error', locale: model.locale, issues: model.issues }
  }
  if (model.status === 'unavailable') {
    return { status: 'unavailable', locale: model.locale }
  }

  const source = options.source ?? 'published'
  const hierarchy = buildUniverseHierarchy(
    model.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      type: node.type,
    })),
    model.edges.map((edge) => ({ source: edge.source, target: edge.target })),
    options.profileAnchor ?? null,
  )

  const anchor = hierarchy.anchor
  // The anchor borrows the identity node's own resolver-verified profile link
  // when the published graph provides one; otherwise it keeps the site fact.
  const anchorHref =
    anchor?.id != null
      ? (model.nodes
          .find((node) => node.id === anchor.id)
          ?.related.find((link) => link.family === 'profile')?.href ?? null)
      : (anchor?.href ?? null)

  const nodes: UniverseNode[] = model.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    accessibleLabel: node.accessibleLabel,
    type: node.type,
    kind: hierarchy.kinds.get(node.id) ?? 'other',
    level: hierarchy.levels.get(node.id) ?? 1,
    classification: hierarchy.classifications.get(node.id) ?? 'type-derived',
    weight: node.weight,
    summary: node.summary,
    colorRole: node.colorRole,
    iconRole: node.iconRole,
    x: node.layout.x,
    y: node.layout.y,
    z: node.layout.z,
    layoutSource: node.layout.source,
    related: node.related,
  }))

  const edges = model.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    relationType: edge.relationType,
    weight: edge.weight,
    directed: edge.directed,
    explanation: edge.explanation,
  }))

  const dangling = findDanglingEdges(nodes, edges)
  if (dangling.length > 0) {
    // A dangling edge means the published projection is inconsistent; render
    // nothing rather than a curve into empty space.
    return {
      status: 'error',
      locale: model.locale,
      issues: [`dangling-edges:${dangling.join(',')}`],
    }
  }
  if (nodes.length === 0) {
    return { status: 'empty', locale: model.locale, warnings: model.warnings }
  }

  const ready: ReadyUniverse = {
    status: 'ready',
    locale: model.locale,
    contractVersion: UNIVERSE_MODEL_VERSION,
    source,
    anchor: {
      id: anchor?.id ?? null,
      label: anchor?.label ?? '',
      accessibleLabel: anchor?.accessibleLabel ?? '',
      href: anchorHref,
      source: anchor?.source ?? 'site-profile',
    },
    nodes,
    edges,
    levelCounts: hierarchy.counts,
    warnings: [
      ...model.warnings,
      ...(hierarchy.maxLevel < 2 ? ['single-level-graph'] : []),
      ...(anchor?.id == null ? ['anchor-from-site-profile'] : []),
    ],
  }
  return ready
}
