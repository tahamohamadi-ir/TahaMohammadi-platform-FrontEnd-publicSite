/**
 * Client entry for the About Atlas preview's availability recovery.
 *
 * The About preview ships no runtime script of its own — the full Atlas page
 * mounts `atlas-runtime.ts`, and About deliberately does not, because About
 * owns no canvas. But the preview showed the SAME production symptom as
 * /atlas/: the static build embeds `unavailable` when `PUBLIC_API_BASE_URL`
 * is empty, and with no recovery path `/en/about/` displayed "Atlas
 * unavailable" beside a perfectly valid knowledge map, while the page's own
 * CTA linked into an Atlas that said the same thing.
 *
 * This entry reuses `revalidate.ts` unchanged — same validator, same
 * single-request contract, same fail-closed behavior. It renders through the
 * EXISTING `AtlasProjection2d.astro` output rather than a second renderer,
 * and it is only emitted when the server-rendered preview is not ready.
 *
 * A visitor with JavaScript disabled keeps the honest server-rendered state.
 */
import { buildAboutPreviewHtml } from '../lib/atlas/presentation'
import {
  revalidateAtlasPayload,
  type AtlasFetchOutcome,
} from '../lib/visual/atlas/revalidate'

function previewRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-about-atlas]')
}

function bodyOf(region: HTMLElement): HTMLElement | null {
  return region.querySelector<HTMLElement>('[data-about-atlas-body]')
}

async function revalidateAboutPreview() {
  const region = previewRoot()
  if (!region) return
  if (region.getAttribute('data-atlas-revalidation')) return
  // The script is only emitted for a non-ready region, but never trust that
  // blindly: a ready preview must never be re-fetched.
  if (region.getAttribute('data-atlas-status') === 'ready') return
  const body = bodyOf(region)
  if (!body) return

  const locale = region.getAttribute('data-atlas-locale') === 'fa' ? 'fa' : 'en'
  region.setAttribute('data-atlas-revalidation', 'pending')

  const outcome: AtlasFetchOutcome = await revalidateAtlasPayload(locale)
  if (outcome.state !== 'ok') {
    // Every failure keeps the honest server-rendered state untouched.
    region.setAttribute('data-atlas-revalidation', outcome.state)
    return
  }

  body.innerHTML = buildAboutPreviewHtml(outcome.payload, locale)
  region.setAttribute('data-atlas-status', 'ready')
  region.setAttribute('data-atlas-contract', outcome.payload.contractVersion)
  region.setAttribute('data-atlas-revision', outcome.payload.version.revision)
  region.setAttribute('data-atlas-revalidation', 'recovered')
}

function run() {
  void revalidateAboutPreview().catch(() => {
    // Never break the page; the honest state stays.
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', run, { once: true })
} else {
  run()
}
