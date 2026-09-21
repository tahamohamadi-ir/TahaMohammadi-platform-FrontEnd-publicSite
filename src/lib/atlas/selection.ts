/** Shared selection state (Plan C Task 9).
 *
 * Kind-aware identity: `exists({ kind, key })`. Payload key collisions across
 * node/relation sets fail construction. Unknown selections return to overview
 * so URL and internal state cannot diverge. No network / preview / refresh.
 */

import { isNodeKey, isRelationKey, type AtlasPayload } from './model'
import type { AtlasFocus } from './url-state'

export type AtlasSelectionMode = 'overview' | 'node' | 'relation'

export type AtlasSelectionState =
  | { mode: 'overview' }
  | { mode: 'node'; key: string }
  | { mode: 'relation'; key: string }

export type SelectionSubscriber = (state: AtlasSelectionState) => void

export type SelectionResolution =
  { selected: AtlasFocus } | { selected: null; reason: 'unknown' }

export interface SelectionModel {
  readonly state: AtlasSelectionState
  stateAttr(): AtlasSelectionMode
  selectNode(key: string): void
  selectRelation(key: string): void
  clear(): void
  subscribe(fn: SelectionSubscriber): () => void
  exists(focus: AtlasFocus): boolean
  resolve(focus: AtlasFocus): SelectionResolution
}

export function createSelectionModel(payload: AtlasPayload): SelectionModel {
  const nodeKeys = new Set(payload.nodes.map((n) => n.key))
  const relationKeys = new Set(payload.relations.map((r) => r.key))

  for (const key of nodeKeys) {
    if (relationKeys.has(key)) {
      throw new Error(
        `Atlas selection collision: key "${key}" appears as both node and relation`,
      )
    }
  }

  let current: AtlasFocus | null = null
  const subscribers = new Set<SelectionSubscriber>()

  const toState = (): AtlasSelectionState => {
    if (!current) return { mode: 'overview' }
    return current.kind === 'node'
      ? { mode: 'node', key: current.key }
      : { mode: 'relation', key: current.key }
  }

  const notify = () => {
    const state = toState()
    for (const fn of subscribers) fn(state)
  }

  const known = (focus: AtlasFocus): boolean =>
    focus.kind === 'node'
      ? nodeKeys.has(focus.key)
      : relationKeys.has(focus.key)

  return {
    get state(): AtlasSelectionState {
      return toState()
    },
    stateAttr(): AtlasSelectionMode {
      return toState().mode
    },
    selectNode(key: string): void {
      if (isNodeKey(key) && nodeKeys.has(key)) {
        current = { kind: 'node', key }
      } else {
        // Unknown / invalid → overview (no throw, no stuck prior selection).
        current = null
      }
      notify()
    },
    selectRelation(key: string): void {
      if (isRelationKey(key) && relationKeys.has(key)) {
        current = { kind: 'relation', key }
      } else {
        current = null
      }
      notify()
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
    exists(focus: AtlasFocus): boolean {
      return known(focus)
    },
    resolve(focus: AtlasFocus): SelectionResolution {
      if (!known(focus)) return { selected: null, reason: 'unknown' }
      return { selected: focus }
    },
  }
}
