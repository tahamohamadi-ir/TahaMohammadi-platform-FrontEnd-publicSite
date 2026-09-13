/**
 * RU-02 — Disposal ledger.
 *
 * Every geometry, material and listener the universe creates is registered here
 * and released exactly once. Centralising it is what makes "dispose all
 * geometries/materials/listeners" auditable: the scene builders cannot forget a
 * resource, and a re-render (theme, resize, mobile↔desktop) can release a
 * generation of buffers without touching the rest of the scene.
 */

import * as THREE from 'three'

export interface UniverseRenderStats {
  triangles: number
  drawCalls: number
  geometries: number
  materials: number
}

export interface DisposalTarget {
  dispose(): void
}

export class UniverseLedger {
  private geometries: THREE.BufferGeometry[] = []
  private materials: THREE.Material[] = []
  private listeners: Array<() => void> = []
  private disposed = false

  /** Register a geometry for deterministic release. */
  track<T extends THREE.BufferGeometry>(geometry: T): T {
    this.geometries.push(geometry)
    return geometry
  }

  /** Register a material for deterministic release. */
  trackMaterial<T extends THREE.Material>(material: T): T {
    this.materials.push(material)
    return material
  }

  /**
   * Register a listener with its remover, so a scene teardown cannot leave a
   * dangling handler on the window, canvas or theme bus. The target is typed
   * loosely on purpose: the engine attaches to browsers' DOM objects, which are
   * not structurally identical in every environment the unit tests run in.
   */
  listen(
    target: unknown,
    type: string,
    handler: (...args: never[]) => void,
    options?: AddEventListenerOptions | boolean,
  ): void {
    const typed = target as {
      addEventListener(
        type: string,
        handler: unknown,
        options?: AddEventListenerOptions | boolean,
      ): void
      removeEventListener(
        type: string,
        handler: unknown,
        options?: AddEventListenerOptions | boolean,
      ): void
    }
    if (typeof typed?.addEventListener !== 'function') return
    typed.addEventListener(type, handler, options)
    this.listeners.push(() => typed.removeEventListener(type, handler, options))
  }

  /**
   * Release the current generation of GPU resources and drop the references.
   * Used by both full disposal and a layout regeneration (mobile↔desktop).
   */
  releaseGeometry(): void {
    for (const geometry of this.geometries.splice(0)) geometry.dispose()
    for (const material of this.materials.splice(0)) material.dispose()
  }

  /** Release everything, including listeners. Safe to call twice. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const remove of this.listeners.splice(0)) {
      try {
        remove()
      } catch {
        // A browser that already tore the target down must not block teardown.
      }
    }
    this.releaseGeometry()
  }

  get isDisposed(): boolean {
    return this.disposed
  }

  get counts(): { geometries: number; materials: number; listeners: number } {
    return {
      geometries: this.geometries.length,
      materials: this.materials.length,
      listeners: this.listeners.length,
    }
  }

  /**
   * Measured render cost for the same budgets the Home hero already declares
   * (`SCENE_PERFORMANCE_CEILINGS`): triangles and draw calls come from the
   * renderer info, so the assertions in tests use real numbers.
   */
  static statsFromRenderer(
    renderer: THREE.WebGLRenderer,
    live: { geometries: number; materials: number },
  ): UniverseRenderStats {
    const info = renderer.info
    return {
      triangles: info.render.triangles,
      drawCalls: info.render.calls,
      geometries: live.geometries,
      materials: live.materials,
    }
  }

  isTracking(geometry: THREE.BufferGeometry): boolean {
    return this.geometries.includes(geometry)
  }
}
