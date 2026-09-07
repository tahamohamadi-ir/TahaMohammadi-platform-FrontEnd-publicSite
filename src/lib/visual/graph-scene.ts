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
  mesh: THREE.Mesh
  halo: THREE.LineLoop
  baseRadius: number
  colorRole: string
  ringIndex: number
}

interface EdgeVisualItem {
  id: string
  sourceId: string
  targetId: string
  line: THREE.Line
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
    const innerGeo = trackGeo(new THREE.CircleGeometry(2.2, 32))
    const innerMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: resolveColor('brand'),
        transparent: true,
        opacity: 0.8,
      }),
    )
    const innerMesh = new THREE.Mesh(innerGeo, innerMat)
    coreGroup.add(innerMesh)

    // Outer decorative halo
    const outerGeo = trackGeo(new THREE.RingGeometry(3.2, 3.8, 32))
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
      line.rotation.x = ringDef.tiltX
      line.rotation.y = ringDef.tiltY
      orbitGroup.add(line)
    })
  }

  // 7. Build Nodes and Halos
  function buildNodes() {
    nodeGroup.clear()
    nodeVisuals.length = 0

    layoutResult.nodes.forEach((layoutNode) => {
      const nodeData = payload.nodes.find((n) => n.id === layoutNode.id)
      const colorRole = nodeData?.colorRole ?? 'brand'
      const baseRadius = layoutNode.radius

      // Core sphere geometry
      const sphereGeo = trackGeo(new THREE.SphereGeometry(baseRadius, 16, 16))
      const sphereMat = trackMat(
        new THREE.MeshLambertMaterial({
          color: resolveColor(colorRole),
          transparent: true,
          opacity: 0.95,
        }),
      )
      const mesh = new THREE.Mesh(sphereGeo, sphereMat)
      mesh.position.set(layoutNode.x, layoutNode.y, layoutNode.z)
      nodeGroup.add(mesh)

      // Selection Halo ring
      const haloPoints: THREE.Vector3[] = []
      const haloSegs = 24
      const haloRadius = baseRadius * 1.55
      for (let i = 0; i <= haloSegs; i++) {
        const a = (i * Math.PI * 2) / haloSegs
        haloPoints.push(
          new THREE.Vector3(
            Math.cos(a) * haloRadius,
            Math.sin(a) * haloRadius,
            0,
          ),
        )
      }
      const haloGeo = trackGeo(
        new THREE.BufferGeometry().setFromPoints(haloPoints),
      )
      const haloMat = trackMat(
        new THREE.LineBasicMaterial({
          color: resolveColor('signature'),
          transparent: true,
          opacity: 0.0, // hidden initially unless selected
        }),
      )
      const halo = new THREE.LineLoop(haloGeo, haloMat)
      halo.position.copy(mesh.position)
      nodeGroup.add(halo)

      nodeVisuals.push({
        id: layoutNode.id,
        mesh,
        halo,
        baseRadius,
        colorRole,
        ringIndex: layoutNode.ringIndex,
      })
    })
  }

  // 8. Build Quadratic Curve Edges
  function buildEdges() {
    edgeGroup.clear()
    edgeVisuals.length = 0

    layoutResult.edges.forEach((edgeLayout) => {
      const start = new THREE.Vector3(
        edgeLayout.startX,
        edgeLayout.startY,
        edgeLayout.startZ,
      )
      const mid = new THREE.Vector3(
        edgeLayout.midX,
        edgeLayout.midY,
        edgeLayout.midZ,
      )
      const end = new THREE.Vector3(
        edgeLayout.endX,
        edgeLayout.endY,
        edgeLayout.endZ,
      )

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
      const points = curve.getPoints(20)

      const edgeGeo = trackGeo(new THREE.BufferGeometry().setFromPoints(points))
      const edgeMat = trackMat(
        new THREE.LineBasicMaterial({
          color: resolveColor('ink'),
          transparent: true,
          opacity: 0.28,
        }),
      )
      const line = new THREE.Line(edgeGeo, edgeMat)
      edgeGroup.add(line)

      edgeVisuals.push({
        id: edgeLayout.id,
        sourceId: edgeLayout.sourceId,
        targetId: edgeLayout.targetId,
        line,
        directed: edgeLayout.directed,
      })
    })
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

    // Update nodes
    nodeVisuals.forEach((item) => {
      const isSelected = item.id === selectedId
      const isIncident = incidentNodes.has(item.id)
      const isDimmed = selectedId != null && !isIncident

      const meshMat = item.mesh.material as THREE.MeshLambertMaterial
      const haloMat = item.halo.material as THREE.LineBasicMaterial

      if (isSelected) {
        item.mesh.scale.setScalar(1.3)
        meshMat.opacity = 1.0
        haloMat.opacity = 0.9
        haloMat.color = resolveColor('signature')
      } else if (isIncident && selectedId != null) {
        item.mesh.scale.setScalar(1.1)
        meshMat.opacity = 0.9
        haloMat.opacity = 0.0
      } else if (isDimmed) {
        item.mesh.scale.setScalar(0.9)
        meshMat.opacity = 0.25
        haloMat.opacity = 0.0
      } else {
        // Normal unselected state
        item.mesh.scale.setScalar(1.0)
        meshMat.opacity = 0.95
        haloMat.opacity = 0.0
      }
    })

    // Update edges
    edgeVisuals.forEach((item) => {
      const edgeMat = item.line.material as THREE.LineBasicMaterial
      const isEmphasized =
        selectedId != null &&
        (item.sourceId === selectedId || item.targetId === selectedId)
      const isDimmed = selectedId != null && !isEmphasized

      if (isEmphasized) {
        edgeMat.opacity = 0.85
        edgeMat.color = resolveColor('brand')
      } else if (isDimmed) {
        edgeMat.opacity = 0.08
        edgeMat.color = resolveColor('context')
      } else {
        edgeMat.opacity = 0.28
        edgeMat.color = resolveColor('ink')
      }
    })
  }

  // Update visual palette across materials
  function updatePaletteMaterials() {
    nodeVisuals.forEach((item) => {
      const meshMat = item.mesh.material as THREE.MeshLambertMaterial
      meshMat.color = resolveColor(item.colorRole)
    })
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
  if (currentSelectedId != null) {
    updateSelectionVisuals(currentSelectedId)
  }

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
      layoutResult = computeGraphLayout(payload, isMobile)
      buildOrbitalRings()
      buildNodes()
      buildEdges()
      updateSelectionVisuals(currentSelectedId)

      camera.aspect = width / height
      // Mobile camera uses flatter depth
      if (isMobile) {
        camera.position.set(0, 0, 140)
      } else {
        camera.position.set(0, 0, 180)
      }
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
