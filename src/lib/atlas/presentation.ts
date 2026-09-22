/** Shared Atlas body presentation (Plan C Tasks 6/8/13).
 *
 * One HTML builder for the semantic index / 2D projection / honest states so
 * the public Atlas route and the draft-preview shell render through the same
 * markup path. Authorization and fetch stay outside this module.
 */

import {
  snapshotFromPreviewResult,
  type PreviewSnapshotResult,
} from './preview'
import { selectOverviewNodes } from './projection-2d'
import { projectionSvgHtml } from './projection-svg'
import {
  neighbourhoodKeys,
  projectNodesForKeys,
} from './projection-neighbourhood'
import { filterOptions } from './filters'
import {
  nodeInspectorModel,
  relationInspectorModel,
  type AtlasInspectorModel,
} from './inspector'
import type { AtlasPayload } from './model'
import {
  serializeAtlasPayload,
  type AtlasIndexModel,
  type AtlasSnapshot,
} from './snapshot'

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function indexCopy(locale: 'en' | 'fa') {
  return locale === 'en'
    ? { nodes: 'Domains & works', relations: 'Relations', groups: 'Groups' }
    : { nodes: 'حوزه‌ها و آثار', relations: 'رابطه‌ها', groups: 'گروه‌ها' }
}

function stateCopy(locale: 'en' | 'fa') {
  return locale === 'en'
    ? {
        unavailableTitle: 'Atlas unavailable',
        unavailableMessage: 'The Atlas has no published version right now.',
        invalidTitle: 'Atlas data failed validation',
        invalidMessage:
          'The published Atlas data failed validation, so nothing is shown.',
      }
    : {
        unavailableTitle: 'اطلس در دسترس نیست',
        unavailableMessage: 'در حال حاضر نسخه منتشرشده‌ای از اطلس وجود ندارد.',
        invalidTitle: 'داده اطلس اعتبارسنجی نشد',
        invalidMessage:
          'داده منتشرشده اطلس اعتبارسنجی نشد، پس چیزی نمایش داده نمی‌شود.',
      }
}

function buildIndexHtml(locale: 'en' | 'fa', html: AtlasIndexModel): string {
  const copy = indexCopy(locale)
  const nodes = html.nodes
    .map((node) => {
      const label = escapeHtml(node.label)
      const key = escapeHtml(node.key)
      const inner = node.href
        ? `<a class="atlas-index__link" href="${escapeHtml(node.href)}">${label}</a>`
        : `<span class="atlas-index__label">${label}</span>`
      return `<li class="atlas-index__node" data-atlas-node="${key}">${inner}</li>`
    })
    .join('')
  const relations = html.relations
    .map((relation) => {
      const key = escapeHtml(relation.key)
      const source = escapeHtml(relation.sourceLabel)
      const target = escapeHtml(relation.targetLabel)
      return `<li class="atlas-index__relation" data-atlas-relation="${key}"><span class="atlas-index__endpoint">${source}</span><span class="atlas-index__arrow" aria-hidden="true"> → </span><span class="atlas-index__endpoint">${target}</span></li>`
    })
    .join('')
  const groups = html.groups
    .map((group) => {
      const key = escapeHtml(group.key)
      const label = escapeHtml(group.label)
      const members = group.nodeKeys
        .map(
          (member) =>
            `<li class="atlas-index__member" data-atlas-member="${escapeHtml(member)}">${escapeHtml(member)}</li>`,
        )
        .join('')
      return `<section class="atlas-index__group" data-atlas-group="${key}"><h2 class="atlas-index__heading">${label}</h2><ul class="atlas-index__members">${members}</ul></section>`
    })
    .join('')
  return `<div class="atlas-index"><h2 class="atlas-index__heading">${escapeHtml(copy.nodes)}</h2><ul class="atlas-index__nodes" data-atlas-nodes>${nodes}</ul><h2 class="atlas-index__heading">${escapeHtml(copy.relations)}</h2><ol class="atlas-index__relations" data-atlas-relations>${relations}</ol>${groups}</div>`
}

function buildStateHtml(
  locale: 'en' | 'fa',
  variant: 'empty' | 'error',
): string {
  const copy = stateCopy(locale)
  const title = variant === 'empty' ? copy.unavailableTitle : copy.invalidTitle
  const message =
    variant === 'empty' ? copy.unavailableMessage : copy.invalidMessage
  return `<div class="content-state content-state--${variant}" data-content-state="${variant}"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p></div>`
}

/** 2D SVG markup for a ready payload through the shared renderer.
 *
 * `focusKey` selects the neighbourhood view (neighbourhood union when the
 * focus resolves to a node; overview + focus when it does not). The return
 * carries the resolved view so callers can label the state honestly. */
export function buildProjectionHtml(payload: AtlasPayload): {
  html: string
  view: 'overview' | 'neighbourhood'
}
export function buildProjectionHtml(
  payload: AtlasPayload,
  focusKey?: string | null,
): { html: string; view: 'overview' | 'neighbourhood' } {
  const focus =
    typeof focusKey === 'string' && focusKey.length > 0 ? focusKey : null
  const neighbourhood = focus ? neighbourhoodKeys(payload, focus) : null
  const view: 'overview' | 'neighbourhood' = neighbourhood
    ? 'neighbourhood'
    : 'overview'
  const selected =
    neighbourhood ?? selectOverviewNodes(payload, { mode: 'mobile-overview' })
  const projection = projectNodesForKeys(payload, selected, focus, {
    width: 390,
    height: 520,
  })
  return {
    html: `<div class="atlas__projection" data-atlas-2d data-atlas-view="${view}">${projectionSvgHtml(projection, 'mobile-overview')}</div>`,
    view,
  }
}

function buildInspectorHtml(
  locale: 'en' | 'fa',
  payload: AtlasPayload,
): string {
  const prompt =
    locale === 'en'
      ? 'Select a node or relation to inspect it.'
      : 'برای بررسی، یک گره یا رابطه را انتخاب کنید.'
  const blocks: string[] = []
  for (const node of payload.nodes) {
    const model = nodeInspectorModel(payload, node.key, locale)
    blocks.push(inspectorBlockHtml(`node:${node.key}`, model))
  }
  for (const relation of payload.relations) {
    const model = relationInspectorModel(payload, relation.key, locale)
    blocks.push(inspectorBlockHtml(`relation:${relation.key}`, model))
  }
  return `<div class="atlas-inspector" data-atlas-inspector><p class="atlas-inspector__announcer" data-atlas-announcer role="status" aria-live="polite">${escapeHtml(prompt)}</p><p class="atlas-inspector__prompt" data-atlas-inspector-prompt>${escapeHtml(prompt)}</p>${blocks.join('')}</div>`
}

function inspectorBlockHtml(
  blockKey: string,
  model: AtlasInspectorModel,
): string {
  const sections = model.sections
    .map((section) => {
      const items = section.items
        .map((item) => {
          const inner = item.href
            ? `<a class="atlas-inspector__link" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`
            : `<span class="atlas-inspector__label">${escapeHtml(item.label)}</span>`
          const relation = item.relationLabel
            ? ` <span class="atlas-inspector__relation"> — ${escapeHtml(item.relationLabel)}</span>`
            : ''
          return `<li class="atlas-inspector__item">${inner}${relation}</li>`
        })
        .join('')
      return `<section class="atlas-inspector__section" data-atlas-section="${escapeHtml(section.id)}"><h3 class="atlas-inspector__heading">${escapeHtml(section.heading)}</h3><ul class="atlas-inspector__items">${items}</ul></section>`
    })
    .join('')
  return `<article class="atlas-inspector__block" data-atlas-inspector-block="${escapeHtml(blockKey)}" hidden>${sections}</article>`
}

function buildControlsHtml(locale: 'en' | 'fa', payload: AtlasPayload): string {
  const copy =
    locale === 'en'
      ? {
          searchLabel: 'Search the Atlas',
          searchPlaceholder: 'Search nodes and relations…',
          filtersLabel: 'Filter by type',
          all: 'All',
          viewLabel: 'View controls',
          neighbourhood: 'View neighbourhood',
          zoomIn: 'Zoom in',
          zoomOut: 'Zoom out',
          focus: 'Focus',
          reset: 'Reset',
          clear: 'Clear',
          overview: 'Back to overview',
        }
      : {
          searchLabel: 'جست‌وجو در اطلس',
          searchPlaceholder: 'جست‌وجوی گره‌ها و رابطه‌ها…',
          filtersLabel: 'پالایش بر اساس نوع',
          all: 'همه',
          viewLabel: 'کنترل‌های نما',
          neighbourhood: 'نمایش همسایگی',
          zoomIn: 'بزرگ‌نمایی',
          zoomOut: 'کوچک‌نمایی',
          focus: 'تمرکز',
          reset: 'بازنشانی',
          clear: 'پاک کردن',
          overview: 'بازگشت به نمای کلی',
        }
  const chips = filterOptions(payload)
    .map(
      (option) =>
        `<button class="atlas-controls__chip" data-atlas-filter="${escapeHtml(option.key)}" type="button" aria-pressed="false">${escapeHtml(option.label)} (${option.count})</button>`,
    )
    .join('')
  const buttons: Array<[string, string]> = [
    ['data-atlas-neighbourhood', copy.neighbourhood],
    ['data-atlas-zoom-in', copy.zoomIn],
    ['data-atlas-zoom-out', copy.zoomOut],
    ['data-atlas-focus', copy.focus],
    ['data-atlas-reset', copy.reset],
    ['data-atlas-clear', copy.clear],
    ['data-atlas-overview', copy.overview],
  ]
  const view = buttons
    .map(
      ([attr, label]) =>
        `<button class="atlas-controls__button" ${attr} type="button">${escapeHtml(label)}</button>`,
    )
    .join('')
  return `<div class="atlas-controls" data-atlas-controls><div class="atlas-controls__search"><label class="atlas-controls__label" for="atlas-search">${escapeHtml(copy.searchLabel)}</label><input id="atlas-search" class="atlas-controls__input" data-atlas-search type="search" name="q" autocomplete="off" placeholder="${escapeHtml(copy.searchPlaceholder)}"/></div><fieldset class="atlas-controls__filters"><legend class="atlas-controls__label">${escapeHtml(copy.filtersLabel)}</legend><button class="atlas-controls__chip" data-atlas-filter="all" type="button" aria-pressed="true">${escapeHtml(copy.all)}</button>${chips}</fieldset><div class="atlas-controls__view" role="group" aria-label="${escapeHtml(copy.viewLabel)}">${view}</div></div>`
}

/** Body HTML under the Atlas header — semantic index or honest state. */
export function buildSharedAtlasBodyHtml(
  locale: 'en' | 'fa',
  snapshot: AtlasSnapshot,
): string {
  if (snapshot.status === 'ready') {
    const index = buildIndexHtml(locale, snapshot.html)
    const projection = buildProjectionHtml(snapshot.payload).html
    const controls = buildControlsHtml(locale, snapshot.payload)
    const inspector = buildInspectorHtml(locale, snapshot.payload)
    const payload = serializeAtlasPayload(snapshot.payload)
    const revision = escapeHtml(snapshot.payload.version.revision)
    return `${controls}${index}${projection}${inspector}<script id="atlas-payload" type="application/json" data-atlas-revision="${revision}">${payload}</script>`
  }
  if (snapshot.status === 'unavailable') {
    return buildStateHtml(locale, 'empty')
  }
  return buildStateHtml(locale, 'error')
}

export interface PreviewRegionLike {
  dataset: DOMStringMap | Record<string, string | undefined>
  querySelector(selectors: string): { innerHTML: string } | null
}

/**
 * Stage 3 — apply a preview result onto an already-mounted Atlas region.
 * Preserves the header; replaces `[data-atlas-body]` with shared markup.
 */
export function applyPreviewPresentation(
  region: PreviewRegionLike,
  locale: 'en' | 'fa',
  result: PreviewSnapshotResult,
): void {
  const snapshot = snapshotFromPreviewResult(result)
  region.dataset.atlasPreview = result.preview ? 'true' : 'false'
  region.dataset.atlasStatus = snapshot.status
  region.dataset.atlasPresentation = 'list'

  if (snapshot.status === 'ready') {
    region.dataset.atlasRevision = snapshot.payload.version.revision
    if (snapshot.etag) region.dataset.atlasEtag = snapshot.etag
    else delete region.dataset.atlasEtag
  } else {
    delete region.dataset.atlasRevision
    delete region.dataset.atlasEtag
  }

  const body = region.querySelector('[data-atlas-body]')
  if (!body) return
  body.innerHTML = buildSharedAtlasBodyHtml(locale, snapshot)
}
