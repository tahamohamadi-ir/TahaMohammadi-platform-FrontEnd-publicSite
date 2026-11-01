/**
 * Progressive enhancement for the mobile nav sheet (Header.astro).
 *
 * The sheet is a native <details>/<summary>: opening and closing it never
 * needs this script. When JS does run, this adds the behaviour a sheet is
 * expected to have — close on Escape, close on an outside/scrim click, a
 * focus trap while open, scroll lock, and returning focus to the trigger
 * on close — without changing what the no-JS fallback already does.
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function enhanceHeaderDrawer(): void {
  const drawer = document.querySelector<HTMLDetailsElement>(
    '.site-header__drawer',
  )
  const scrim = drawer?.querySelector<HTMLElement>('.site-header__drawer-scrim')
  const panel = drawer?.querySelector<HTMLElement>('.site-header__nav--mobile')
  const trigger = drawer?.querySelector<HTMLElement>(
    '.site-header__menu-trigger',
  )
  if (!drawer || !scrim || !panel || !trigger) return

  let lastFocused: HTMLElement | null = null

  const close = () => {
    drawer.open = false
  }

  const focusableInPanel = () =>
    [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
      (el) => el.offsetParent !== null,
    )

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      close()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = focusableInPanel()
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const onDocumentClick = (event: MouseEvent) => {
    if (!drawer.open) return
    if (drawer.contains(event.target as Node)) return
    close()
  }

  drawer.addEventListener('toggle', () => {
    if (drawer.open) {
      lastFocused = document.activeElement as HTMLElement | null
      document.documentElement.style.overflow = 'hidden'
      document.addEventListener('keydown', onKeydown, true)
      document.addEventListener('click', onDocumentClick, true)
      focusableInPanel()[0]?.focus()
    } else {
      document.documentElement.style.overflow = ''
      document.removeEventListener('keydown', onKeydown, true)
      document.removeEventListener('click', onDocumentClick, true)
      ;(lastFocused ?? trigger).focus()
      lastFocused = null
    }
  })

  scrim.addEventListener('click', close)
}
