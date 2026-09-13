/**
 * RU-02 — Projected HTML labels.
 *
 * Labels are HTML, never canvas text: they stay selectable, translatable and
 * crisp on every DPR, and they are positioned from the same projection the hit
 * tester uses, so a label always sits on top of the node it names.
 *
 * They are DECORATIVE pointer shortcuts — `aria-hidden="true"`,
 * `tabindex="-1"`, no role — so the canvas adds no second keyboard tree. The
 * native semantic list stays the only keyboard source.
 */

import type { ProjectedLabel } from '../scene-contract'
import {
  createLeaderLayer,
  LABEL_GAP_PX,
  type LeaderLayer,
  type ProjectedNodeInput,
} from './leaders'

export interface LabelLayerOptions {
  container: HTMLElement
  doc?: Document
  className?: string
}

export interface LabelLayer {
  /**
   * `projectedNodes` is optional so an older caller keeps working, but when it is
   * supplied the leader stems are drawn from exactly the same projection the chips
   * use, so a stem can never point somewhere the node is not.
   */
  render(
    labels: ReadonlyArray<ProjectedLabel>,
    labelById: ReadonlyMap<string, string>,
    projectedNodes?: ReadonlyArray<ProjectedNodeInput>,
  ): void
  setSelected(id: string | null): void
  setVisible(visible: boolean): void
  clear(): void
}

export function createLabelLayer(options: LabelLayerOptions): LabelLayer {
  const { container } = options
  const doc = options.doc ?? container.ownerDocument ?? document
  const className = options.className ?? 'ru-label'
  const nodes = new Map<string, HTMLElement>()
  let selectedId: string | null = null
  // RU-2B: leader stems share the chip overlay, so one projection drives both and
  // they cannot drift apart.
  const leaders: LeaderLayer = createLeaderLayer({ container, doc })

  // RU-2B: the chip offset and the leader stem are one geometric fact, so it is
  // published once as a custom property and consumed by both.
  try {
    container.style.setProperty('--ru-label-gap', `${LABEL_GAP_PX}px`)
  } catch {
    // A non-DOM container in tests: the CSS fallback covers it.
  }

  function create(labelId: string, text: string): HTMLElement {
    const chip = doc.createElement('button')
    chip.type = 'button'
    chip.className = className
    chip.setAttribute('data-projected-label', labelId)
    chip.setAttribute('aria-hidden', 'true')
    chip.setAttribute('tabindex', '-1')
    chip.textContent = text
    container.appendChild(chip)
    return chip
  }

  function applySelected(element: HTMLElement, isSelected: boolean): void {
    element.classList.toggle('is-selected', isSelected)
    element.setAttribute('data-selected', isSelected ? 'true' : 'false')
  }

  return {
    render(labels, labelById, projectedNodes) {
      // RU-2B: one projection drives both the chips and their leader stems.
      leaders.render(labels, projectedNodes ?? [])
      const radiusById = new Map(
        (projectedNodes ?? []).map((node) => [node.id, node.radiusPx]),
      )
      const seen = new Set<string>()
      for (const label of labels) {
        if (!label.visible) {
          const hidden = nodes.get(label.id)
          if (hidden) hidden.hidden = true
          continue
        }
        seen.add(label.id)
        const text = labelById.get(label.id) ?? label.id
        let element = nodes.get(label.id)
        if (!element) {
          element = create(label.id, text)
          nodes.set(label.id, element)
          applySelected(element, label.id === selectedId)
        } else if (element.textContent !== text) {
          element.textContent = text
        }
        element.hidden = false
        element.style.left = `${label.x}px`
        element.style.top = `${label.y}px`
        // RU-2B: the chip is raised above the node's projected SURFACE (not its
        // centre), so the leader stem has a constant, readable length whatever the
        // node's apparent size.
        element.style.setProperty(
          '--ru-node-radius',
          `${radiusById.get(label.id) ?? 0}px`,
        )
      }
      for (const [id, element] of nodes) {
        if (!seen.has(id)) element.hidden = true
      }
    },

    setSelected(id) {
      selectedId = id
      for (const [labelId, element] of nodes)
        applySelected(element, labelId === id)
      leaders.setSelected(id)
    },

    setVisible(visible) {
      container.hidden = !visible
    },

    clear() {
      for (const element of nodes.values()) element.remove()
      nodes.clear()
      leaders.clear()
    },
  }
}
