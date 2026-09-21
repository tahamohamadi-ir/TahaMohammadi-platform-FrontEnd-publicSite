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
import { project2d } from './projection-2d'
import { projectionSvgHtml } from './projection-svg'
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

/** 2D SVG markup for a ready payload through the shared renderer. */
export function buildProjectionHtml(payload: AtlasPayload): string {
  const projection = project2d(payload, {
    mode: 'mobile-overview',
    viewport: { width: 390, height: 520 },
    focusKey: null,
  })
  return `<div class="atlas__projection" data-atlas-2d>${projectionSvgHtml(projection, 'mobile-overview')}</div>`
}

/** Body HTML under the Atlas header — semantic index or honest state. */
export function buildSharedAtlasBodyHtml(
  locale: 'en' | 'fa',
  snapshot: AtlasSnapshot,
): string {
  if (snapshot.status === 'ready') {
    const index = buildIndexHtml(locale, snapshot.html)
    const projection = buildProjectionHtml(snapshot.payload)
    const payload = serializeAtlasPayload(snapshot.payload)
    const revision = escapeHtml(snapshot.payload.version.revision)
    return `${index}${projection}<script id="atlas-payload" type="application/json" data-atlas-revision="${revision}">${payload}</script>`
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
