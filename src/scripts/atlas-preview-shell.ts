/**
 * Client entry for the draft-preview shell (Plan C Task 8).
 * Stage order is fixed: strip fragment → Bearer fetch → shared presentation.
 * Does not attach Task-7 runtime refresh.
 */
import {
  consumePreviewFragment,
  fetchPreviewSnapshot,
} from '../lib/atlas/preview'
import { applyPreviewPresentation } from '../lib/atlas/presentation'

function localeFromPath(pathname: string): 'en' | 'fa' {
  return pathname.startsWith('/fa/') ? 'fa' : 'en'
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
  applyPreviewPresentation(region, locale, result)
}

const region = document.querySelector<HTMLElement>('[data-atlas-region]')
if (region) {
  void bootAtlasPreviewShell(region)
}
