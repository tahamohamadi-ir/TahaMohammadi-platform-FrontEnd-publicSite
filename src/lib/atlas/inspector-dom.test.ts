import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import type { AtlasPayload } from './model'
import { renderDeferredInspectorPanel } from './inspector-dom'

const here = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(here, '..', '..', '..', 'tests', 'fixtures', 'atlas')

function readPayload(name: string): AtlasPayload {
  return JSON.parse(
    readFileSync(join(fixtureDir, name), 'utf8'),
  ) as AtlasPayload
}

type AttrMap = Map<string, string>

class FakeElement {
  tagName: string
  attributes: AttrMap = new Map()
  children: FakeElement[] = []
  textContent = ''
  href = ''
  ownerDocument: FakeDocument
  parent: FakeElement | null = null

  constructor(tagName: string, doc: FakeDocument) {
    this.tagName = tagName.toUpperCase()
    this.ownerDocument = doc
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null
  }

  hasAttribute(name: string) {
    return this.attributes.has(name)
  }

  toggleAttribute(name: string, force?: boolean) {
    const on = force ?? !this.attributes.has(name)
    if (on) this.attributes.set(name, '')
    else this.attributes.delete(name)
  }

  append(...nodes: Array<FakeElement | FakeText>) {
    for (const node of nodes) {
      if (node instanceof FakeElement) {
        node.parent = this
        this.children.push(node)
      } else {
        this.textContent += node.text
      }
    }
  }

  replaceChildren(...nodes: FakeElement[]) {
    this.children = []
    this.textContent = ''
    this.append(...nodes)
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null
  }

  querySelectorAll(selector: string): FakeElement[] {
    const out: FakeElement[] = []
    const visit = (node: FakeElement) => {
      if (matches(node, selector)) out.push(node)
      for (const child of node.children) visit(child)
    }
    visit(this)
    return out
  }
}

class FakeText {
  text: string
  constructor(text: string) {
    this.text = text
  }
}

class FakeDocument {
  createElement(tag: string) {
    return new FakeElement(tag, this)
  }

  createTextNode(text: string) {
    return new FakeText(text)
  }
}

function matches(node: FakeElement, selector: string): boolean {
  if (selector.startsWith('[') && selector.endsWith(']')) {
    const body = selector.slice(1, -1)
    const eq = body.indexOf('=')
    if (eq === -1) return node.attributes.has(body)
    const name = body.slice(0, eq)
    const value = body.slice(eq + 1).replace(/^"|"$/g, '')
    return node.getAttribute(name) === value
  }
  return false
}

describe('renderDeferredInspectorPanel (Plan D Phase 2)', () => {
  it('mounts a single node panel and clears it on overview', () => {
    const payload = readPayload('en.json')
    const key = payload.nodes[0]?.key
    expect(key).toBeTruthy()

    const doc = new FakeDocument()
    const region = new FakeElement('section', doc)
    region.setAttribute('data-atlas-region', '')
    const prompt = new FakeElement('p', doc)
    prompt.setAttribute('data-atlas-inspector-prompt', '')
    const announcement = new FakeElement('p', doc)
    announcement.setAttribute('data-atlas-announcement', '')
    const mount = new FakeElement('div', doc)
    mount.setAttribute('data-atlas-inspector-mount', '')
    region.append(prompt, announcement, mount)

    renderDeferredInspectorPanel(
      region as unknown as HTMLElement,
      payload,
      { kind: 'node', key: key! },
      doc as unknown as Document,
    )

    expect(mount.querySelectorAll('[data-atlas-inspector-node]')).toHaveLength(
      1,
    )
    expect(prompt.hasAttribute('hidden')).toBe(true)

    renderDeferredInspectorPanel(
      region as unknown as HTMLElement,
      payload,
      null,
      doc as unknown as Document,
    )
    expect(mount.children).toHaveLength(0)
    expect(prompt.hasAttribute('hidden')).toBe(false)
  })
})
