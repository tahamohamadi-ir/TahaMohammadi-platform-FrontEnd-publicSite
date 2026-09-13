/**
 * RU-2B — Leader lines between a projected HTML label and its 3D node.
 *
 * The label layer is HTML by design (crisp, translatable, selectable), which means
 * a chip floats over the canvas with no inherent ownership. A thin SVG stem
 * restores that ownership without moving text into WebGL and without adding a
 * single draw call to the 3D scene.
 *
 * Deliberate restraint, per the brief: one hairline per label, no boxes, no
 * shadows, no glow. It must read as a measurement annotation — an instrument
 * detail — and must never compete with the relationship curves.
 *
 * Endpoints are recomputed from the SAME projected coordinates the chips and the
 * hit tester use, so a stem can never point somewhere the node is not. When a
 * label is occluded, hidden, colliding with the viewport edge, or simply too
 * close to its node to need a stem, the stem is hidden with it.
 */

export interface ProjectedLabelInput {
  id: string
  x: number
  y: number
  visible: boolean
}

export interface ProjectedNodeInput {
  id: string
  x: number
  y: number
  radiusPx: number
  visible: boolean
}

export interface LeaderLayer {
  render(
    labels: ReadonlyArray<ProjectedLabelInput>,
    nodes: ReadonlyArray<ProjectedNodeInput>,
  ): void
  setSelected(id: string | null): void
  clear(): void
}

/**
 * Vertical gap between a node's top edge and its chip's bottom edge, in CSS px.
 * The label layer writes this value into the same CSS custom property the chip
 * transform uses, so the chip and its stem cannot drift apart.
 */
export const LABEL_GAP_PX = 16
/** Below this stem length a line would look like a speck: hide it instead. */
export const MIN_STEM_PX = 7
/** Keep-out margin at the viewport edges. */
export const SAFE_MARGIN_PX = 10

export interface LeaderLayerOptions {
  container: HTMLElement
  doc?: Document
  className?: string
}

export function createLeaderLayer(options: LeaderLayerOptions): LeaderLayer {
  const { container } = options
  const doc = options.doc ?? container.ownerDocument ?? document
  const svgNs = 'http://www.w3.org/2000/svg'
  const lines = new Map<string, SVGLineElement>()
  let selectedId: string | null = null

  const svg = doc.createElementNS(svgNs, 'svg')
  svg.setAttribute('class', options.className ?? 'ru-leaders')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  container.appendChild(svg)

  function lineFor(id: string): SVGLineElement {
    const existing = lines.get(id)
    if (existing) return existing
    const line = doc.createElementNS(svgNs, 'line')
    line.setAttribute('data-leader-for', id)
    line.setAttribute('vector-effect', 'non-scaling-stroke')
    svg.appendChild(line)
    lines.set(id, line)
    return line
  }

  function hide(line: SVGLineElement): void {
    line.setAttribute('data-visible', 'false')
    line.style.display = 'none'
  }

  return {
    render(labels, nodes) {
      const width = container.clientWidth
      const height = container.clientHeight
      if (width <= 0 || height <= 0) {
        for (const line of lines.values()) hide(line)
        return
      }
      const nodeById = new Map(nodes.map((node) => [node.id, node]))
      const live = new Set<string>()

      for (const label of labels) {
        const node = nodeById.get(label.id)
        if (!node) continue
        live.add(label.id)
        const line = lineFor(label.id)

        const startY = node.y - node.radiusPx
        const endY = label.y - node.radiusPx - LABEL_GAP_PX
        // The chip is anchored above the node's SURFACE, so the stem is exactly
        // LABEL_GAP_PX long whatever the node's apparent size; anchoring to the
        // centre instead would swallow the stem on any node larger than the gap.
        // Screen coordinates grow downward, so the length is `startY - endY`.
        const stemLength = startY - endY
        const insideSafeArea =
          label.x >= SAFE_MARGIN_PX &&
          label.x <= width - SAFE_MARGIN_PX &&
          endY >= SAFE_MARGIN_PX
        const visible =
          label.visible &&
          node.visible &&
          insideSafeArea &&
          stemLength >= MIN_STEM_PX

        if (!visible) {
          hide(line)
          continue
        }

        line.setAttribute('x1', String(round(node.x)))
        line.setAttribute('y1', String(round(startY)))
        line.setAttribute('x2', String(round(label.x)))
        line.setAttribute('y2', String(round(endY)))
        line.setAttribute('data-visible', 'true')
        line.style.display = ''
      }

      for (const [id, line] of lines) {
        if (!live.has(id)) hide(line)
      }

      for (const [id, line] of lines) {
        line.setAttribute(
          'data-selected',
          selectedId != null && id === selectedId ? 'true' : 'false',
        )
      }
    },

    setSelected(id) {
      selectedId = id
      for (const [lineId, line] of lines) {
        line.setAttribute('data-selected', lineId === id ? 'true' : 'false')
      }
    },

    clear() {
      for (const line of lines.values()) line.remove()
      lines.clear()
      svg.remove()
    },
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
