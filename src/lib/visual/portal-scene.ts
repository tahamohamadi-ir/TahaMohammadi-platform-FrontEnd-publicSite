/**
 * PW-01 — Approved v1.3.1 portal GLB scene for the language gateway.
 *
 * The Blender/export stage is the visual source of truth
 * (`Design-Assets/portal/spec/portal_export_manifest.json`,
 * `portal_runtime_spec.json`). This module loads the exported GLB once,
 * rebuilds the runtime-only parts that were intentionally excluded from the
 * GLB (light rig, floor plane, atmosphere gradient, beacon halo), and
 * interpolates the two approved themes without a second asset:
 *
 * - Stone: baked dark baseColor is embedded in the GLB; the approved light
 *   baseColor companion JPEG loads alongside and is swapped on theme change.
 * - Lines/nodes/beacon/gold: per-theme emissive constants; the baked
 *   `LineFalloff` vertex color (COLOR_0 alpha) multiplies emissive so the
 *   depth falloffs survive without the Blender shader.
 * - At the language gateway the scene is decorative: the canvas is
 *   `aria-hidden`, semantic links never wait for it, and every failure path
 *   (load, shader, context loss, frame budget) leaves the raster fallback
 *   in place.
 *
 * Rendering is strictly on demand: resize, theme swap, pointer pose, and the
 * bounded entrance arrival re-render; there is no always-running loop.
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  SCENE_PERFORMANCE_CEILINGS,
  type SceneMotionPreference,
  type ScenePalette,
} from './scene-contract'

export const PORTAL_SCENE_VERSION = 'pw1-1.0.0'

export type PortalErrorCode =
  | 'webgl-unavailable'
  | 'import-rejected'
  | 'context-lost'
  | 'frame-budget-exceeded'

export type PortalTheme = 'dark' | 'light'

/** Runtime assets served from `public/portal` (PW-1 FROZEN: v1.4 with
 *  lossless normal/roughness; v1.3.1, v1.4-preview and v1.4-preview2 are
 *  retained in the folder for provenance/revert). */
export const PORTAL_ASSETS = {
  glb: '/portal/tahamohammadi-portal-v1.4.glb',
  lightMap: '/portal/portal_stone_basecolor_light.jpg',
} as const

export interface PortalSceneOptions {
  canvas: HTMLCanvasElement
  palette: ScenePalette
  motion: SceneMotionPreference
  onError?: (code: PortalErrorCode) => void
  glbUrl?: string
  lightMapUrl?: string
}

export interface PortalSceneHandle {
  render(): void
  resize(width: number, height: number, pixelRatio: number): void
  setPalette(palette: ScenePalette): void
  setMotion(motion: SceneMotionPreference): void
  setPose(x: number, y: number): void
  setOrbitPhase(phase: number): void
  setSuspended(suspended: boolean): void
  dispose(): void
}

function srgb(rgb: readonly [number, number, number]): THREE.Color {
  return new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace)
}

function localWebGLAvailable(canvas: HTMLCanvasElement): boolean {
  try {
    return Boolean(window.WebGLRenderingContext && canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

/** Site palette carries the resolved theme: dark canvas luminance wins. */
export function portalThemeFromPalette(palette: ScenePalette): PortalTheme {
  try {
    const { l } = new THREE.Color(palette.canvas).getHSL({ h: 0, s: 0, l: 0 })
    return l < 0.25 ? 'dark' : 'light'
  } catch {
    return 'dark'
  }
}

/**
 * Composition-aware framing for the full-viewport gateway (PW-01.1).
 *
 * The camera no longer "fits the asset into a slot": it composes the portal
 * into the whole viewport. The portal body occupies a deliberate fraction of
 * the frame width (wider fraction on narrow viewports where crop is
 * allowed), the threshold line is anchored around two thirds down, and the
 * portal body is clamped to 34–62% of the frame height so there is room for
 * the brand above and the language controls below. All pure math: unit-tested.
 */
export const PORTAL_COMPOSITION = {
  verticalFovDeg: 22.9,
  /** Facade half width in meters (portal body, towers included). */
  halfWidth: 7.6,
  /** True gable-tip height in meters, used for the height clamp. */
  top: 12.0,
  minHeightPortion: 0.34,
  maxHeightPortion: 0.7,
  minDistance: 34,
  maxDistance: 120,
} as const

/** Portal body width as a fraction of frame width, by viewport aspect. */
export function portalWidthFraction(aspect: number): number {
  if (aspect >= 1.5) return 0.52
  if (aspect >= 0.75) return 0.52 + ((1.5 - aspect) * (0.72 - 0.52)) / 0.75
  return Math.min(0.95, 0.72 + ((0.75 - aspect) * (0.95 - 0.72)) / 0.25)
}

/** Screen fraction (from top) where the ground threshold line sits. */
export function portalThresholdAnchor(aspect: number): number {
  return Math.min(0.75, Math.max(0.72, 0.72 + (1.5 - aspect) * 0.02))
}

export interface PortalFrame {
  /** Camera distance for the composed frame. */
  distance: number
  /** Camera height / gaze height (threshold anchor applied). */
  centerY: number
  /** Effective portal body width as a fraction of the frame width. */
  widthFraction: number
}

export function portalFrame(aspect: number): PortalFrame {
  const safeAspect = Math.max(aspect, 0.2)
  const vFov = THREE.MathUtils.degToRad(PORTAL_COMPOSITION.verticalFovDeg)
  const portalWidth = PORTAL_COMPOSITION.halfWidth * 2
  let frameWidth =
    portalWidth / Math.max(portalWidthFraction(safeAspect), 0.2)
  let frameHeight = frameWidth / safeAspect
  const minFrameHeight = PORTAL_COMPOSITION.top / PORTAL_COMPOSITION.maxHeightPortion
  const maxFrameHeight = PORTAL_COMPOSITION.top / PORTAL_COMPOSITION.minHeightPortion
  frameHeight = THREE.MathUtils.clamp(
    frameHeight,
    minFrameHeight,
    maxFrameHeight,
  )
  frameWidth = frameHeight * safeAspect
  const distance = THREE.MathUtils.clamp(
    frameHeight / (2 * Math.tan(vFov / 2)),
    PORTAL_COMPOSITION.minDistance,
    PORTAL_COMPOSITION.maxDistance,
  )
  const centerY =
    (portalThresholdAnchor(safeAspect) - 0.5) *
    (2 * distance * Math.tan(vFov / 2))
  return {
    distance,
    centerY,
    widthFraction: portalWidth / frameWidth,
  }
}

interface ThemeSpec {
  background: readonly [number, number, number]
  atmosphere: {
    edge: readonly [number, number, number]
    mid: readonly [number, number, number]
    glow: readonly [number, number, number]
    strength: number
  }
  exposure: number
  fog: { color: readonly [number, number, number]; density: number }
  environmentIntensity: number
  stoneRoughnessBoost: number
  stoneEnv: number
  hemi: {
    sky: readonly [number, number, number]
    ground: readonly [number, number, number]
    intensity: number
  }
  key: {
    color: readonly [number, number, number]
    intensity: number
    position: readonly [number, number, number]
    castShadow: boolean
  }
  sun: {
    color: readonly [number, number, number]
    intensity: number
    position: readonly [number, number, number]
    castShadow: boolean
  }
  rim: {
    color: readonly [number, number, number]
    intensity: number
    position: readonly [number, number, number]
  }
  threshold: { color: readonly [number, number, number]; intensity: number }
  pool: { color: readonly [number, number, number]; intensity: number }
  bounce: { color: readonly [number, number, number]; intensity: number }
  coreNear: { color: readonly [number, number, number]; intensity: number }
  passageMid: { color: readonly [number, number, number]; intensity: number }
  deep: { color: readonly [number, number, number]; intensity: number }
  beaconHalo: number
  poolHalo: number
  emissive: Record<string, number>
  nodeDarkBase: readonly [number, number, number]
  inlayBase: readonly [number, number, number]
  coreColor: readonly [number, number, number]
}

/** Approved runtime constants (portal_runtime_spec.json themes). */
const THEMES: Record<PortalTheme, ThemeSpec> = {
  dark: {
    background: [0.0275, 0.0706, 0.1451],
    atmosphere: {
      edge: [0.002, 0.005, 0.012],
      mid: [0.016, 0.05, 0.095],
      glow: [0.05, 0.2, 0.34],
      strength: 0.42,
    },
    exposure: 1.05,
    fog: { color: [0.0275, 0.0706, 0.1451], density: 0.0058 },
    environmentIntensity: 0.45,
    stoneRoughnessBoost: 1.0,
    stoneEnv: 0.45,
    hemi: {
      sky: [0.34, 0.46, 0.8],
      ground: [0.004, 0.0075, 0.016],
      intensity: 0.2,
    },
    key: {
      color: [1.0, 0.95, 0.9],
      intensity: 1.8,
      position: [-18, 11.5, 20],
      castShadow: true,
    },
    sun: {
      color: [1.0, 0.9, 0.78],
      intensity: 0,
      position: [26, 38, 26],
      castShadow: false,
    },
    rim: {
      color: [0.55, 0.7, 1.0],
      intensity: 0.5,
      position: [10, 9, -14],
    },
    threshold: { color: [1.0, 0.78, 0.5], intensity: 90 },
    pool: { color: [1.0, 0.7, 0.42], intensity: 26 },
    bounce: { color: [1.0, 0.74, 0.48], intensity: 16 },
    coreNear: { color: [1.0, 0.9, 0.75], intensity: 30 },
    passageMid: { color: [0.78, 0.84, 1.0], intensity: 14 },
    deep: { color: [0.42, 0.62, 0.95], intensity: 30 },
    beaconHalo: 0.85,
    poolHalo: 0.35,
    emissive: {
      goldLine: 1.45,
      goldLineMid: 0.943,
      floor: 0.35,
      deep: 0.42,
      faint: 0.26,
      ghost: 0.13,
      nodeGold: 1.6,
      nodeBlue: 1.6,
      nodeViolet: 1.6,
      core: 21,
      streak: 0.85,
      inlay: 0.25,
    },
    nodeDarkBase: [0.06, 0.065, 0.085],
    inlayBase: [0.45, 0.27, 0.075],
    coreColor: [1.0, 0.95, 0.86],
  },
  light: {
    background: [0.96, 0.94, 0.89],
    atmosphere: {
      edge: [0.985, 0.972, 0.945],
      mid: [0.992, 0.98, 0.955],
      glow: [1.0, 0.986, 0.955],
      strength: 0.24,
    },
    exposure: 1.0,
    fog: { color: [0.96, 0.94, 0.89], density: 0.005 },
    environmentIntensity: 0.75,
    stoneRoughnessBoost: 1.08,
    stoneEnv: 0.75,
    hemi: {
      sky: [1.0, 0.95, 0.85],
      ground: [0.75, 0.7, 0.62],
      intensity: 0.4,
    },
    key: {
      color: [1.0, 0.95, 0.88],
      intensity: 1.2,
      position: [-22, 10, 16],
      castShadow: false,
    },
    sun: {
      color: [1.0, 0.9, 0.78],
      intensity: 3.2,
      position: [26, 38, 26],
      castShadow: true,
    },
    rim: {
      color: [1.0, 0.97, 0.9],
      intensity: 0,
      position: [10, 9, -14],
    },
    threshold: { color: [1.0, 0.85, 0.62], intensity: 40 },
    pool: { color: [1.0, 0.88, 0.7], intensity: 8 },
    bounce: { color: [1.0, 0.85, 0.65], intensity: 6 },
    coreNear: { color: [1.0, 0.93, 0.8], intensity: 22 },
    passageMid: { color: [0.85, 0.9, 1.0], intensity: 9 },
    deep: { color: [0.95, 0.97, 1.0], intensity: 30 },
    beaconHalo: 0.3,
    poolHalo: 0.045,
    emissive: {
      goldLine: 0.38,
      goldLineMid: 0.247,
      floor: 0.2,
      deep: 0.1,
      faint: 0.1,
      ghost: 0.08,
      nodeGold: 0.35,
      nodeBlue: 0.35,
      nodeViolet: 0.35,
      core: 24,
      streak: 1.0,
      inlay: 0.1,
    },
    nodeDarkBase: [0.66, 0.64, 0.6],
    inlayBase: [0.5, 0.315, 0.095],
    coreColor: [1.0, 0.93, 0.8],
  },
}

/** Emissive color per role (sRGB display values from the export manifest). */
const EMISSIVE_COLORS: Record<string, readonly [number, number, number]> = {
  goldLine: [1.0, 0.76, 0.4],
  goldLineMid: [1.0, 0.76, 0.4],
  floor: [1.0, 0.72, 0.38],
  deep: [1.0, 0.78, 0.45],
  faint: [0.55, 0.78, 0.95],
  ghost: [0.55, 0.78, 0.95],
  nodeGold: [1.0, 0.72, 0.3],
  nodeBlue: [0.35, 0.78, 1.0],
  nodeViolet: [0.58, 0.5, 1.0],
  inlay: [1.0, 0.78, 0.45],
  streak: [1.0, 0.9, 0.74],
  core: [1.0, 0.95, 0.86],
}

const MATERIAL_ROLES: Record<string, { emissive?: string; vertexFalloff?: boolean }> = {
  Web_GoldLine: { emissive: 'goldLine', vertexFalloff: true },
  Web_GoldLineMid: { emissive: 'goldLineMid', vertexFalloff: true },
  Web_FloorLine: { emissive: 'floor', vertexFalloff: true },
  Web_DeepLine: { emissive: 'deep', vertexFalloff: true },
  Web_DeepLineFaint: { emissive: 'faint', vertexFalloff: true },
  Web_DeepLineGhost: { emissive: 'ghost', vertexFalloff: true },
  Web_NodeGold: { emissive: 'nodeGold' },
  Web_NodeBlue: { emissive: 'nodeBlue' },
  Web_NodeViolet: { emissive: 'nodeViolet' },
  Web_NodeDark: {},
  Web_GoldInlay: { emissive: 'inlay' },
  Web_Core: { emissive: 'core' },
  Web_Streak: { emissive: 'streak' },
}

const STONE_MATERIALS = [
  'Web_StoneMain',
  'Web_StoneInner',
  'Web_PassageStone',
  'Web_PassageStoneDeep',
  'Web_PassageFloor',
  'Web_PassageFloorDeep',
] as const

const STONE_ROUGHNESS_BOOST: Record<string, number> = {
  Web_StoneMain: 1.06,
  Web_StoneInner: 1.06,
  Web_PassageStone: 1.08,
  Web_PassageStoneDeep: 1.08,
  Web_PassageFloor: 1.12,
  Web_PassageFloorDeep: 1.12,
}

function patchEmissiveFalloff(material: THREE.Material): void {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n#ifdef USE_COLOR_ALPHA\n\ttotalEmissiveRadiance *= vColor.a;\n#endif',
    )
  }
  material.customProgramCacheKey = () => 'portal-emissive-falloff'
}

/** Analytic studio environment: real broad reflections, zero downloads. */
function studioEnvironment(): THREE.DataTexture {
  const width = 128
  const height = 64
  const data = new Float32Array(width * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = x / width
      const v = y / height
      const softbox = (cx: number, cy: number, sx: number, sy: number) =>
        Math.exp(-Math.pow((u - cx) / sx, 8) - Math.pow((v - cy) / sy, 8))
      const light =
        0.05 +
        softbox(0.24, 0.34, 0.09, 0.2) * 2.6 +
        softbox(0.74, 0.3, 0.05, 0.16) * 1.7
      const i = (y * width + x) * 4
      data[i] = light
      data[i + 1] = light
      data[i + 2] = light
      data[i + 3] = 1
    }
  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.FloatType,
  )
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.needsUpdate = true
  return texture
}

function haloMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      tint: { value: new THREE.Color() },
      strength: { value: 0 },
    },
    vertexShader:
      'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:
      'varying vec2 vUv;uniform vec3 tint;uniform float strength;void main(){float d=length((vUv-0.5)*2.0);float a=exp(-d*d*9.0)*0.5+exp(-d*d*55.0)*0.7;gl_FragColor=vec4(tint,a*strength);}',
  })
}

function backdropMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      edge: { value: new THREE.Color() },
      mid: { value: new THREE.Color() },
      glow: { value: new THREE.Color() },
      strength: { value: 1 },
    },
    vertexShader:
      'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec2 vUv;uniform vec3 edge;uniform vec3 mid;uniform vec3 glow;uniform float strength;
      void main(){vec2 p=(vUv-vec2(0.5,0.62))*vec2(1.35,1.0);float r=length(p*2.0);
      vec3 c=mix(glow,mid,smoothstep(0.28,0.72,r));c=mix(c,edge,smoothstep(0.72,1.15,r));
      float fade=1.0-smoothstep(0.85,1.05,r);gl_FragColor=vec4(c,strength*fade);}`,
  })
}

interface PortalMaterials {
  stone: Array<{ material: THREE.MeshStandardMaterial; boost: number }>
  emissive: Array<{
    material: THREE.MeshStandardMaterial
    role: string
  }>
  nodeDark: THREE.MeshStandardMaterial | null
  inlay: THREE.MeshStandardMaterial | null
  core: THREE.MeshStandardMaterial | null
}

interface PortalLights {
  hemi: THREE.HemisphereLight
  key: THREE.DirectionalLight
  sun: THREE.DirectionalLight
  rim: THREE.DirectionalLight
  threshold: THREE.SpotLight
  pool: THREE.PointLight
  bounce: THREE.PointLight
  coreNear: THREE.PointLight
  passageMid: THREE.PointLight
  deep: THREE.PointLight
}

export async function createPortalScene(
  options: PortalSceneOptions,
): Promise<PortalSceneHandle> {
  const { canvas, onError } = options
  let palette = options.palette
  let motion = options.motion
  let theme = portalThemeFromPalette(palette)

  if (!localWebGLAvailable(canvas)) {
    onError?.('webgl-unavailable')
    throw new Error('webgl-unavailable')
  }

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
  } catch {
    onError?.('webgl-unavailable')
    throw new Error('webgl-unavailable')
  }

  let disposed = false
  let suspended = false
  let arrival = 1
  const pose = { x: 0, y: 0 }
  const initialFrame = portalFrame(1)
  let fitDistance = initialFrame.distance
  let gazeY = initialFrame.centerY

  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(PORTAL_COMPOSITION.verticalFovDeg, 1, 0.1, 800)
  camera.position.set(0, gazeY, fitDistance)

  const environment = studioEnvironment()
  scene.environment = environment
  scene.environmentIntensity = THEMES[theme].environmentIntensity
  const fog = new THREE.FogExp2(0x000000, 0.004)
  scene.fog = fog

  const ownedGeometries: THREE.BufferGeometry[] = []
  const ownedMaterials: THREE.Material[] = []
  const ownedTextures: THREE.Texture[] = []

  // --- GLB ---------------------------------------------------------------
  let gltf
  try {
    const loader = new GLTFLoader()
    gltf = await loader.loadAsync(options.glbUrl ?? PORTAL_ASSETS.glb)
  } catch {
    renderer.dispose()
    onError?.('import-rejected')
    throw new Error('import-rejected')
  }
  if (disposed) {
    renderer.dispose()
    throw new Error('disposed')
  }

  // Light-theme stone baseColor companion (approved export artifact).
  let lightMap: THREE.Texture
  try {
    lightMap = await new THREE.TextureLoader().loadAsync(
      options.lightMapUrl ?? PORTAL_ASSETS.lightMap,
    )
    lightMap.colorSpace = THREE.SRGBColorSpace
    lightMap.flipY = false
    ownedTextures.push(lightMap)
  } catch {
    renderer.dispose()
    onError?.('import-rejected')
    throw new Error('import-rejected')
  }

  const root = gltf.scene
  root.name = 'HM_RUNTIME_ROOT'
  scene.add(root)

  // --- material roles ----------------------------------------------------
  const materials: PortalMaterials = {
    stone: [],
    emissive: [],
    nodeDark: null,
    inlay: null,
    core: null,
  }
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const list = Array.isArray(object.material) ? object.material : [object.material]
    for (const material of list) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue
      const name = material.name
      if ((STONE_MATERIALS as readonly string[]).includes(name)) {
        materials.stone.push({
          material,
          boost: STONE_ROUGHNESS_BOOST[name] ?? 1.06,
        })
        continue
      }
      const role = MATERIAL_ROLES[name]
      if (!role) continue
      if (role.emissive) {
        if (role.vertexFalloff) patchEmissiveFalloff(material)
        materials.emissive.push({ material, role: role.emissive })
      }
      if (name === 'Web_NodeDark') materials.nodeDark = material
      if (name === 'Web_GoldInlay') materials.inlay = material
      if (name === 'Web_Core') materials.core = material
    }
  })

  // --- runtime floor (excluded from the GLB on purpose) --------------------
  const floorGeometry = new THREE.PlaneGeometry(420, 420)
  ownedGeometries.push(floorGeometry)
  const floorMaterial = new THREE.MeshStandardMaterial({
    roughness: 0.24,
    metalness: 0.07,
  })
  ownedMaterials.push(floorMaterial)
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.name = 'Runtime_Floor'
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, 0, -40)
  floor.receiveShadow = true
  scene.add(floor)

  // --- atmosphere backdrop (GLB haze planes stay preview-only) -------------
  const backdropGeometry = new THREE.PlaneGeometry(200, 90)
  ownedGeometries.push(backdropGeometry)
  const backdropMaterial_ = backdropMaterial()
  ownedMaterials.push(backdropMaterial_)
  const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial_)
  backdrop.name = 'Runtime_Backdrop'
  backdrop.position.set(0, 12, -45)
  scene.add(backdrop)

  // --- beacon + threshold halos (restrained glow without post-processing) --
  const haloGeometry = new THREE.PlaneGeometry(1, 1)
  ownedGeometries.push(haloGeometry)
  const beaconHaloMaterial = haloMaterial()
  ownedMaterials.push(beaconHaloMaterial)
  const beaconHalo = new THREE.Mesh(haloGeometry, beaconHaloMaterial)
  beaconHalo.name = 'Runtime_BeaconHalo'
  beaconHalo.position.set(0, 3.6, -24.6)
  beaconHalo.scale.set(3.4, 3.4, 1)
  scene.add(beaconHalo)
  const poolMaterial = haloMaterial()
  ownedMaterials.push(poolMaterial)
  const poolHalo = new THREE.Mesh(haloGeometry, poolMaterial)
  poolHalo.name = 'Runtime_ThresholdHalo'
  poolHalo.position.set(0, 0.06, 0.4)
  poolHalo.rotation.x = -Math.PI / 2
  poolHalo.scale.set(13, 7, 1)
  scene.add(poolHalo)

  // --- light rig (runtime-only per portal_runtime_spec) ---------------------
  const lights: PortalLights = {
    hemi: new THREE.HemisphereLight(0xffffff, 0x000000, 0),
    key: new THREE.DirectionalLight(0xffffff, 0),
    sun: new THREE.DirectionalLight(0xffffff, 0),
    rim: new THREE.DirectionalLight(0xffffff, 0),
    threshold: new THREE.SpotLight(0xffffff, 0, 40, 0.6, 0.9, 2),
    pool: new THREE.PointLight(0xffffff, 0, 24, 2),
    bounce: new THREE.PointLight(0xffffff, 0, 26, 2),
    coreNear: new THREE.PointLight(0xffffff, 0, 30, 2),
    passageMid: new THREE.PointLight(0xffffff, 0, 34, 2),
    deep: new THREE.PointLight(0xffffff, 0, 40, 2),
  }
  lights.key.name = 'Runtime_Key'
  lights.key.shadow.mapSize.set(1024, 1024)
  lights.key.shadow.camera.left = -18
  lights.key.shadow.camera.right = 18
  lights.key.shadow.camera.top = 20
  lights.key.shadow.camera.bottom = -4
  lights.key.shadow.camera.near = 5
  lights.key.shadow.camera.far = 120
  lights.key.shadow.bias = -0.0005
  lights.key.shadow.normalBias = 0.06
  lights.key.target.position.set(0, 4.9, -2)
  lights.sun.name = 'Runtime_Sun'
  lights.sun.shadow.mapSize.set(1024, 1024)
  lights.sun.shadow.camera.left = -20
  lights.sun.shadow.camera.right = 20
  lights.sun.shadow.camera.top = 22
  lights.sun.shadow.camera.bottom = -4
  lights.sun.shadow.camera.near = 5
  lights.sun.shadow.camera.far = 140
  lights.sun.shadow.bias = -0.0005
  lights.sun.shadow.normalBias = 0.06
  lights.sun.target.position.set(0, 3.5, -2)
  lights.rim.target.position.set(0, 4, -6)
  lights.threshold.position.set(0, 2.0, 3.0)
  lights.threshold.target.position.set(0, 2.0, -6)
  lights.pool.position.set(0, 0.35, 1.2)
  lights.bounce.position.set(0, 0.3, -5)
  lights.coreNear.position.set(0, 3.4, -9)
  lights.passageMid.position.set(0, 3.4, -17)
  lights.deep.position.set(0, 3.4, -30)
  const lightTargets = [
    lights.key.target,
    lights.sun.target,
    lights.rim.target,
    lights.threshold.target,
  ]
  for (const target of lightTargets) scene.add(target)
  scene.add(
    lights.hemi,
    lights.key,
    lights.sun,
    lights.rim,
    lights.threshold,
    lights.pool,
    lights.bounce,
    lights.coreNear,
    lights.passageMid,
    lights.deep,
  )

  // --- theme application ----------------------------------------------------
  const baseMaps = new Map<string, THREE.Texture>()
  for (const entry of materials.stone) {
    if (entry.material.map) baseMaps.set(entry.material.name, entry.material.map)
  }

  function applyTheme(next: PortalTheme) {
    theme = next
    const spec = THEMES[theme]
    scene.background = srgb(spec.background)
    fog.color.copy(srgb(spec.fog.color))
    fog.density = spec.fog.density
    scene.environmentIntensity = spec.environmentIntensity
    renderer.toneMappingExposure = spec.exposure

    for (const entry of materials.stone) {
      const darkMap = baseMaps.get(entry.material.name) ?? null
      entry.material.map = theme === 'dark' ? darkMap : lightMap
      entry.material.roughness = theme === 'dark' ? 1.0 : entry.boost
      entry.material.envMapIntensity = spec.stoneEnv
      entry.material.needsUpdate = true
    }

    const emissiveSpec = spec.emissive
    for (const entry of materials.emissive) {
      entry.material.emissive.copy(srgb(EMISSIVE_COLORS[entry.role]))
      const base = emissiveSpec[entry.role] ?? 0
      const settle = entry.role === 'core' ? 0.75 + 0.25 * arrival : 1
      entry.material.emissiveIntensity = base * settle
    }
    if (materials.nodeDark) {
      materials.nodeDark.color.copy(srgb(spec.nodeDarkBase))
      materials.nodeDark.needsUpdate = true
    }
    if (materials.inlay) {
      materials.inlay.color.copy(srgb(spec.inlayBase))
      materials.inlay.emissive.copy(srgb(EMISSIVE_COLORS.inlay))
      materials.inlay.emissiveIntensity = emissiveSpec.inlay
      materials.inlay.needsUpdate = true
    }
    if (materials.core) {
      materials.core.emissive.copy(srgb(spec.coreColor))
    }

    floorMaterial.color.copy(
      srgb(
        theme === 'dark'
          ? [0.0125, 0.0135, 0.0155]
          : [0.655, 0.595, 0.49],
      ),
    )
    floorMaterial.roughness = theme === 'dark' ? 0.3 : 0.34
    floorMaterial.envMapIntensity = spec.stoneEnv

    const backdropUniforms = backdropMaterial_.uniforms
    ;(backdropUniforms.edge.value as THREE.Color).copy(srgb(spec.atmosphere.edge))
    ;(backdropUniforms.mid.value as THREE.Color).copy(srgb(spec.atmosphere.mid))
    ;(backdropUniforms.glow.value as THREE.Color).copy(srgb(spec.atmosphere.glow))
    backdropUniforms.strength.value = spec.atmosphere.strength

    ;(beaconHaloMaterial.uniforms.tint.value as THREE.Color).copy(
      srgb(EMISSIVE_COLORS.streak),
    )
    beaconHaloMaterial.uniforms.strength.value =
      spec.beaconHalo * (0.8 + 0.2 * arrival)
    ;(poolMaterial.uniforms.tint.value as THREE.Color).copy(
      srgb(EMISSIVE_COLORS.goldLine),
    )
    poolMaterial.uniforms.strength.value = spec.poolHalo

    lights.hemi.color.copy(srgb(spec.hemi.sky))
    lights.hemi.groundColor.copy(srgb(spec.hemi.ground))
    lights.hemi.intensity = spec.hemi.intensity

    lights.key.color.copy(srgb(spec.key.color))
    lights.key.intensity = spec.key.intensity
    lights.key.position.set(...spec.key.position)
    lights.key.castShadow = spec.key.castShadow
    lights.key.target.updateMatrixWorld()

    lights.sun.color.copy(srgb(spec.sun.color))
    lights.sun.intensity = spec.sun.intensity
    lights.sun.position.set(...spec.sun.position)
    lights.sun.castShadow = spec.sun.castShadow
    lights.sun.target.updateMatrixWorld()

    lights.rim.color.copy(srgb(spec.rim.color))
    lights.rim.intensity = spec.rim.intensity
    lights.rim.position.set(...spec.rim.position)
    lights.rim.target.updateMatrixWorld()

    lights.threshold.color.copy(srgb(spec.threshold.color))
    lights.threshold.intensity = spec.threshold.intensity
    lights.pool.color.copy(srgb(spec.pool.color))
    lights.pool.intensity = spec.pool.intensity
    lights.bounce.color.copy(srgb(spec.bounce.color))
    lights.bounce.intensity = spec.bounce.intensity
    lights.coreNear.color.copy(srgb(spec.coreNear.color))
    lights.coreNear.intensity = spec.coreNear.intensity
    lights.passageMid.color.copy(srgb(spec.passageMid.color))
    lights.passageMid.intensity = spec.passageMid.intensity
    lights.deep.color.copy(srgb(spec.deep.color))
    lights.deep.intensity = spec.deep.intensity
  }

  function poseCamera() {
    const ramp = (1 - arrival) * 0.035
    camera.position.set(
      pose.y * 6,
      gazeY + pose.x * 4,
      fitDistance * (1 + ramp),
    )
    camera.lookAt(0, gazeY, -2)
    camera.updateMatrixWorld()
  }

  function renderFrame() {
    if (disposed || suspended) return
    renderer.render(scene, camera)
  }

  const setArrival = (phase: number) => {
    arrival = THREE.MathUtils.clamp(phase, 0, 1)
    const spec = THEMES[theme]
    for (const entry of materials.emissive) {
      const base = spec.emissive[entry.role] ?? 0
      const settle =
        entry.role === 'core'
          ? 0.75 + 0.25 * arrival
          : 0.86 + 0.14 * arrival
      entry.material.emissiveIntensity = base * settle
    }
    beaconHaloMaterial.uniforms.strength.value =
      spec.beaconHalo * (0.8 + 0.2 * arrival)
    poseCamera()
    renderFrame()
  }

  applyTheme(theme)

  const lost = (event: Event) => {
    event.preventDefault()
    onError?.('context-lost')
  }
  canvas.addEventListener('webglcontextlost', lost)

  poseCamera()
  renderFrame()

  return {
    render: renderFrame,
    resize(width, height, pixelRatio) {
      if (disposed || width <= 0 || height <= 0) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      const frame = portalFrame(camera.aspect)
      fitDistance = frame.distance
      gazeY = frame.centerY
      poseCamera()
      const limit =
        width < 768
          ? SCENE_PERFORMANCE_CEILINGS.maxDevicePixelRatioMobile
          : SCENE_PERFORMANCE_CEILINGS.maxDevicePixelRatioDesktop
      const dpr = Math.min(
        pixelRatio,
        limit,
        Math.sqrt(
          SCENE_PERFORMANCE_CEILINGS.maxDrawingBufferPixels / (width * height),
        ),
      )
      renderer.setPixelRatio(dpr)
      renderer.setSize(width, height, false)
      renderFrame()
    },
    setPalette(next) {
      if (disposed) return
      palette = next
      const resolved = portalThemeFromPalette(palette)
      if (resolved !== theme) {
        applyTheme(resolved)
        setArrival(arrival)
      }
      renderFrame()
    },
    setMotion(next) {
      motion = next
    },
    setPose(x, y) {
      if (disposed) return
      pose.x = THREE.MathUtils.clamp(x, -0.06, 0.06)
      pose.y = THREE.MathUtils.clamp(y, -0.06, 0.06)
      poseCamera()
      renderFrame()
    },
    setOrbitPhase(phase) {
      if (disposed) return
      setArrival(motion === 'full' ? phase : 1)
    },
    setSuspended(next) {
      if (disposed || next === suspended) return
      suspended = next
      if (!suspended) renderFrame()
    },
    dispose() {
      if (disposed) return
      disposed = true
      canvas.removeEventListener('webglcontextlost', lost)
      root.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose()
          const list = Array.isArray(object.material)
            ? object.material
            : [object.material]
          for (const material of list) material?.dispose()
        }
      })
      for (const geometry of ownedGeometries) geometry.dispose()
      for (const material of ownedMaterials) material.dispose()
      for (const texture of ownedTextures) texture.dispose()
      environment.dispose()
      scene.clear()
      renderer.dispose()
    },
  }
}
