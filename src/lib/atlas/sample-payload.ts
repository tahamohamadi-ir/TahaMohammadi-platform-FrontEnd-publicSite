/** Shared sample payload for Task 10/11 tests (not a test file itself).
 *
 * Lives outside `*.test.ts` so importing it never re-executes another file's
 * suite: a builder exported from a `.test.ts` module registers that suite a
 * second time in every importer (seen: filters tests running ×3).
 */
import type { AtlasPayload } from './model'

export function makeSamplePayload(): AtlasPayload {
  return {
    contractVersion: 'atlas01-1.0.0',
    locale: 'en',
    version: {
      id: 1,
      revision: '1-x',
      publishedAt: '2026-09-21T00:00:00.000000+00:00',
      nodeCount: 4,
      relationCount: 5,
      layoutRevision: 1,
    },
    nodeTypes: [
      {
        key: 'identity',
        label: 'Identity',
        semanticRole: 'anchor',
        visualRole: 'anchor',
        allowAsRoot: true,
        allowChildren: false,
        filterVisible: false,
      },
      {
        key: 'research-area',
        label: 'Research area',
        semanticRole: 'area',
        visualRole: 'domain',
        allowAsRoot: true,
        allowChildren: true,
        filterVisible: true,
      },
      {
        key: 'project',
        label: 'Project',
        semanticRole: 'record',
        visualRole: 'record',
        allowAsRoot: false,
        allowChildren: false,
        filterVisible: true,
      },
    ],
    relationTypes: [],
    groups: [],
    nodes: [
      {
        key: 'identity-00000001',
        type: 'identity',
        label: 'Anchor',
        importance: 100,
        mobileOverviewPriority: 'featured',
        aliases: [],
        position: { x: 0, y: 0, z: 0 },
      },
      {
        key: 'area-00000001',
        type: 'research-area',
        label: 'Area one',
        importance: 80,
        mobileOverviewPriority: 'auto',
        aliases: [],
        position: { x: 1, y: 0, z: 0 },
      },
      {
        key: 'area-00000002',
        type: 'research-area',
        label: 'Area two',
        importance: 70,
        mobileOverviewPriority: 'auto',
        aliases: [],
        position: { x: 2, y: 0, z: 0 },
      },
      {
        key: 'project-00000001',
        type: 'project',
        label: 'Project one',
        importance: 60,
        mobileOverviewPriority: 'auto',
        aliases: [],
        position: { x: 3, y: 0, z: 0 },
      },
    ],
    relations: [
      {
        key: 'identity-00000001~parent-of~area-00000001',
        type: 'parent-of',
        source: 'identity-00000001',
        target: 'area-00000001',
        directed: true,
        weight: 1,
        hierarchy: true,
      },
      {
        key: 'identity-00000001~parent-of~area-00000002',
        type: 'parent-of',
        source: 'identity-00000001',
        target: 'area-00000002',
        directed: true,
        weight: 1,
        hierarchy: true,
      },
      // General cycle: area-1 ↔ project-1 through non-hierarchy edges.
      {
        key: 'area-00000001~uses~project-00000001',
        type: 'uses',
        source: 'area-00000001',
        target: 'project-00000001',
        directed: true,
        weight: 1,
        hierarchy: false,
      },
      {
        key: 'project-00000001~uses~area-00000001',
        type: 'uses',
        source: 'project-00000001',
        target: 'area-00000001',
        directed: true,
        weight: 1,
        hierarchy: false,
      },
      // Second parent for area-1: multi-parent membership.
      {
        key: 'area-00000002~parent-of~area-00000001',
        type: 'parent-of',
        source: 'area-00000002',
        target: 'area-00000001',
        directed: true,
        weight: 1,
        hierarchy: true,
      },
    ],
  } as unknown as AtlasPayload
}
