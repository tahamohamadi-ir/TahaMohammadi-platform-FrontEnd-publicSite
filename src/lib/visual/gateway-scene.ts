/** Procedural architectural gateway, matched to the tracked concept. */
import * as THREE from 'three'
import {
  SCENE_PERFORMANCE_CEILINGS,
  type SceneMotionPreference,
  type ScenePalette,
} from './scene-contract'
export const GATEWAY_CONTRACT_VERSION = 'ca07-1.0.0'
export type GatewayErrorCode =
  'webgl-unavailable' | 'import-rejected' | 'context-lost'
export interface GatewaySceneOptions {
  canvas: HTMLCanvasElement
  palette: ScenePalette
  motion: SceneMotionPreference
  onError?: (code: GatewayErrorCode) => void
}
export interface GatewaySceneHandle {
  render(): void
  resize(width: number, height: number, pixelRatio: number): void
  setPalette(palette: ScenePalette): void
  setMotion(motion: SceneMotionPreference): void
  setPose(x: number, y: number): void
  setOrbitPhase(phase: number): void
  dispose(): void
}
export function isWebGLAvailable(canvas: HTMLCanvasElement): boolean {
  try {
    return Boolean(window.WebGLRenderingContext && canvas.getContext('webgl2'))
  } catch {
    return false
  }
}
function archShape(outer: number, inner: number) {
  const s = new THREE.Shape()
  s.moveTo(-outer, -43)
  s.lineTo(-outer, 15)
  s.absarc(0, 15, outer, Math.PI, 0, true)
  s.lineTo(outer, -43)
  s.lineTo(inner, -43)
  s.lineTo(inner, 15)
  s.absarc(0, 15, inner, 0, Math.PI, false)
  s.lineTo(-inner, -43)
  s.closePath()
  return s
}
function stepGeometry(width: number, height: number) {
  const shape = new THREE.Shape()
  shape.moveTo(-width / 2, -height / 2)
  shape.lineTo(width / 2, -height / 2)
  shape.lineTo(width / 2, height / 2)
  shape.lineTo(-width / 2, height / 2)
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, {
    depth: 5.5,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.14,
    bevelThickness: 0.14,
    steps: 1,
  }).translate(0, 0, -2.75)
}
/** Deterministic multiscale mineral texture, not downloaded artwork. */
function mineralTexture() {
  const size = 256,
    data = new Uint8Array(size * size * 4)
  let seed = 197905
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const vein =
        Math.sin(x * 0.11 + Math.sin(y * 0.027) * 3) *
        Math.sin(y * 0.071 + x * 0.035)
      const value = Math.round(154 + (seed / 4294967296) * 55 + vein * 25),
        i = (y * size + x) * 4
      data[i] = data[i + 1] = data[i + 2] = value
      data[i + 3] = 255
    }
  const texture = new THREE.DataTexture(data, size, size)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.repeat.set(0.09, 0.09)
  texture.needsUpdate = true
  return texture
}

/** Small analytic studio environment provides real broad material reflections. */
function studioEnvironment() {
  const width = 128,
    height = 64
  const data = new Float32Array(width * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = x / width,
        v = y / height
      const softbox = (cx: number, cy: number, sx: number, sy: number) =>
        Math.exp(-Math.pow((u - cx) / sx, 8) - Math.pow((v - cy) / sy, 8))
      const light =
        0.045 +
        softbox(0.2, 0.32, 0.08, 0.2) * 3 +
        softbox(0.72, 0.38, 0.035, 0.17) * 2
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
export function createGatewayScene(
  options: GatewaySceneOptions,
): GatewaySceneHandle {
  const { canvas, onError } = options
  let palette = options.palette,
    motion = options.motion,
    disposed = false
  if (!isWebGLAvailable(canvas)) {
    onError?.('webgl-unavailable')
    return noop()
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
    return noop()
  }
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.VSMShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
  // Keep the renderer itself transparent: the portal light has to emerge
  // from the page canvas rather than sit inside a dark rectangular viewport.
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  const scene = new THREE.Scene(),
    root = new THREE.Group()
  scene.add(root)
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 650)
  const geometries: THREE.BufferGeometry[] = [],
    materials: THREE.Material[] = [],
    textures: THREE.Texture[] = []
  const geo = <T extends THREE.BufferGeometry>(g: T) => {
    geometries.push(g)
    return g
  }
  const mat = <T extends THREE.Material>(m: T) => {
    materials.push(m)
    return m
  }
  const color = (role: keyof ScenePalette) => new THREE.Color(palette[role])
  const mineral = mineralTexture()
  textures.push(mineral)
  const environment = studioEnvironment()
  textures.push(environment)
  scene.environment = environment
  scene.environmentIntensity = 0.7
  const stone = mat(
    new THREE.MeshStandardMaterial({
      roughness: 0.58,
      metalness: 0.26,
      bumpMap: mineral,
      bumpScale: 0.18,
      roughnessMap: mineral,
    }),
  )
  const bronze = mat(
    new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.82,
      emissiveIntensity: 0.015,
    }),
  )
  const stairMaterial = mat(
    new THREE.MeshStandardMaterial({
      roughness: 0.62,
      metalness: 0.15,
      bumpMap: mineral,
      bumpScale: 0.12,
      roughnessMap: mineral,
    }),
  )
  const arch = new THREE.Mesh(
    geo(
      new THREE.ExtrudeGeometry(archShape(27, 23.5), {
        depth: 7,
        curveSegments: 64,
        bevelEnabled: true,
        bevelThickness: 0.3,
        bevelSize: 0.25,
        bevelSegments: 3,
      }),
    ),
    stone,
  )
  arch.name = 'gateway-arch'
  arch.position.z = -3.5
  arch.castShadow = arch.receiveShadow = true
  root.add(arch)
  // Flush brass inlays, not wireframe outlines.
  for (const [outer, inner] of [
    [27.1, 26.91],
    [23.58, 23.39],
  ]) {
    const trim = new THREE.Mesh(
      geo(new THREE.ShapeGeometry(archShape(outer, inner), 80)),
      bronze,
    )
    trim.position.z = 3.83
    root.add(trim)
  }
  // Staircase ascends into the left side of the opening, as in the concept.
  for (let i = 0; i < 8; i++) {
    const height = 1.5 + i * 3.4,
      width = 23 - i * 0.85
    const step = new THREE.Mesh(geo(stepGeometry(width, height)), stairMaterial)
    step.name = `gateway-step-${i}`
    step.position.set(-7 - i * 1.65, -43 + height / 2, -6 - i * 5)
    step.castShadow = step.receiveShadow = true
    root.add(step)
    const lip = new THREE.Mesh(
      geo(new THREE.BoxGeometry(width, 0.12, 0.2)),
      bronze,
    )
    lip.position.set(
      step.position.x,
      -43 + height + 0.01,
      step.position.z + 2.76,
    )
    root.add(lip)
  }
  const floorMaterial = mat(
    new THREE.MeshStandardMaterial({
      roughness: 0.76,
      metalness: 0.04,
      bumpMap: mineral,
      bumpScale: 0.065,
      transparent: true,
      depthWrite: false,
    }),
  )
  // Fade the ground into the page; there is no rectangular stage boundary.
  floorMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vFloorWorld;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\nvFloorWorld=(modelMatrix*vec4(transformed,1.0)).xyz;',
    )
    shader.fragmentShader =
      'varying vec3 vFloorWorld;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <alphamap_fragment>',
      '#include <alphamap_fragment>\ndiffuseColor.a*=1.0-smoothstep(45.0,135.0,length(vFloorWorld.xz));',
    )
  }
  const floor = new THREE.Mesh(
    geo(new THREE.PlaneGeometry(340, 320)),
    floorMaterial,
  )
  floor.name = 'gateway-floor'
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, -43.2, -35)
  floor.receiveShadow = true
  root.add(floor)
  const ambient = new THREE.HemisphereLight(0xffffff, 0xffffff, 1)
  scene.add(ambient)
  const key = new THREE.DirectionalLight(0xffffff, 3.3)
  key.position.set(-70, 140, 60)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  Object.assign(key.shadow.camera, {
    left: -80,
    right: 80,
    top: 85,
    bottom: -70,
    near: 1,
    far: 260,
  })
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.12
  key.shadow.radius = 12
  key.shadow.blurSamples = 8
  scene.add(key)
  const interiorLight = new THREE.PointLight(0xffffff, 55, 140, 1)
  interiorLight.position.set(8, -32, -8)
  scene.add(interiorLight)
  const edgeLight = new THREE.DirectionalLight(0xffffff, 2.3)
  edgeLight.position.set(45, -15, -20)
  scene.add(edgeLight)
  // Optical atmosphere is local to the opening; no postprocessing chain.
  const haloMaterial = mat(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { tint: { value: color('brand') }, strength: { value: 0.3 } },
      vertexShader:
        'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `varying vec2 vUv;uniform vec3 tint;uniform float strength;
      float haze(vec2 p,vec2 c,vec2 stretch){vec2 q=(p-c)*stretch;return exp(-dot(q,q)*10.0);}
      void main(){vec2 p=vUv;float a=haze(p,vec2(.35,.28),vec2(2.2,1.0))+haze(p,vec2(.65,.28),vec2(2.2,1.0));
      float ray=pow(max(0.0,1.0-abs(p.x-.5)*1.9),4.0)*pow(1.0-p.y,2.0);gl_FragColor=vec4(tint,(a*.55+ray*.12)*strength);}`,
    }),
  )
  const atmosphere = new THREE.Mesh(
    geo(new THREE.PlaneGeometry(180, 125)),
    haloMaterial,
  )
  atmosphere.position.set(0, -5, -20)
  root.add(atmosphere)
  const bloomMaterial = mat(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { tint: { value: color('brand') }, strength: { value: 0.6 } },
      vertexShader:
        'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:
        'varying vec2 vUv;uniform vec3 tint;uniform float strength;void main(){float d=length((vUv-.5)*2.0);float a=exp(-d*d*12.0)*.34+exp(-d*d*180.0)*.85;gl_FragColor=vec4(tint,a*strength);}',
    }),
  )
  for (const x of [-26, 26]) {
    const glow = new THREE.Mesh(
      geo(new THREE.PlaneGeometry(27, 20)),
      bloomMaterial,
    )
    glow.position.set(x, -41.8, 5)
    root.add(glow)
  }
  // Low grazing light on the actual ground plane anchors the threshold.
  const spillMaterial = mat(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        tint: { value: color('signature') },
        strength: { value: 0.16 },
      },
      vertexShader:
        'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `varying vec2 vUv;uniform vec3 tint;uniform float strength;
    float fan(vec2 p,vec2 origin){vec2 q=p-origin;float r=length(q);float a=atan(q.y,q.x);
      float rays=pow(.5+.5*sin(a*27.0+.7),28.0)+.35*pow(.5+.5*sin(a*53.0),40.0);
      return rays*exp(-r*.045)*smoothstep(2.0,8.0,r);}
    void main(){vec2 p=(vUv-.5)*vec2(220.0,150.0);float a=fan(p,vec2(-26.0,0.0))+fan(p,vec2(26.0,0.0));
      float fade=1.0-smoothstep(.22,.5,length(vUv-.5));gl_FragColor=vec4(tint,a*fade*strength);}`,
    }),
  )
  const spill = new THREE.Mesh(
    geo(new THREE.PlaneGeometry(220, 150)),
    spillMaterial,
  )
  spill.rotation.x = -Math.PI / 2
  spill.position.set(0, -43.05, 0)
  root.add(spill)
  const orbitGold = mat(
    new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
    }),
  )
  const orbitTeal = mat(
    new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  )
  const orbitDotted = mat(
    new THREE.LineDashedMaterial({
      transparent: true,
      opacity: 0.24,
      dashSize: 0.2,
      gapSize: 0.55,
      depthWrite: false,
    }),
  )
  const ornaments = new THREE.Group()
  ornaments.position.set(0, -14, -64)
  ornaments.scale.setScalar(1.18)
  root.add(ornaments)
  for (let i = 0; i < 5; i++) {
    const points = []
    for (let j = 0; j <= 180; j++) {
      const a = (j / 180) * Math.PI * 2
      points.push(
        new THREE.Vector3(
          Math.cos(a) * (40 + i * 8),
          Math.sin(a) * (20 + i * 5),
          Math.sin(a) * (8 + i * 2),
        ),
      )
    }
    const line = new THREE.Line(
      geo(new THREE.BufferGeometry().setFromPoints(points)),
      i % 2 ? orbitDotted : i === 2 ? orbitGold : orbitTeal,
    )
    line.computeLineDistances()
    ornaments.add(line)
  }
  const engraving: THREE.Vector3[] = []
  for (let r = 5; r <= 25; r += 5)
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2,
        b = ((i + 0.6) / 96) * Math.PI * 2
      engraving.push(
        new THREE.Vector3(Math.cos(a) * r, 9 + Math.sin(a) * r, 1),
        new THREE.Vector3(Math.cos(b) * r, 9 + Math.sin(b) * r, 1),
      )
    }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    engraving.push(
      new THREE.Vector3(Math.cos(a) * 4, 9 + Math.sin(a) * 4, 1),
      new THREE.Vector3(Math.cos(a) * 25, 9 + Math.sin(a) * 25, 1),
    )
  }
  ornaments.add(
    new THREE.LineSegments(
      geo(new THREE.BufferGeometry().setFromPoints(engraving)),
      orbitGold,
    ),
  )
  const dotMaterial = mat(new THREE.MeshBasicMaterial())
  const dots = new THREE.InstancedMesh(
      geo(new THREE.SphereGeometry(0.34, 8, 6)),
      dotMaterial,
      42,
    ),
    dummy = new THREE.Object3D()
  dots.name = 'gateway-satellites'
  function orbitPhase(phase: number) {
    for (let i = 0; i < 42; i++) {
      const ring = Math.floor(i / 14),
        a = (i * Math.PI * 2) / 14 + phase * (0.65 - ring * 0.12),
        size = i % 7 === 0 ? 1.65 : i % 3 === 0 ? 0.85 : 0.5
      dummy.position.set(
        Math.cos(a) * (40 + ring * 16),
        Math.sin(a) * (20 + ring * 10),
        Math.sin(a) * (8 + ring * 4) + 0.2,
      )
      dummy.scale.setScalar(size)
      dummy.updateMatrix()
      dots.setMatrixAt(i, dummy.matrix)
    }
    dots.instanceMatrix.needsUpdate = true
    center.rotation.set(0.15, phase * 0.5, 0.12)
  }
  ornaments.add(dots)
  const centerMaterial = mat(
    new THREE.MeshStandardMaterial({
      metalness: 0.5,
      roughness: 0.25,
      emissiveIntensity: 0.25,
    }),
  )
  const center = new THREE.Mesh(
    geo(new THREE.BoxGeometry(2.8, 2.8, 1.3)),
    centerMaterial,
  )
  center.position.set(0, -3.4, -61)
  root.add(center)
  orbitPhase(motion === 'full' ? 0 : 1)
  function applyPalette() {
    const dark = color('canvas').getHSL({ h: 0, s: 0, l: 0 }).l < 0.25
    stone.color.copy(
      dark
        ? color('canvas').lerp(color('ink'), 0.065)
        : color('surface').lerp(color('ink'), 0.06),
    )
    stairMaterial.color.copy(
      dark
        ? color('canvas').lerp(color('ink'), 0.045)
        : color('surface').lerp(color('ink'), 0.06),
    )
    bronze.color.copy(color('signature'))
    bronze.emissive.copy(color('signature'))
    floorMaterial.color.copy(
      color('canvas').lerp(color('ink'), dark ? 0.009 : 0.02),
    )
    ambient.color.copy(color('ink').lerp(new THREE.Color('white'), 0.6))
    ambient.groundColor.copy(color('canvas'))
    ambient.intensity = dark ? 0.65 : 1.3
    key.color.copy(color('ink').lerp(new THREE.Color('white'), 0.7))
    key.intensity = 2.6
    interiorLight.color.copy(
      color('signature').lerp(new THREE.Color('white'), 0.55),
    )
    edgeLight.color.copy(color('brand').lerp(new THREE.Color('white'), 0.22))
    orbitGold.color.copy(color('signature'))
    orbitDotted.color.copy(color('signature'))
    orbitTeal.color.copy(color('brand'))
    centerMaterial.color.copy(color('brand'))
    centerMaterial.emissive.copy(color('brand'))
    dotMaterial.color.copy(color('brand'))
    haloMaterial.uniforms.tint.value.copy(color('brand'))
    haloMaterial.uniforms.strength.value = dark ? 0.42 : 0.07
    bloomMaterial.uniforms.tint.value.copy(
      color('brand').lerp(new THREE.Color('white'), 0.65),
    )
    bloomMaterial.uniforms.strength.value = dark ? 0.8 : 0.18
    spillMaterial.uniforms.tint.value.copy(
      color('signature').lerp(color('ink'), 0.4),
    )
    spillMaterial.uniforms.strength.value = dark ? 0.085 : 0.04
  }
  applyPalette()
  let cameraDistance = 200
  function poseCamera(x = 0, y = 0) {
    camera.position.set(26 + y * 65, 32 - x * 35, cameraDistance)
    camera.lookAt(0, -1, -2)
    camera.updateMatrixWorld()
    ornaments.rotation.y = y * 1.5
    ornaments.rotation.x = x
  }
  const render = () => {
    if (!disposed) renderer.render(scene, camera)
  }
  const lost = (event: Event) => {
    event.preventDefault()
    onError?.('context-lost')
  }
  canvas.addEventListener('webglcontextlost', lost)
  poseCamera()
  return {
    render,
    resize(width, height, pixelRatio) {
      if (disposed || width <= 0 || height <= 0) return
      camera.aspect = width / height
      cameraDistance =
        Math.max(54, 80 / camera.aspect) /
          Math.tan(THREE.MathUtils.degToRad(16)) +
        10
      poseCamera()
      camera.updateProjectionMatrix()
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
      render()
    },
    setPalette(next) {
      if (!disposed) {
        palette = next
        applyPalette()
        render()
      }
    },
    setMotion(next) {
      motion = next
      if (next !== 'full') {
        poseCamera()
        orbitPhase(1)
      }
    },
    setOrbitPhase(phase) {
      if (!disposed)
        orbitPhase(motion === 'full' ? THREE.MathUtils.clamp(phase, 0, 1) : 1)
    },
    setPose(x, y) {
      if (!disposed)
        poseCamera(
          motion === 'full' ? THREE.MathUtils.clamp(x, -0.052, 0.052) : 0,
          motion === 'full' ? THREE.MathUtils.clamp(y, -0.052, 0.052) : 0,
        )
    },
    dispose() {
      if (disposed) return
      disposed = true
      canvas.removeEventListener('webglcontextlost', lost)
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      for (const t of textures) t.dispose()
      key.shadow.dispose()
      scene.clear()
      renderer.dispose()
    },
  }
}
function noop(): GatewaySceneHandle {
  return {
    render() {},
    resize() {},
    setPalette() {},
    setMotion() {},
    setPose() {},
    setOrbitPhase() {},
    dispose() {},
  }
}
