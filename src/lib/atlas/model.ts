/** Public Atlas model — wire types mirrored from the Plan A public API (§10.2).
 *
 * The generated OpenAPI types declare both Atlas 200 bodies as generic
 * `{[key: string]: unknown}`, so this module is the typed contract the
 * runtime validator defends. `ATLAS_CONTRACT_VERSION` must equal the backend
 * constant `apps/atlas/contract.py::ATLAS_CONTRACT_VERSION`.
 */

export const ATLAS_CONTRACT_VERSION = 'atlas01-1.0.0'

export type AtlasLocale = 'en' | 'fa'

export type MobileOverviewPriority = 'auto' | 'featured' | 'hidden'

export interface AtlasVersionMeta {
  id: number
  revision: string
  publishedAt: string
  nodeCount: number
  relationCount: number
  layoutRevision: number
}

export interface AtlasNodeTypeOut {
  key: string
  label: string
  semanticRole: string
  visualRole: string
  allowAsRoot: boolean
  allowChildren: boolean
  filterVisible: boolean
}

export interface AtlasRelationTypeOut {
  key: string
  label: string
  inverseLabel: string
  directed: boolean
  hierarchyRole: boolean
  visualPriority: number
}

export interface AtlasGroupOut {
  key: string
  label: string
  description: string
  nodeKeys: string[]
}

export interface AtlasCanonicalRef {
  family: string
  id: string
  slug: string
  title: string
  routeFamily?: string
  href?: string
}

export interface AtlasPosition {
  x: number
  y: number
  z: number
}

export interface AtlasNodeOut {
  key: string
  type: string
  label: string
  summary?: string
  accessibleLabel?: string
  importance: number
  mobileOverviewPriority: MobileOverviewPriority
  aliases: string[]
  canonical?: AtlasCanonicalRef
  position: AtlasPosition
}

export interface AtlasRelationOut {
  key: string
  type: string
  source: string
  target: string
  directed: boolean
  weight: number
  hierarchy: boolean
  inverseLabel?: string
  explanation?: string | null
}

export interface AtlasPayload {
  contractVersion: string
  locale: AtlasLocale
  version: AtlasVersionMeta
  nodeTypes: AtlasNodeTypeOut[]
  relationTypes: AtlasRelationTypeOut[]
  groups: AtlasGroupOut[]
  nodes: AtlasNodeOut[]
  relations: AtlasRelationOut[]
}

/**
 * Key grammar (§5.3, `apps/atlas/keys.py::PUBLIC_KEY_RE`):
 * 2–80 chars, first char alphanumeric-lowercase, rest alphanumerics plus
 * `. _ ~ -`. Node/group keys never contain `~` by construction — a `~` in a
 * URL key unambiguously means "relation".
 */
const SINGLE_KEY_RE = /^[a-z0-9][a-z0-9._~-]{1,79}$/

export function isNodeKey(key: unknown): boolean {
  if (typeof key !== 'string') return false
  if (key.includes('~')) return false
  if (!SINGLE_KEY_RE.test(key)) return false
  if (key !== key.toLowerCase()) return false
  if (/\s/.test(key)) return false
  return true
}

export interface RelationKeyParts {
  source: string
  relationType: string
  target: string
}

export function relationKeyParts(key: unknown): RelationKeyParts | null {
  if (typeof key !== 'string') return null
  const parts = key.split('~')
  if (parts.length !== 3) return null
  const [source, relationType, target] = parts
  if (!source || !relationType || !target) return null
  return { source, relationType, target }
}

export function isRelationKey(key: unknown): boolean {
  const parts = relationKeyParts(key)
  if (!parts) return false
  // Every segment must itself be a well-formed single key (no nested `~`).
  return (
    SINGLE_KEY_RE.test(parts.source) &&
    SINGLE_KEY_RE.test(parts.relationType) &&
    SINGLE_KEY_RE.test(parts.target)
  )
}
