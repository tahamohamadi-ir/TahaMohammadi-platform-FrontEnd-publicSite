/**
 * CA-05 — Graph Selection and Accessible Native-Control Enhancement.
 *
 * Implements the locked `GraphControllerFactory` interface (`scene-contract.ts`).
 *
 * Rules and Technical Boundaries (DESIGN-SPEC §§4, 5):
 * - Single source of truth: Controller owns native selection state (`selectedId`).
 * - Native-first semantics: Enhances `<details>` / `<summary>` nodes without
 *   creating a second conflicting keyboard tree.
 * - Same model for native controls and hit tests: Interacting with projected
 *   HTML labels or canvas hits routes through `select(id)`.
 * - Focus does not unexpectedly navigate. Follow link navigates normally.
 * - Escape clears selection and returns focus to the initiating control.
 * - No wheel capture!
 * - Clean disposal: Detaches listeners, clears references, avoids duplicate handlers on remount.
 */

import type {
  GraphControllerFactory,
  GraphControllerHandle,
  GraphControllerOptions,
  GraphSelectionState,
} from './scene-contract'

export interface EnhancedGraphControllerOptions extends GraphControllerOptions {
  /** Root container element enclosing the graph region */
  container?: HTMLElement | null
  /** Container element containing projected HTML labels */
  labelsContainer?: HTMLElement | null
  /** Reserved detail panel element */
  detailElement?: HTMLElement | null
  /** Callback fired when Escape clears selection */
  onEscape?: () => void
}

/**
 * Creates a graph controller managing native selection and accessible DOM sync.
 */
export const createGraphController: GraphControllerFactory = (
  options: EnhancedGraphControllerOptions = {},
): GraphControllerHandle => {
  const {
    container = null,
    labelsContainer = null,
    detailElement = null,
    onSelectionChange,
    onEscape,
  } = options

  let selectedId: string | null = options.initialSelectedId ?? null
  let lastInitiatingElement: HTMLElement | null = null
  let isDisposed = false

  // Track listener cleanup functions
  const cleanups: Array<() => void> = []

  // Helper to sync DOM attributes with current selection
  function syncDom(id: string | null) {
    if (!container && !labelsContainer && !detailElement) return

    // 1. Sync Node Elements ([data-graph-node])
    if (container) {
      const nodeElements =
        container.querySelectorAll<HTMLElement>('[data-graph-node]')
      nodeElements.forEach((el) => {
        const nodeId = el.getAttribute('data-graph-node')
        const isSelected = nodeId === id

        el.setAttribute('data-selected', isSelected ? 'true' : 'false')

        // If the element is or contains a <details> element
        const detailsEl =
          el.tagName.toLowerCase() === 'details'
            ? (el as HTMLDetailsElement)
            : el.querySelector<HTMLDetailsElement>('details')

        if (detailsEl) {
          detailsEl.open = isSelected
        }

        // If there's a summary or button, update aria attributes
        const summaryEl =
          el.querySelector('summary') || el.querySelector('button')
        if (summaryEl) {
          summaryEl.setAttribute('aria-expanded', isSelected ? 'true' : 'false')
        }
      })

      // 2. Sync Edge Elements ([data-graph-edge])
      const edgeElements =
        container.querySelectorAll<HTMLElement>('[data-graph-edge]')
      edgeElements.forEach((el) => {
        const source = el.getAttribute('data-source')
        const target = el.getAttribute('data-target')
        const isEmphasized = id != null && (source === id || target === id)
        const isDimmed = id != null && !isEmphasized

        el.setAttribute('data-emphasized', isEmphasized ? 'true' : 'false')
        el.setAttribute('data-dimmed', isDimmed ? 'true' : 'false')
      })
    }

    // 3. Sync Projected HTML Labels ([data-projected-label])
    if (labelsContainer) {
      const labelElements = labelsContainer.querySelectorAll<HTMLElement>(
        '[data-projected-label]',
      )
      labelElements.forEach((el) => {
        const labelId = el.getAttribute('data-projected-label')
        const isSelected = labelId === id
        el.setAttribute('data-selected', isSelected ? 'true' : 'false')
        el.classList?.toggle?.('is-selected', isSelected)
      })
    }

    // 4. Sync Reserved Detail Panel ([data-graph-detail])
    const detailPanel =
      detailElement ||
      container?.querySelector<HTMLElement>('[data-graph-detail]')
    if (detailPanel) {
      detailPanel.setAttribute(
        'data-has-selection',
        id != null ? 'true' : 'false',
      )
      if (id != null) {
        // If node summary/title exists in the container, populate detail panel
        const nodeEl = container?.querySelector<HTMLElement>(
          `[data-graph-node="${id}"]`,
        )
        const label =
          nodeEl?.getAttribute('data-label') ||
          nodeEl?.querySelector('summary')?.textContent ||
          id
        const summary =
          nodeEl?.getAttribute('data-summary') ||
          nodeEl?.querySelector('.hg-node__summary-text')?.textContent ||
          ''

        const detailTitle = detailPanel.querySelector<HTMLElement>(
          '[data-detail-title]',
        )
        const detailBody =
          detailPanel.querySelector<HTMLElement>('[data-detail-body]')

        if (detailTitle) detailTitle.textContent = label.trim()
        if (detailBody) detailBody.textContent = summary.trim()
      }
    }
  }

  // Handle selection update
  function applySelection(id: string | null, initiator?: HTMLElement | null) {
    if (isDisposed) return
    selectedId = id
    if (initiator) {
      lastInitiatingElement = initiator
    }

    syncDom(selectedId)
    onSelectionChange?.({ selectedId })
  }

  // Bind container interactions
  if (container) {
    // Click delegation for node summaries and links
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      // Allow normal navigation on anchors inside node details or detail panel
      if (target.closest('a')) {
        return
      }

      // Check if clicked inside a summary or node item
      const summary = target.closest('summary')
      const nodeEl = target.closest<HTMLElement>('[data-graph-node]')

      if (nodeEl) {
        const nodeId = nodeEl.getAttribute('data-graph-node')
        if (nodeId) {
          event.preventDefault()
          // If clicking an already selected node via its summary, toggle/close it
          if (summary && nodeId === selectedId) {
            applySelection(null, summary)
          } else {
            applySelection(nodeId, summary || nodeEl)
          }
        }
      }
    }

    // Keyboard navigation: Escape clears selection
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectedId != null) {
          event.preventDefault()
          const focusTarget = lastInitiatingElement
          applySelection(null)
          if (focusTarget && typeof focusTarget.focus === 'function') {
            focusTarget.focus({ preventScroll: true })
          }
          onEscape?.()
        }
      }
    }

    container.addEventListener('click', handleClick)
    container.addEventListener('keydown', handleKeyDown)

    cleanups.push(() => {
      container.removeEventListener('click', handleClick)
      container.removeEventListener('keydown', handleKeyDown)
    })

    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeyDown)
      cleanups.push(() => {
        document.removeEventListener('keydown', handleKeyDown)
      })
    }
  }

  // Bind projected HTML labels click delegation
  if (labelsContainer) {
    const handleLabelClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const labelEl = target.closest<HTMLElement>('[data-projected-label]')
      if (labelEl) {
        const labelId = labelEl.getAttribute('data-projected-label')
        if (labelId) {
          event.preventDefault()
          if (labelId === selectedId) {
            applySelection(null, labelEl)
          } else {
            applySelection(labelId, labelEl)
          }
        }
      }
    }

    labelsContainer.addEventListener('click', handleLabelClick)
    cleanups.push(() => {
      labelsContainer.removeEventListener('click', handleLabelClick)
    })
  }

  // Initial sync
  if (selectedId != null) {
    syncDom(selectedId)
  }

  return {
    select(id: string | null) {
      applySelection(id)
    },

    clearSelection(returnFocusTo?: HTMLElement | null) {
      const target = returnFocusTo ?? lastInitiatingElement
      applySelection(null)
      if (target && typeof target.focus === 'function') {
        target.focus({ preventScroll: true })
      }
      lastInitiatingElement = null
    },

    getState(): GraphSelectionState {
      return { selectedId }
    },

    dispose() {
      if (isDisposed) return
      isDisposed = true

      cleanups.forEach((cleanup) => cleanup())
      cleanups.length = 0
      lastInitiatingElement = null
    },
  }
}
