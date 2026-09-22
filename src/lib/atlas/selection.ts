/** Shared selection state machine (Plan C Task 9).
 *
 * The single `overview` / `node` / `relation` model every presentation shares.
 * Pure: state transitions notify subscribers; the enhancement orchestrator
 * (Task 15) owns writing `data-atlas-state` to the DOM from those states.
 */
import { isNodeKey, isRelationKey, type AtlasPayload } from './model'

export type AtlasSelectionState = 'overview' | 'node' | 'relation'

export interface AtlasFocus {
  kind: 'node' | 'relation'
  key: string
}

export type SelectionSubscriber = (state: AtlasSelectionState) => void

export interface SelectionResolution {
  selected: AtlasFocus | null
  reason?: 'unknown'
}

function parseFocusString(value: string): AtlasFocus | null {
  const sep = value.indexOf(':')
  if (sep < 0) return null
  const kind = value.slice(0, sep)
  const key = value.slice(sep + 1)
  if (!key) return null
  if (kind === 'node') return isNodeKey(key) ? { kind, key } : null
  if (kind === 'relation') return isRelationKey(key) ? { kind, key } : null
  return null
}

export interface SelectionModel {
  readonly state: AtlasSelectionState
  selectNode(key: string): boolean
  selectRelation(key: string): boolean
  clear(): void
  subscribe(fn: SelectionSubscriber): () => void
  exists(key: string): boolean
  resolve(value: string | AtlasFocus): SelectionResolution
}

export function createSelectionModel(payload: AtlasPayload): SelectionModel {
  const nodeKeys = new Set(payload.nodes.map((n) => n.key))
  const relationKeys = new Set(payload.relations.map((r) => r.key))
  let current: AtlasFocus | null = null
  const subscribers = new Set<SelectionSubscriber>()

  const notify = () => {
    const state: AtlasSelectionState = current ? current.kind : 'overview'
    for (const fn of subscribers) fn(state)
  }

  const known = (focus: AtlasFocus) =>
    focus.kind === 'node'
      ? nodeKeys.has(focus.key)
      : relationKeys.has(focus.key)

  return {
    get state(): AtlasSelectionState {
      return current ? current.kind : 'overview'
    },
    selectNode(key: string): boolean {
      if (!isNodeKey(key) || !nodeKeys.has(key)) return false
      current = { kind: 'node', key }
      notify()
      return true
    },
    selectRelation(key: string): boolean {
      if (!isRelationKey(key) || !relationKeys.has(key)) return false
      current = { kind: 'relation', key }
      notify()
      return true
    },
    clear(): void {
      current = null
      notify()
    },
    subscribe(fn: SelectionSubscriber): () => void {
      subscribers.add(fn)
      return () => {
        subscribers.delete(fn)
      }
    },
    exists(key: string): boolean {
      return nodeKeys.has(key) || relationKeys.has(key)
    },
    resolve(value: string | AtlasFocus): SelectionResolution {
      const focus =
        typeof value === 'string'
          ? value.includes(':')
            ? parseFocusString(value)
            : null
          : value
      // Grammar-only strings that fail parsing, and well-formed focuses whose
      // key vanished from the payload, are both `unknown` — never a guess.
      if (!focus) return { selected: null, reason: 'unknown' }
      if (!known(focus)) return { selected: null, reason: 'unknown' }
      return { selected: focus }
    },
  }
}
