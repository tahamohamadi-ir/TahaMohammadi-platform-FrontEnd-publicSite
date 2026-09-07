/**
 * CA-05 — Unit tests for graph-controller.ts.
 *
 * Runs in Vitest node environment with lightweight DOM mocks.
 * Verifies:
 * - Deterministic selection state management.
 * - Native DOM synchronization (<details>, <summary>, aria attributes, edge emphasis).
 * - Projected label synchronization.
 * - Keyboard Escape handling and focus restoration.
 * - Non-interference with regular anchor navigation.
 * - Clean disposal and remounting safety without duplicate listeners.
 */

import { describe, expect, it, vi } from 'vitest'
import {
  createGraphController,
  type EnhancedGraphControllerOptions,
} from './graph-controller'

interface MockEvent {
  type: string
  key?: string
  target?: unknown
  preventDefault?: () => void
}

// Lightweight Mock DOM implementation for Node test environment
class MockElement {
  tagName: string
  attributes: Map<string, string> = new Map()
  classList = {
    classes: new Set<string>(),
    add: (cls: string) => this.classList.classes.add(cls),
    remove: (cls: string) => this.classList.classes.delete(cls),
    contains: (cls: string) => this.classList.classes.has(cls),
    toggle: (cls: string, force?: boolean) => {
      const should =
        force !== undefined ? force : !this.classList.classes.has(cls)
      if (should) this.classList.classes.add(cls)
      else this.classList.classes.delete(cls)
      return should
    },
  }
  children: MockElement[] = []
  parent: MockElement | null = null
  listeners: Map<string, Array<(event: MockEvent) => void>> = new Map()
  textContent: string = ''
  open: boolean = false
  isFocused: boolean = false

  constructor(tagName: string, text = '') {
    this.tagName = tagName.toUpperCase()
    this.textContent = text
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null
  }

  appendChild(child: MockElement) {
    child.parent = this
    this.children.push(child)
    return child
  }

  focus() {
    this.isFocused = true
  }

  addEventListener(type: string, handler: (event: MockEvent) => void) {
    const list = this.listeners.get(type) ?? []
    list.push(handler)
    this.listeners.set(type, list)
  }

  removeEventListener(type: string, handler: (event: MockEvent) => void) {
    const list = this.listeners.get(type)
    if (list) {
      this.listeners.set(
        type,
        list.filter((h) => h !== handler),
      )
    }
  }

  dispatchEvent(event: MockEvent) {
    event.target = event.target || this
    const list = this.listeners.get(event.type) ?? []
    list.forEach((h) => h(event))
    if (this.parent) {
      this.parent.dispatchEvent(event)
    }
  }

  closest(selector: string): MockElement | null {
    if (this.matches(selector)) return this
    return this.parent ? this.parent.closest(selector) : null
  }

  matches(selector: string): boolean {
    if (selector.startsWith('[') && selector.endsWith(']')) {
      const inner = selector.slice(1, -1)
      if (inner.includes('=')) {
        const [k, v] = inner.split('=')
        const cleanV = v?.replace(/['"]/g, '')
        return this.attributes.get(k!) === cleanV
      }
      return this.attributes.has(inner)
    }
    return this.tagName.toLowerCase() === selector.toLowerCase()
  }

  querySelector(selector: string): MockElement | null {
    for (const child of this.children) {
      if (child.matches(selector)) return child
      const res = child.querySelector(selector)
      if (res) return res
    }
    return null
  }

  querySelectorAll(selector: string): MockElement[] {
    const results: MockElement[] = []
    for (const child of this.children) {
      if (child.matches(selector)) results.push(child)
      results.push(...child.querySelectorAll(selector))
    }
    return results
  }
}

describe('CA-05 — GraphController', () => {
  function createTestFixture() {
    const container = new MockElement('div')
    container.setAttribute('data-graph-region', '')

    const list = new MockElement('ul')
    container.appendChild(list)

    // Node 1
    const node1 = new MockElement('li')
    node1.setAttribute('data-graph-node', 'node-01')
    node1.setAttribute('data-label', 'Node 1')
    node1.setAttribute('data-summary', 'Summary of Node 1')

    const details1 = new MockElement('details')
    const summary1 = new MockElement('summary', 'Node 1')
    const body1 = new MockElement('div')
    const link1 = new MockElement('a', 'Related Link')
    link1.setAttribute('href', '/en/projects/1')
    link1.setAttribute('data-related-link', '')

    body1.appendChild(link1)
    details1.appendChild(summary1)
    details1.appendChild(body1)
    node1.appendChild(details1)
    list.appendChild(node1)

    // Node 2
    const node2 = new MockElement('li')
    node2.setAttribute('data-graph-node', 'node-02')
    node2.setAttribute('data-label', 'Node 2')
    node2.setAttribute('data-summary', 'Summary of Node 2')

    const details2 = new MockElement('details')
    const summary2 = new MockElement('summary', 'Node 2')
    details2.appendChild(summary2)
    node2.appendChild(details2)
    list.appendChild(node2)

    // Edge
    const edge = new MockElement('div')
    edge.setAttribute('data-graph-edge', 'edge-01')
    edge.setAttribute('data-source', 'node-01')
    edge.setAttribute('data-target', 'node-02')
    container.appendChild(edge)

    // Detail Panel
    const detailPanel = new MockElement('div')
    detailPanel.setAttribute('data-graph-detail', '')
    const detailTitle = new MockElement('h3')
    detailTitle.setAttribute('data-detail-title', '')
    const detailBody = new MockElement('p')
    detailBody.setAttribute('data-detail-body', '')
    detailPanel.appendChild(detailTitle)
    detailPanel.appendChild(detailBody)
    container.appendChild(detailPanel)

    // Projected Labels Container
    const labelsContainer = new MockElement('div')
    const label1 = new MockElement('div', 'Node 1')
    label1.setAttribute('data-projected-label', 'node-01')
    const label2 = new MockElement('div', 'Node 2')
    label2.setAttribute('data-projected-label', 'node-02')
    labelsContainer.appendChild(label1)
    labelsContainer.appendChild(label2)

    return {
      container,
      node1,
      node2,
      summary1,
      summary2,
      details1,
      details2,
      edge,
      detailPanel,
      detailTitle,
      detailBody,
      labelsContainer,
      label1,
      label2,
      link1,
    }
  }

  it('initializes with null or specified selection state', () => {
    const controller = createGraphController()
    expect(controller.getState().selectedId).toBeNull()

    const controllerWithInit = createGraphController({
      initialSelectedId: 'node-01',
    })
    expect(controllerWithInit.getState().selectedId).toBe('node-01')
  })

  it('updates selection state and dispatches onSelectionChange', () => {
    const onSelectionChange = vi.fn()
    const controller = createGraphController({ onSelectionChange })

    controller.select('node-01')
    expect(controller.getState().selectedId).toBe('node-01')
    expect(onSelectionChange).toHaveBeenCalledTimes(1)
    expect(onSelectionChange).toHaveBeenCalledWith({ selectedId: 'node-01' })

    controller.select(null)
    expect(controller.getState().selectedId).toBeNull()
    expect(onSelectionChange).toHaveBeenCalledTimes(2)
    expect(onSelectionChange).toHaveBeenCalledWith({ selectedId: null })
  })

  it('synchronizes native DOM nodes and details elements on selection', () => {
    const fixture = createTestFixture()

    const controller = createGraphController({
      container: fixture.container as unknown as HTMLElement,
      labelsContainer: fixture.labelsContainer as unknown as HTMLElement,
    } as EnhancedGraphControllerOptions)

    // Initially unselected
    expect(fixture.node1.getAttribute('data-selected')).toBeNull()
    expect(fixture.details1.open).toBe(false)

    // Select node-01
    controller.select('node-01')

    expect(fixture.node1.getAttribute('data-selected')).toBe('true')
    expect(fixture.details1.open).toBe(true)
    expect(fixture.node2.getAttribute('data-selected')).toBe('false')
    expect(fixture.details2.open).toBe(false)

    // Edge emphasis
    expect(fixture.edge.getAttribute('data-emphasized')).toBe('true')

    // Detail panel
    expect(fixture.detailPanel.getAttribute('data-has-selection')).toBe('true')
    expect(fixture.detailTitle.textContent).toBe('Node 1')
    expect(fixture.detailBody.textContent).toBe('Summary of Node 1')

    // Projected labels
    expect(fixture.label1.getAttribute('data-selected')).toBe('true')
    expect(fixture.label2.getAttribute('data-selected')).toBe('false')

    controller.dispose()
  })

  it('handles click events on native node summaries', () => {
    const fixture = createTestFixture()
    const onSelectionChange = vi.fn()

    const controller = createGraphController({
      container: fixture.container as unknown as HTMLElement,
      onSelectionChange,
    } as EnhancedGraphControllerOptions)

    // Click summary 1
    fixture.summary1.dispatchEvent({
      type: 'click',
      target: fixture.summary1,
      preventDefault: vi.fn(),
    })

    expect(controller.getState().selectedId).toBe('node-01')
    expect(onSelectionChange).toHaveBeenCalledWith({ selectedId: 'node-01' })

    // Clicking already selected summary toggles selection to null
    fixture.summary1.dispatchEvent({
      type: 'click',
      target: fixture.summary1,
      preventDefault: vi.fn(),
    })

    expect(controller.getState().selectedId).toBeNull()
    controller.dispose()
  })

  it('handles click events on projected HTML labels', () => {
    const fixture = createTestFixture()
    const onSelectionChange = vi.fn()

    const controller = createGraphController({
      container: fixture.container as unknown as HTMLElement,
      labelsContainer: fixture.labelsContainer as unknown as HTMLElement,
      onSelectionChange,
    } as EnhancedGraphControllerOptions)

    fixture.label2.dispatchEvent({
      type: 'click',
      target: fixture.label2,
      preventDefault: vi.fn(),
    })

    expect(controller.getState().selectedId).toBe('node-02')
    expect(onSelectionChange).toHaveBeenCalledWith({ selectedId: 'node-02' })

    controller.dispose()
  })

  it('does not intercept regular anchor link clicks', () => {
    const fixture = createTestFixture()
    const preventDefault = vi.fn()

    const controller = createGraphController({
      container: fixture.container as unknown as HTMLElement,
    } as EnhancedGraphControllerOptions)

    fixture.link1.dispatchEvent({
      type: 'click',
      target: fixture.link1,
      preventDefault,
    })

    // Normal link click should not be prevented
    expect(preventDefault).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('clears selection and restores focus on Escape key', () => {
    const fixture = createTestFixture()
    const onEscape = vi.fn()

    const controller = createGraphController({
      container: fixture.container as unknown as HTMLElement,
      onEscape,
    } as EnhancedGraphControllerOptions)

    // Select node-01 by clicking summary 1
    fixture.summary1.dispatchEvent({
      type: 'click',
      target: fixture.summary1,
      preventDefault: vi.fn(),
    })
    expect(controller.getState().selectedId).toBe('node-01')

    // Press Escape
    const preventDefault = vi.fn()
    fixture.container.dispatchEvent({
      type: 'keydown',
      key: 'Escape',
      target: fixture.container,
      preventDefault,
    })

    expect(controller.getState().selectedId).toBeNull()
    expect(onEscape).toHaveBeenCalledTimes(1)
    expect(fixture.summary1.isFocused).toBe(true)

    controller.dispose()
  })

  it('disposes cleanly and removes all listeners without memory leak', () => {
    const fixture = createTestFixture()
    const onSelectionChange = vi.fn()

    const controller = createGraphController({
      container: fixture.container as unknown as HTMLElement,
      onSelectionChange,
    } as EnhancedGraphControllerOptions)

    controller.dispose()

    // Subsequent clicks should have no effect
    fixture.summary1.dispatchEvent({
      type: 'click',
      target: fixture.summary1,
      preventDefault: vi.fn(),
    })

    expect(onSelectionChange).not.toHaveBeenCalled()
  })
})
