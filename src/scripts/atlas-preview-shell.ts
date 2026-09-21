/**
 * Client entry for the draft-preview shell (Plan C Task 8).
 * Stage order is fixed: strip fragment → Bearer fetch → shared region update.
 * Does not attach Task-7 runtime refresh.
 */
import {
  consumePreviewFragment,
  fetchPreviewSnapshot,
  snapshotFromPreviewResult,
} from '../lib/atlas/preview'
import { serializeAtlasPayload } from '../lib/atlas/snapshot'

function localeFromPath(pathname: string): 'en' | 'fa' {
  return pathname.startsWith('/fa/') ? 'fa' : 'en'
}

function applySnapshot(
  region: HTMLElement,
  result: Awaited<ReturnType<typeof fetchPreviewSnapshot>>,
) {
  const snapshot = snapshotFromPreviewResult(result)
  region.dataset.atlasPreview = result.preview ? 'true' : 'false'
  region.dataset.atlasStatus = snapshot.status
  region.dataset.atlasPresentation = 'list'

  if (snapshot.status === 'ready') {
    region.dataset.atlasRevision = snapshot.payload.version.revision
    if (snapshot.etag) region.dataset.atlasEtag = snapshot.etag
    else delete region.dataset.atlasEtag

    let payloadScript = region.querySelector('#atlas-payload')
    if (!payloadScript) {
      payloadScript = document.createElement('script')
      payloadScript.id = 'atlas-payload'
      payloadScript.type = 'application/json'
      region.appendChild(payloadScript)
    }
    payloadScript.setAttribute(
      'data-atlas-revision',
      snapshot.payload.version.revision,
    )
    payloadScript.textContent = serializeAtlasPayload(snapshot.payload)
    return
  }

  delete region.dataset.atlasRevision
  delete region.dataset.atlasEtag
  region.querySelector('#atlas-payload')?.remove()
}

export async function bootAtlasPreviewShell(
  region: HTMLElement,
  deps: {
    history?: Pick<History, 'replaceState'>
    location?: Pick<Location, 'hash' | 'pathname' | 'search'>
    fetchFn?: typeof fetch
  } = {},
): Promise<void> {
  const historyRef = deps.history ?? window.history
  const locationRef = deps.location ?? window.location
  const capability = consumePreviewFragment(historyRef, locationRef)
  const locale = localeFromPath(locationRef.pathname)
  const result = await fetchPreviewSnapshot(locale, capability, {
    fetch: deps.fetchFn ?? fetch,
  })
  applySnapshot(region, result)
}

const region = document.querySelector<HTMLElement>('[data-atlas-region]')
if (region) {
  void bootAtlasPreviewShell(region)
}
