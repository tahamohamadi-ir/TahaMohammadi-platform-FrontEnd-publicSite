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

export interface LabelLayerOptions {
  container: HTMLElement
  doc?: Document
  className?: string
}

export interface LabelLayer {
  render(
    labels: ReadonlyArray<ProjectedLabel>,
    labelById: ReadonlyMap<string, string>,
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
    render(labels, labelById) {
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
      }
      for (const [id, element] of nodes) {
        if (!seen.has(id)) element.hidden = true
      }
    },

    setSelected(id) {
      selectedId = id
      for (const [labelId, element] of nodes)
        applySelected(element, labelId === id)
    },

    setVisible(visible) {
      container.hidden = !visible
    },

    clear() {
      for (const element of nodes.values()) element.remove()
      nodes.clear()
    },
  }
}
