/**
 * Client entry for the public Atlas runtime (Plan C Task 23).
 * Bundled (NOT inline): static imports resolve to hashed `/_astro/` chunks,
 * so the browser never requests bare `lib/…` specifiers. The 3D scene stays
 * lazily imported — dynamic `import()` only on capable desktops — so mobile
 * never downloads three.js (cf. the Task 20 no-3D assertion on the static
 * graph of the wiring module, which this entry re-exports through).
 */
import { enhanceAtlasRegion } from '../lib/visual/atlas/enhancement'
import {
  createSelectionModel,
  type AtlasFocus,
  type SelectionModel,
} from '../lib/atlas/selection'
import type { AtlasPayload } from '../lib/atlas/model'
import {
  applyFocus,
  buildFocusUrl,
  parseFocus,
  readFocusFromLocation,
  resolveFocus,
} from '../lib/atlas/url-state'

function readPayload(region: Element) {
  try {
    const script = region.querySelector('#atlas-payload')
    if (!script?.textContent) return null
    return JSON.parse(script.textContent)
  } catch {
    return null
  }
}

function applySelectionToDom(
  region: Element,
  payload: AtlasPayload | null,
  focus: AtlasFocus | null,
) {
  try {
    const state = focus ? focus.kind : 'overview'
    region.setAttribute('data-atlas-state', state)
    // Inspector: exactly one block visible per selection, prompt otherwise.
    const blocks = region.querySelectorAll('[data-atlas-inspector-block]')
    const wanted = focus && payload ? `:${focus.key}` : null
    for (const block of blocks) {
      const key = block.getAttribute('data-atlas-inspector-block') ?? ''
      const show =
        wanted != null &&
        (key === `node${wanted}` || key === `relation${wanted}`)
      if (show) block.removeAttribute('hidden')
      else block.setAttribute('hidden', '')
    }
    // Announcer: one polite announcement per selection change.
    const announcer = region.querySelector('[data-atlas-announcer]')
    if (announcer && payload) {
      const nodeLabel =
        focus?.kind === 'node'
          ? (payload.nodes.find((n) => n.key === focus.key)?.label ?? focus.key)
          : null
      const label =
        nodeLabel ?? (focus?.kind === 'relation' ? (focus.key ?? '') : '')
      announcer.textContent = label || announcer.textContent
    }
  } catch {
    // DOM bookkeeping must never break the page.
  }
}

function selectFocus(
  region: Element,
  payload: AtlasPayload,
  model: SelectionModel,
  focus: AtlasFocus | null,
  { push = true } = {},
) {
  const resolved = resolveFocus(payload, focus)
  if (focus && !resolved) {
    // Unknown keys never invent content: stay on overview, drop the param.
    model.clear()
    applySelectionToDom(region, payload, null)
    try {
      applyFocus(window.history, window.location.href, null)
    } catch {
      // ignore
    }
    return null
  }
  if (!resolved) {
    model.clear()
    applySelectionToDom(region, payload, null)
    if (push) {
      try {
        applyFocus(window.history, window.location.href, null)
      } catch {
        // ignore
      }
    }
    return null
  }
  if (resolved.kind === 'node') model.selectNode(resolved.key)
  else model.selectRelation(resolved.key)
  applySelectionToDom(region, payload, resolved)
  if (push) {
    try {
      applyFocus(window.history, window.location.href, resolved)
    } catch {
      // ignore
    }
  }
  return resolved
}

function wireRegion(region: Element) {
  const payload = readPayload(region)
  if (!payload) return
  const model = createSelectionModel(payload)
  let opener: Element | null = null
  const openerOf = (event: Event | undefined) => {
    const target = (event as { target?: unknown } | undefined)?.target
    if (target instanceof Element) {
      const control = target.closest('button, a[href], input, summary')
      return control ?? null
    }
    return null
  }

  // Initial focus from the URL (deep links resolve on load).
  selectFocus(region, payload, model, readFocusFromLocation(window.location), {
    push: false,
  })

  // Search: first hit selects through the same transition.
  const search = region.querySelector('[data-atlas-search]')
  const commitSearch = async (value: string) => {
    try {
      const { buildSearchIndex } = await import('../lib/atlas/search')
      const hits = buildSearchIndex(payload).search(value, { limit: 1 })
      const hit = hits[0]
      if (!hit) {
        selectFocus(region, payload, model, null)
        return
      }
      selectFocus(
        region,
        payload,
        model,
        hit.kind === 'node'
          ? { kind: 'node', key: hit.key }
          : { kind: 'relation', key: hit.key },
      )
    } catch {
      // Search never breaks the page.
    }
  }
  search?.addEventListener('change', (event) => {
    opener = openerOf(event)
    void commitSearch((event?.target as HTMLInputElement)?.value ?? '')
  })
  // Enter inside a search input fires `change` inconsistently across
  // browsers; the explicit key path keeps keyboard search reliable.
  search?.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent)?.key !== 'Enter') return
    opener = openerOf(event)
    void commitSearch((event?.target as HTMLInputElement)?.value ?? '')
  })

  // Filters: dim-first membership, topology untouched.
  const chips = region.querySelectorAll('[data-atlas-filter]')
  chips.forEach((chip) => {
    chip.addEventListener('click', async (event) => {
      try {
        const key = chip.getAttribute('data-atlas-filter')
        opener = openerOf(event)
        for (const other of chips) {
          other.setAttribute('aria-pressed', other === chip ? 'true' : 'false')
        }
        const { filterSet } = await import('../lib/atlas/filters')
        const members = key === 'all' ? null : filterSet(payload, key ?? '')
        const nodes = region.querySelectorAll('[data-atlas-node]')
        for (const item of nodes) {
          const itemKey = item.getAttribute('data-atlas-node') ?? ''
          const dim = members != null && !members.has(itemKey)
          item.toggleAttribute('data-atlas-dimmed', dim)
        }
      } catch {
        // Filters never break the page.
      }
    })
  })

  // View controls: overview / neighbourhood / clear (+ Escape).
  region
    .querySelector('[data-atlas-overview]')
    ?.addEventListener('click', (event) => {
      opener = openerOf(event)
      selectFocus(region, payload, model, null)
    })
  region
    .querySelector('[data-atlas-neighbourhood]')
    ?.addEventListener('click', () => {
      // The neighbourhood projection is server-rendered per focus; the
      // client re-frames by re-resolving the same selection (no topology
      // change, no 3D import).
      const current = parseFocus(window.location.search)
      if (current) selectFocus(region, payload, model, current)
    })
  region
    .querySelector('[data-atlas-clear]')
    ?.addEventListener('click', (event) => {
      opener = openerOf(event)
      selectFocus(region, payload, model, null)
    })
  region.addEventListener('keydown', (event) => {
    if ((event as KeyboardEvent)?.key !== 'Escape') return
    try {
      ;(event as KeyboardEvent).preventDefault()
      selectFocus(region, payload, model, null)
      ;(
        opener as unknown as {
          focus(o?: { preventScroll?: boolean }): void
        } | null
      )?.focus?.({
        preventScroll: true,
      })
    } catch {
      // ignore
    }
  })

  // Back/Forward: re-apply the URL focus without a reload.
  window.addEventListener('popstate', () => {
    try {
      selectFocus(
        region,
        payload,
        model,
        readFocusFromLocation(window.location),
        { push: false },
      )
    } catch {
      // ignore
    }
  })
}

function enhanceAtlas() {
  const region = document.querySelector(
    '[data-atlas-region][data-atlas-status="ready"]',
  )
  if (!(region instanceof HTMLElement)) return
  wireRegion(region)
  // Desktop 3D on capable viewports; the orchestrator falls back to 2D
  // honestly on every failure. dispose-all on page leave.
  const run = () => {
    void enhanceAtlasRegion(region, {
      location: { search: window.location.search },
      onSelection: (focus) => {
        const payload = readPayload(region)
        if (!payload) return
        const model = createSelectionModel(payload)
        selectFocus(region, payload, model, focus, { push: false })
      },
      loadScene: () => import('../lib/visual/atlas/scene'),
      reducedMotion: {
        matches: Boolean(
          window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
        ),
      },
      onMotionChange: () => {},
    })
      .then((handle) => {
        window.addEventListener(
          'pagehide',
          () => {
            try {
              handle.dispose()
            } catch {
              // ignore
            }
          },
          { once: true },
        )
      })
      .catch(() => {})
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true })
  } else {
    run()
  }
  void buildFocusUrl
}

enhanceAtlas()
