/** Client-side deferred Atlas inspector panel builder (Plan D Phase 2). */

import type { AtlasFocus } from './url-state'
import {
  nodeInspectorModel,
  relationInspectorModel,
  type AtlasInspectorModel,
} from './inspector'
import type { AtlasPayload } from './model'

function panelCopy(locale: AtlasPayload['locale']) {
  return locale === 'en'
    ? { node: 'Node', relation: 'Relation' }
    : { node: 'گره', relation: 'رابطه' }
}

function panelTitle(payload: AtlasPayload, focus: AtlasFocus): string {
  if (focus.kind === 'node') {
    const node = payload.nodes.find((entry) => entry.key === focus.key)
    return node?.label ?? focus.key
  }
  const relation = payload.relations.find((entry) => entry.key === focus.key)
  if (!relation) return focus.key
  const source =
    payload.nodes.find((entry) => entry.key === relation.source)?.label ??
    relation.source
  const target =
    payload.nodes.find((entry) => entry.key === relation.target)?.label ??
    relation.target
  const type =
    payload.relationTypes.find((entry) => entry.key === relation.type)?.label ??
    relation.type
  return `${source} — ${type} — ${target}`
}

function appendSections(
  doc: Document,
  parent: HTMLElement,
  model: AtlasInspectorModel,
): void {
  for (const section of model.sections) {
    const block = doc.createElement('div')
    block.className = 'atlas-inspector__section'
    block.setAttribute('data-atlas-inspector-section', section.id)
    const heading = doc.createElement('h4')
    heading.textContent = section.heading
    block.append(heading)
    const list = doc.createElement('ul')
    for (const item of section.items) {
      const li = doc.createElement('li')
      li.setAttribute('data-atlas-inspector-item', item.key)
      if (item.href) {
        const link = doc.createElement('a')
        link.href = item.href
        link.textContent = item.label
        li.append(link)
      } else {
        li.append(doc.createTextNode(item.label))
      }
      if (item.relationLabel) {
        const span = doc.createElement('span')
        span.className = 'atlas-inspector__relation-label'
        span.textContent = ` — ${item.relationLabel}`
        li.append(span)
      }
      list.append(li)
    }
    block.append(list)
    parent.append(block)
  }
}

/**
 * Replace the deferred inspector mount with at most one active panel.
 * SSR only ships the empty mount + prompt (Plan D §19.6 remediation).
 */
export function renderDeferredInspectorPanel(
  region: HTMLElement,
  payload: AtlasPayload,
  focus: AtlasFocus | null,
  doc: Document = region.ownerDocument,
): void {
  const mount = region.querySelector<HTMLElement>(
    '[data-atlas-inspector-mount]',
  )
  const prompt = region.querySelector<HTMLElement>(
    '[data-atlas-inspector-prompt]',
  )
  if (!mount) return

  prompt?.toggleAttribute('hidden', focus != null)
  mount.replaceChildren()
  if (!focus) {
    const announcement = region.querySelector<HTMLElement>(
      '[data-atlas-announcement]',
    )
    if (announcement) announcement.textContent = ''
    return
  }

  const model =
    focus.kind === 'node'
      ? nodeInspectorModel(payload, focus.key)
      : relationInspectorModel(payload, focus.key)

  const copy = panelCopy(payload.locale)
  const title = panelTitle(payload, focus)
  const panel = doc.createElement('section')
  panel.className = 'atlas-inspector__panel'
  const titleId =
    focus.kind === 'node'
      ? 'atlas-inspector-node-active'
      : 'atlas-inspector-relation-active'
  panel.setAttribute('aria-labelledby', titleId)
  if (focus.kind === 'node') {
    panel.setAttribute('data-atlas-inspector-node', focus.key)
  } else {
    panel.setAttribute('data-atlas-inspector-relation', focus.key)
  }

  const heading = doc.createElement('h3')
  heading.id = titleId
  heading.textContent = `${focus.kind === 'node' ? copy.node : copy.relation}: ${title}`
  panel.append(heading)
  appendSections(doc, panel, model)
  mount.append(panel)

  const announcement = region.querySelector<HTMLElement>(
    '[data-atlas-announcement]',
  )
  if (announcement) announcement.textContent = title
}
