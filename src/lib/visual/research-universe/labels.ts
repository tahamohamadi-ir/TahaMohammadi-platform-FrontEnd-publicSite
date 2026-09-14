/**
 * RU-02 / RU-4C — Projected HTML labels.
 *
 * Labels are HTML, never canvas text: they stay selectable, translatable and
 * crisp on every DPR, and they are positioned from the same projection the hit
 * tester uses, so a label always sits on top of the node it names.
 *
 * They are DECORATIVE pointer shortcuts — `aria-hidden="true"`,
 * `tabindex="-1"`, no role — so the canvas adds no second keyboard tree. The
 * native semantic list stays the only keyboard source.
 *
 * RU-4C changes:
 * - an `editorial` variant, used on Home, which drops the boxed/pill treatment
 *   for plain editorial type plus a hairline leader (the visual work is in the
 *   CSS; this module only carries the structure and the class),
 * - an optional METADATA line per label (title + one small line), fed from
 *   published/semantic content by the caller,
 * - label de-collision: chips that would overlap are pushed apart vertically so
 *   two labels never sit on top of each other.
 */

import type { ProjectedLabel } from '../scene-contract'
import {
  createLeaderLayer,
  LABEL_GAP_PX,
  type LeaderLayer,
  type ProjectedNodeInput,
} from './leaders'

export type LabelVariant = 'chip' | 'editorial'

export interface LabelLayerOptions {
  container: HTMLElement
  doc?: Document
  className?: string
  /** `editorial` removes the boxed look; `chip` keeps the bordered chip. */
  variant?: LabelVariant
  /** One short secondary line per node id, or empty for none. */
  metaById?: ReadonlyMap<string, string>
}

export interface LabelLayer {
  render(
    labels: ReadonlyArray<ProjectedLabel>,
    labelById: ReadonlyMap<string, string>,
    projectedNodes?: ReadonlyArray<ProjectedNodeInput>,
  ): void
  setSelected(id: string | null): void
  setVisible(visible: boolean): void
  clear(): void
}

/** Minimum gap kept between two chips when de-colliding, in CSS px. */
export const LABEL_COLLISION_PAD_PX = 6
/** A chip is never pushed closer than this to the top of its container. */
export const LABEL_TOP_MARGIN_PX = 8

export function createLabelLayer(options: LabelLayerOptions): LabelLayer {
  const { container } = options
  const doc = options.doc ?? container.ownerDocument ?? document
  const className = options.className ?? 'ru-label'
  const variant: LabelVariant = options.variant ?? 'chip'
  const metaById = options.metaById ?? new Map<string, string>()
  const nodes = new Map<string, HTMLElement>()
  let selectedId: string | null = null
  // RU-2B: leader stems share the chip overlay, so one projection drives both and
  // they cannot drift apart.
  const leaders: LeaderLayer = createLeaderLayer({ container, doc })

  container.classList.toggle('ru-labels--editorial', variant === 'editorial')

  // RU-2B: the chip offset and the leader stem are one geometric fact, so it is
  // published once as a custom property and consumed by both.
  try {
    container.style.setProperty('--ru-label-gap', `${LABEL_GAP_PX}px`)
  } catch {
    // A non-DOM container in tests: the CSS fallback covers it.
  }

  function create(labelId: string, text: string, meta: string): HTMLElement {
    const chip = doc.createElement('button')
    chip.type = 'button'
    chip.className = className
    chip.setAttribute('data-projected-label', labelId)
    chip.setAttribute('aria-hidden', 'true')
    chip.setAttribute('tabindex', '-1')
    const title = doc.createElement('span')
    title.className = 'ru-label__title'
    title.textContent = text
    chip.appendChild(title)
    if (meta.length > 0) {
      const metaLine = doc.createElement('span')
      metaLine.className = 'ru-label__meta'
      metaLine.textContent = meta
      chip.appendChild(metaLine)
    }
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
   * A chip is centred on its node (`transform: translate(-50%, …)`) and can be
   * wide on a narrow stage, so a node near the right edge projected its chip past
   * the stage (measured: 33px beyond at a 390px viewport on About, 77px on Home
   * at 1440px). The stem keeps the chip's ownership of its node, so shifting the
   * chip is honest; leaving it outside a clipped stage is not.
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

  /**
   * Push overlapping chips apart vertically.
   *
   * Two labels whose nodes are close together would otherwise print on top of
   * each other. The lower chip of an overlapping pair moves up; the move is
   * bounded so a chip is never pushed off the top of its stage. Deterministic:
   * boxes are processed top-to-bottom, so the same projection always resolves to
   * the same arrangement.
   */
  function decollide(
    entries: Array<{ element: HTMLElement; visible: boolean }>,
  ): void {
    const containerRect = container.getBoundingClientRect()
    const boxes = entries
      .filter((entry) => entry.visible)
      .map((entry) => {
        const rect = entry.element.getBoundingClientRect()
        return {
          element: entry.element,
          left: rect.left - containerRect.left,
          right: rect.right - containerRect.left,
          top: rect.top - containerRect.top,
          bottom: rect.bottom - containerRect.top,
          localTop: Number.parseFloat(entry.element.style.top),
        }
      })
      .filter((box) => Number.isFinite(box.localTop))
      .sort((a, b) => a.top - b.top)

    for (let index = 0; index < boxes.length; index += 1) {
      for (let other = index + 1; other < boxes.length; other += 1) {
        const above = boxes[index]!
        const below = boxes[other]!
        const overlapX =
          Math.min(above.right, below.right) - Math.max(above.left, below.left)
        if (overlapX <= -LABEL_COLLISION_PAD_PX) continue
        const overlapY = above.bottom - below.top
        if (overlapY <= -LABEL_COLLISION_PAD_PX) continue
        const shift = overlapY + LABEL_COLLISION_PAD_PX
        const nextLocalTop = below.localTop - shift
        if (nextLocalTop < LABEL_TOP_MARGIN_PX) continue
        below.element.style.top = `${nextLocalTop}px`
        below.localTop = nextLocalTop
        below.top -= shift
        below.bottom -= shift
      }
    }
  }

  return {
    render(labels, labelById, projectedNodes) {
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
        const meta = metaById.get(label.id) ?? ''
        let element = nodes.get(label.id)
        if (!element) {
          element = create(label.id, text, meta)
          nodes.set(label.id, element)
          applySelected(element, label.id === selectedId)
        } else {
          const title = element.querySelector('.ru-label__title')
          if (title && title.textContent !== text) title.textContent = text
          const metaLine = element.querySelector('.ru-label__meta')
          if (meta.length > 0 && !metaLine) {
            const created = doc.createElement('span')
            created.className = 'ru-label__meta'
            created.textContent = meta
            element.appendChild(created)
          } else if (
            metaLine &&
            metaLine.textContent !== meta &&
            meta.length > 0
          ) {
            metaLine.textContent = meta
          }
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

      // Pass 3 — write positions, then resolve any overlap between chips.
      const entries: Array<{ element: HTMLElement; visible: boolean }> = []
      const seen = new Set<string>()
      for (const label of resolved) {
        if (!label.visible) continue
        seen.add(label.id)
        const element = elements.get(label.id)
        if (!element) continue
        element.style.left = `${label.x}px`
        element.style.top = `${label.y}px`
        entries.push({ element, visible: true })
      }
      decollide(entries)

      // The stem is drawn from the FINAL chip position, so a de-collided chip
      // still has its leader attached to it.
      const finalPositions = resolved.map((label) => {
        if (!label.visible) return label
        const element = elements.get(label.id)
        const top = element ? Number.parseFloat(element.style.top) : label.y
        return { ...label, y: Number.isFinite(top) ? top : label.y }
      })
      leaders.render(finalPositions, projectedNodes ?? [])

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
