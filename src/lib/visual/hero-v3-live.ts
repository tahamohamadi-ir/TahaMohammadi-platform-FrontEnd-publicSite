import {
  scenePaletteFromCss,
  type GraphSceneHandle,
  type ScenePayload,
} from './scene-contract'

const THEME_EVENT = 'tm-themechange'
const SCENE_EXTENT = 50

/** The CA-04 scene sizes nodes for coordinates near ±60. Presentation only. */
function fitToScene(payload: ScenePayload): ScenePayload {
  const extent = Math.max(
    1,
    ...payload.nodes.map((node) =>
      Math.max(Math.abs(node.x), Math.abs(node.y)),
    ),
  )
  const scale = SCENE_EXTENT / extent
  return {
    ...payload,
    nodes: payload.nodes.map((node) => ({
      ...node,
      x: node.x * scale,
      y: node.y * scale,
      z: node.z * scale,
    })),
  }
}

/** Branch highlighting on every constellation; the 3D upgrade only where allowed. */
export function mountHeroV3(root: HTMLElement): void {
  const highlight = mountHighlight(root)
  const canvas = root.querySelector('canvas')
  const raw = root.dataset.hv3Payload
  if (!canvas || !raw) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

  let payload: ScenePayload
  try {
    payload = fitToScene(JSON.parse(raw) as ScenePayload)
  } catch {
    return
  }

  const start = () =>
    void boot(root, canvas, payload).then((scene) => {
      if (scene) highlight.onSelect((id) => scene.setSelection(id))
    })
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return
    observer.disconnect()
    if ('requestIdleCallback' in window)
      requestIdleCallback(start, { timeout: 1500 })
    else setTimeout(start, 400)
  })
  observer.observe(root)
}

function mountHighlight(root: HTMLElement) {
  const listeners: ((id: string | null) => void)[] = []
  const members = [...root.querySelectorAll<Element>('[data-branch]')]
  const crossEdges = [...root.querySelectorAll<Element>('[data-kind="cross"]')]

  const apply = (label: HTMLElement | null) => {
    const branch = label?.dataset.branch ?? null
    for (const member of members)
      member.toggleAttribute(
        'data-hv3-dim',
        branch !== null && member.getAttribute('data-branch') !== branch,
      )
    for (const edge of crossEdges)
      edge.toggleAttribute('data-hv3-dim', branch !== null)
    const id = label?.dataset.nodeId ?? null
    for (const listener of listeners) listener(id)
  }

  const labelOf = (target: EventTarget | null) =>
    target instanceof Element
      ? target.closest<HTMLElement>('.hv3-const__label')
      : null

  root.addEventListener('pointerover', (event) => apply(labelOf(event.target)))
  root.addEventListener('pointerleave', () => apply(null))
  root.addEventListener('focusin', (event) => apply(labelOf(event.target)))
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget as Node | null)) apply(null)
  })

  return {
    onSelect: (listener: (id: string | null) => void) =>
      listeners.push(listener),
  }
}

async function boot(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  payload: ScenePayload,
): Promise<GraphSceneHandle | null> {
  const [{ createGraphScene }, { createGraphMotion }] = await Promise.all([
    import('./graph-scene'),
    import('./graph-motion'),
  ])

  const labels = new Map<string, HTMLElement>()
  for (const item of root.querySelectorAll<HTMLElement>('[data-node-id]')) {
    labels.set(item.dataset.nodeId!, item)
    item.dataset.posterStyle = item.getAttribute('style') ?? ''
  }
  const readPalette = () => {
    const styles = getComputedStyle(root)
    return scenePaletteFromCss((name) => styles.getPropertyValue(name).trim())
  }

  let failed = false
  let observer: ResizeObserver | null = null
  let motion: ReturnType<typeof createGraphMotion> | null = null

  const scene = createGraphScene({
    canvas,
    payload,
    palette: readPalette(),
    motion: 'full',
    selectedId: null,
    onFrame(projected) {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!width || !height) return
      for (const point of projected) {
        const item = labels.get(point.id)
        if (!item) continue
        item.style.left = `${(point.x / width) * 100}%`
        item.style.top = `${(point.y / height) * 100}%`
      }
    },
    onError(code) {
      failed = true
      root.dataset.hv3LiveError = code
      teardown()
    },
  })

  function teardown() {
    observer?.disconnect()
    motion?.dispose()
    scene.dispose()
    delete root.dataset.hv3LiveReady
    for (const item of labels.values())
      item.setAttribute('style', item.dataset.posterStyle ?? '')
  }

  if (failed) return null

  const resize = () => {
    const rect = canvas.getBoundingClientRect()
    scene.resize(rect.width, rect.height, window.devicePixelRatio || 1)
    scene.render()
  }
  observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  motion = createGraphMotion({
    scene,
    canvas,
    stage: root,
    labelsContainer: root.querySelector<HTMLElement>('.hv3-const__labels'),
    motionPreference: 'full',
  })
  root.dataset.hv3LiveReady = ''
  void motion.playSettle()

  window.addEventListener(THEME_EVENT, () => {
    scene.setPalette(readPalette())
    scene.render()
  })
  return {
    ...scene,
    setSelection(id) {
      scene.setSelection(id)
      scene.render()
    },
  }
}
