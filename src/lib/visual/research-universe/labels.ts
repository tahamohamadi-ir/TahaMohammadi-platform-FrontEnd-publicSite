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

  /**
   * Keep a chip inside its container, in the inline axis.
   *
   * A chip is centred on its node (`transform: translate(-50%, …)`) and can be up
   * to 9rem wide on a narrow stage, so a node near the right edge projected its
   * chip past the stage: measured at a 390px viewport, the dashboard-domain chip
   * overhung by 33px while the node itself and the page were both contained. The
   * stem keeps the chip's ownership of its node, so shifting the chip is honest;
   * leaving it outside a clipped stage is not — the text was simply cut off.
   *
   * A chip WIDER than the container cannot be contained by shifting, so it is
   * centred instead of being pushed off one edge.
   */
  function clampInline(
    element: HTMLElement | undefined,
    x: number,
    containerWidth: number,
  ): number {
    if (!element || !(containerWidth > 0)) return x
    const width = element.offsetWidth
    if (!(width > 0)) return x
    if (width >= containerWidth) return containerWidth / 2
    const half = width / 2
    return Math.min(Math.max(x, half), containerWidth - half)
  }

  return {
    render(labels, labelById, projectedNodes) {
      // RU-2B: one projection drives both the chips and their leader stems.
      const radiusById = new Map(
        (projectedNodes ?? []).map((node) => [node.id, node.radiusPx]),
      )

      // Pass 1 — make sure every visible chip exists and carries the right text,
      // so its width is knowable before its position is decided.
      const elements = new Map<string, HTMLElement>()
      for (const label of labels) {
        if (!label.visible) {
          const hidden = nodes.get(label.id)
          if (hidden) hidden.hidden = true
          continue
        }
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
        // RU-2B: the chip is raised above the node's projected SURFACE (not its
        // centre), so the leader stem has a constant, readable length whatever the
        // node's apparent size.
        element.style.setProperty(
          '--ru-node-radius',
          `${radiusById.get(label.id) ?? 0}px`,
        )
        elements.set(label.id, element)
      }

      // Pass 2 — ONE resolved position per label, used by BOTH the chip and its
      // stem, so a clamped chip can never drift from the line that claims it.
      const containerWidth = container.clientWidth
      const resolved = labels.map((label) =>
        label.visible
          ? {
              ...label,
              x: clampInline(elements.get(label.id), label.x, containerWidth),
            }
          : label,
      )
      leaders.render(resolved, projectedNodes ?? [])

      const seen = new Set<string>()
      for (const label of resolved) {
        if (!label.visible) continue
        seen.add(label.id)
        const element = elements.get(label.id)
        if (!element) continue
        element.style.left = `${label.x}px`
        element.style.top = `${label.y}px`
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
