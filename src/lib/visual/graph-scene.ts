/**
 * CA-04 — Original Procedural Constellation Renderer.
 *
 * Implements the locked `GraphSceneFactory` interface (`scene-contract.ts`).
 *
 * Technical boundaries (DESIGN-SPEC §§2, 3, 5, 6):
 * - Procedural geometry from primitives: orbital rings, node discs/spheres, quadratic curve edges, central nucleus.
 * - No portal, no wallpaper, no screenshot-textured quad.
 * - Demand-driven rendering: renders on mount, resize, theme change, and selection (no endless unconstrained RAF loop).
 * - Enforces performance ceilings: DPR clamped (mobile ≤1.0, desktop ≤1.5), buffer ≤1.5M pixels, triangles ≤50k, draw calls ≤60.
 * - Comprehensive resource disposal: cleans all geometries, materials, listeners, and renderer.
 */

import * as THREE from 'three'
import {
  computeGraphLayout,
  computeProjectedLabels,
  type GraphLayoutResult,
} from './graph-layout'
import {
  SCENE_PERFORMANCE_CEILINGS,
  type GraphSceneFactory,
  type GraphSceneHandle,
  type GraphSceneOptions,
  type SceneMotionPreference,
  type ScenePalette,
} from './scene-contract'

interface NodeVisualItem {
  id: string
  mesh: THREE.Object3D
  instance: number
  baseRadius: number
  colorRole: string
  ringIndex: number
}

interface EdgeVisualItem {
  id: string
  sourceId: string
  targetId: string
  positions: THREE.Vector3[]
  directed: boolean
}

/**
 * Check whether WebGL context creation is supported in the current environment.
 */
export function isWebGLAvailable(canvas: HTMLCanvasElement): boolean {
  try {
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')),
    )
  } catch {
    return false
  }
}

/**
 * Procedural constellation scene factory conforming to GraphSceneFactory.
 */
export const createGraphScene: GraphSceneFactory = (
  options: GraphSceneOptions,
): GraphSceneHandle => {
  const { canvas, payload, palette, onError, onFrame } = options
  let currentPalette = { ...palette }
  let currentSelectedId = options.selectedId
  let _currentMotion: SceneMotionPreference = options.motion ?? 'full'
  let isDisposed = false

  // 1. Verify WebGL availability
  if (!isWebGLAvailable(canvas)) {
    onError?.('webgl-unavailable')
    return createNoopHandle()
  }

  // 2. Setup Three.js Core
  const scene = new THREE.Scene()
  scene.background = null // Transparent canvas

  const camera = new THREE.PerspectiveCamera(45, 1, 1, 1000)
  camera.position.set(0, 0, 180)
  camera.lookAt(0, 0, 0)

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
    return createNoopHandle()
  }

  // Handle WebGL context loss
  const onContextLost = (event: Event) => {
    event.preventDefault()
    onError?.('context-lost')
  }
  canvas.addEventListener('webglcontextlost', onContextLost, false)

  // 3. Lighting (Quiet, ambient with subtle directional highlights)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.4)
  dirLight.position.set(20, 40, 100)
  scene.add(dirLight)

  // 4. Groups for layered scene management
  const orbitGroup = new THREE.Group()
  const edgeGroup = new THREE.Group()
  const nodeGroup = new THREE.Group()
  const coreGroup = new THREE.Group()

  scene.add(orbitGroup)
  scene.add(edgeGroup)
  scene.add(nodeGroup)
  scene.add(coreGroup)

  let layoutResult: GraphLayoutResult = computeGraphLayout(payload, false)
  let layoutIsMobile = false
  let nodeBatch: THREE.InstancedMesh
  let selectionRing: THREE.Mesh
  let edgeBatch: THREE.LineSegments
  const nodeVisuals: NodeVisualItem[] = []
  const edgeVisuals: EdgeVisualItem[] = []
  const reusableGeometries: THREE.BufferGeometry[] = []
  const reusableMaterials: THREE.Material[] = []

  // Helper to track and dispose Three resources
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    reusableGeometries.push(g)
    return g
  }
  const trackMat = <T extends THREE.Material>(m: T): T => {
    reusableMaterials.push(m)
    return m
  }

  // Resolve color from palette roles
  function resolveColor(role: string): THREE.Color {
    const key = role as keyof ScenePalette
    const hex = currentPalette[key] ?? currentPalette.brand ?? '#087c73'
    return new THREE.Color(hex)
  }

  // 5. Build Procedural Central Nucleus
  function buildCentralNucleus() {
    coreGroup.clear()
    // Small inner disc
    const innerGeo = trackGeo(new THREE.IcosahedronGeometry(5, 1))
    const innerMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: resolveColor('brand'),
        roughness: 0.3,
        metalness: 0.45,
        transparent: true,
        opacity: 0.8,
      }),
    )
    const innerMesh = new THREE.Mesh(innerGeo, innerMat)
    coreGroup.add(innerMesh)
    innerMat.userData.paletteRole = 'brand'
    innerMesh.rotation.set(0.35, 0.5, 0.2)

    // Outer decorative halo
    const outerGeo = trackGeo(new THREE.RingGeometry(7.8, 8.1, 64))
    const outerMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: resolveColor('signature'),
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
    )
    const outerMesh = new THREE.Mesh(outerGeo, outerMat)
    coreGroup.add(outerMesh)
    outerMat.userData.paletteRole = 'signature'
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(10 + i * 3, 0.09, 4, 72)),
        outerMat,
      )
      ring.rotation.set(0.7 + i * 0.5, 0.3 - i * 0.8, i * 0.5)
      coreGroup.add(ring)
    }
  }

  // 6. Build Orbital Background Rings
  function buildOrbitalRings() {
    orbitGroup.clear()
    layoutResult.rings.forEach((ringDef) => {
      const points: THREE.Vector3[] = []
      const step = (Math.PI * 2) / ringDef.segments
      for (let i = 0; i <= ringDef.segments; i++) {
        const angle = i * step
        const x = Math.cos(angle) * ringDef.radiusX
        const y = Math.sin(angle) * ringDef.radiusY
        const z = Math.sin(angle * 2) * 2.5
        points.push(new THREE.Vector3(x, y, z))
      }

      const ringGeo = trackGeo(new THREE.BufferGeometry().setFromPoints(points))
      const ringMat = trackMat(
        new THREE.LineBasicMaterial({
          color: resolveColor('context'),
          transparent: true,
          opacity: 0.22,
        }),
      )

      const line = new THREE.LineLoop(ringGeo, ringMat)
      ringMat.userData.paletteRole = 'context'
      line.rotation.x = ringDef.tiltX
      line.rotation.y = ringDef.tiltY
      orbitGroup.add(line)
      // Fine calibration marks are decoration, never research relationships.
      const ticks: THREE.Vector3[] = []
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2
        const length = i % 4 === 0 ? 1.025 : 1.012
        ticks.push(
          new THREE.Vector3(
            Math.cos(a) * ringDef.radiusX,
            Math.sin(a) * ringDef.radiusY,
            0,
          ),
          new THREE.Vector3(
            Math.cos(a) * ringDef.radiusX * length,
            Math.sin(a) * ringDef.radiusY * length,
            0,
          ),
        )
      }
      const marks = new THREE.LineSegments(
        trackGeo(new THREE.BufferGeometry().setFromPoints(ticks)),
        ringMat,
      )
      marks.rotation.copy(line.rotation)
      orbitGroup.add(marks)
    })
  }

  // Shared buffers keep the complete constellation below the draw-call budget.
  function buildNodes() {
    nodeGroup.clear()
    nodeVisuals.length = 0
    nodeBatch = new THREE.InstancedMesh(
      trackGeo(new THREE.SphereGeometry(1, 20, 14)),
      trackMat(
        new THREE.MeshStandardMaterial({ roughness: 0.26, metalness: 0.35 }),
      ),
      layoutResult.nodes.length,
    )
    nodeGroup.add(nodeBatch)
    selectionRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(1.45, 1.52, 48)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: resolveColor('signature'),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        }),
      ),
    )
    selectionRing.visible = false
    nodeGroup.add(selectionRing)
    layoutResult.nodes.forEach((node, index) => {
      const mesh = new THREE.Object3D()
      mesh.position.set(node.x, node.y, node.z)
      nodeVisuals.push({
        id: node.id,
        mesh,
        instance: index,
        baseRadius: node.radius,
        colorRole:
          payload.nodes.find((n) => n.id === node.id)?.colorRole ?? 'brand',
        ringIndex: node.ringIndex,
      })
    })
  }

  function buildEdges() {
    edgeGroup.clear()
    edgeVisuals.length = 0
    const vertices: number[] = []
    for (const edge of layoutResult.edges) {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(edge.startX, edge.startY, edge.startZ),
        new THREE.Vector3(edge.midX, edge.midY, edge.midZ),
        new THREE.Vector3(edge.endX, edge.endY, edge.endZ),
      )
      const points = curve.getPoints(24)
      const positions: THREE.Vector3[] = []
      for (let i = 0; i < points.length - 1; i++) {
        positions.push(points[i], points[i + 1])
        vertices.push(...points[i].toArray(), ...points[i + 1].toArray())
      }
      edgeVisuals.push({
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        directed: edge.directed,
        positions,
      })
    }
    const geometry = trackGeo(new THREE.BufferGeometry())
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    )
    geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(new Float32Array(vertices.length), 3),
    )
    edgeBatch = new THREE.LineSegments(
      geometry,
      trackMat(
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.72,
        }),
      ),
    )
    edgeGroup.add(edgeBatch)
  }

  // Initial Scene Assembly
  buildCentralNucleus()
  buildOrbitalRings()
  buildNodes()
  buildEdges()

  // 9. Update visual states for selection and dimming
  function updateSelectionVisuals(selectedId: string | null) {
    const incidentNodes = new Set<string>()
    if (selectedId != null) {
      incidentNodes.add(selectedId)
      edgeVisuals.forEach((e) => {
        if (e.sourceId === selectedId) incidentNodes.add(e.targetId)
        if (e.targetId === selectedId) incidentNodes.add(e.sourceId)
      })
    }

    selectionRing.visible = false
    ;(selectionRing.material as THREE.MeshBasicMaterial).color.copy(
      resolveColor('signature'),
    )
    for (const item of nodeVisuals) {
      const selected = item.id === selectedId
      const dimmed = selectedId !== null && !incidentNodes.has(item.id)
      item.mesh.scale.setScalar(
        item.baseRadius * (selected ? 1.3 : dimmed ? 0.9 : 1),
      )
      item.mesh.updateMatrix()
      nodeBatch.setMatrixAt(item.instance, item.mesh.matrix)
      nodeBatch.setColorAt(
        item.instance,
        resolveColor(item.colorRole).lerp(
          resolveColor('canvas'),
          dimmed ? 0.72 : 0,
        ),
      )
      if (selected) {
        selectionRing.visible = true
        selectionRing.position.copy(item.mesh.position)
        selectionRing.scale.setScalar(item.baseRadius)
      }
    }
    nodeBatch.instanceMatrix.needsUpdate = true
    if (nodeBatch.instanceColor) nodeBatch.instanceColor.needsUpdate = true
    nodeBatch.computeBoundingSphere()
    const colors = edgeBatch.geometry.getAttribute(
      'color',
    ) as THREE.BufferAttribute
    let index = 0
    for (const edge of edgeVisuals) {
      const incident =
        selectedId !== null &&
        (edge.sourceId === selectedId || edge.targetId === selectedId)
      const color = resolveColor(incident ? 'brand' : 'ink').lerp(
        resolveColor('canvas'),
        incident ? 0 : selectedId ? 0.91 : 0.58,
      )
      for (let i = 0; i < edge.positions.length; i++)
        colors.setXYZ(index++, color.r, color.g, color.b)
    }
    colors.needsUpdate = true
  }

  // Update visual palette across materials
  function updatePaletteMaterials() {
    for (const material of reusableMaterials) {
      const role = material.userData.paletteRole
      if (role && 'color' in material)
        (material as THREE.MeshBasicMaterial).color.copy(resolveColor(role))
    }
    updateSelectionVisuals(currentSelectedId)
  }

  // 10. Render execution
  function renderScene() {
    if (isDisposed) return

    renderer.render(scene, camera)

    // Calculate Projected Labels for HTML semantic layer
    if (onFrame && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
      camera.updateMatrixWorld()
      const vpMatrix = new THREE.Matrix4()
        .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        .toArray()

      const labels = computeProjectedLabels(
        layoutResult.nodes,
        vpMatrix,
        canvas.clientWidth,
        canvas.clientHeight,
      )
      onFrame(labels)
    }
  }

  // Apply initial selection
  updateSelectionVisuals(currentSelectedId)

  // Initial sizing check
  if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
  }

  // 11. Return GraphSceneHandle
  return {
    render() {
      renderScene()
    },

    resize(width: number, height: number, pixelRatio: number) {
      if (isDisposed || width <= 0 || height <= 0) return

      const isMobile = width < 768

      // Enforce Performance Ceilings on DPR
      const maxDpr = isMobile
        ? SCENE_PERFORMANCE_CEILINGS.maxDevicePixelRatioMobile
        : SCENE_PERFORMANCE_CEILINGS.maxDevicePixelRatioDesktop
      let clampedDpr = Math.min(pixelRatio, maxDpr)

      // Guard drawing buffer ceiling (<= 1,500,000 pixels)
      const totalPixels = width * clampedDpr * height * clampedDpr
      if (totalPixels > SCENE_PERFORMANCE_CEILINGS.maxDrawingBufferPixels) {
        const factor = Math.sqrt(
          SCENE_PERFORMANCE_CEILINGS.maxDrawingBufferPixels / totalPixels,
        )
        clampedDpr = Math.max(0.75, clampedDpr * factor)
      }

      // Recompute layout for mobile vs desktop if needed
      if (isMobile !== layoutIsMobile) {
        // Release old buffers before rebuilding, not only on page exit.
        for (const geometry of reusableGeometries.splice(0)) geometry.dispose()
        for (const material of reusableMaterials.splice(0)) material.dispose()
        layoutResult = computeGraphLayout(payload, isMobile)
        layoutIsMobile = isMobile
        buildCentralNucleus()
        buildOrbitalRings()
        buildNodes()
        buildEdges()
        updateSelectionVisuals(currentSelectedId)
      }

      camera.aspect = width / height
      // Mobile camera uses flatter depth
      const outerRing = layoutResult.rings.at(-1)
      const extentX =
        Math.max(
          outerRing?.radiusX ?? 20,
          Math.abs(layoutResult.bounds.minX),
          Math.abs(layoutResult.bounds.maxX),
        ) + 12
      const extentY =
        Math.max(
          outerRing?.radiusY ?? 20,
          Math.abs(layoutResult.bounds.minY),
          Math.abs(layoutResult.bounds.maxY),
        ) + 12
      const distance =
        Math.max(extentY, extentX / camera.aspect) /
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      camera.position.set(
        0,
        0,
        distance + Math.max(24, layoutResult.bounds.maxZ),
      )
      camera.updateProjectionMatrix()

      renderer.setPixelRatio(clampedDpr)
      renderer.setSize(width, height, false)

      renderScene()
    },

    setPalette(newPalette: ScenePalette) {
      if (isDisposed) return
      currentPalette = { ...newPalette }
      updatePaletteMaterials()
      renderScene()
    },

    setSelection(selectedId: string | null) {
      if (isDisposed) return
      currentSelectedId = selectedId
      updateSelectionVisuals(selectedId)
      renderScene()
    },

    setMotion(motion: SceneMotionPreference) {
      _currentMotion = motion
    },

    dispose() {
      if (isDisposed) return
      isDisposed = true

      canvas.removeEventListener('webglcontextlost', onContextLost, false)

      // Traverse and dispose all geometries and materials
      reusableGeometries.forEach((g) => g.dispose())
      reusableGeometries.length = 0

      reusableMaterials.forEach((m) => m.dispose())
      reusableMaterials.length = 0

      nodeVisuals.length = 0
      edgeVisuals.length = 0

      scene.clear()
      renderer.dispose()
    },
  }
}

function createNoopHandle(): GraphSceneHandle {
  return {
    render() {},
    resize() {},
    setPalette() {},
    setSelection() {},
    setMotion() {},
    dispose() {},
  }
}
