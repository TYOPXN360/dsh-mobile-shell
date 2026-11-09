/**
 * Cockpit relay — surfaces the remote task console INSIDE the drawer.
 *
 * The task console ("任务控制台") is not ours: `dsh-full-remote` renders it into
 * the shell's `shell.overlay` seat and anchors it to the top-right corner of the
 * frame, where on a phone it covers the conversation header. This module does
 * NOT move, restyle or re-implement that plugin. Instead it:
 *
 * 1. finds the console's own launcher button (`[data-remote-cockpit]` is the
 *    stable marker its plugin stamps),
 * 2. renders a peer row in the drawer's panel list — same glyph slot, same
 *    36px row geometry, same accessible-name shape as 插件/自动化任务/更多,
 * 3. forwards a click to the real launcher, so the console's own state machine,
 *    panel, backdrop and keyboard handling all behave exactly as shipped,
 * 4. hides the floating launcher from the frame corner while the drawer is the
 *    phone's navigation surface.
 *
 * Why a relay and not a portal: the console keeps ownership of its open/closed
 * state, its badge count and its focus trap. Copying those is how integrations
 * rot. Clicking the shipped button is a single, stable contract.
 *
 * Third-party absence is a supported state: when no `[data-remote-cockpit]`
 * exists (the plugin is not installed), the row is simply not rendered.
 */

/** Marker attribute the remote console plugin stamps on its root. */
const COCKPIT_ROOT = '[data-remote-cockpit]'

/** Selector for the console's own launcher button. */
const COCKPIT_LAUNCHER = 'button'

/** Attribute marking the relay row this module inserts. */
export const RELAY_ATTRIBUTE = 'data-dsh-ms-cockpit'

/** Attribute set on the drawer surface to hide the floating launcher. */
export const RELAY_DRAWER_ATTRIBUTE = 'data-dsh-drawer'

/**
 * Handle returned by {@link installCockpitRelay}.
 */
export interface CockpitRelay {
  /** Re-sync the row against the live console (call after a plugin reload). */
  sync(): void
  /** Remove the relay row and restore the floating launcher. */
  dispose(): void
}

/** Read the console's accessible label, minus its trailing count. */
function launcherLabel(launcher: HTMLElement): string {
  const label = launcher.getAttribute('aria-label') ?? ''
  // "任务控制台，0 项待办" / "Task console, 0 pending" → the noun phrase only.
  return label.split(/[，,]/)[0]?.trim() ?? ''
}

/** The badge count the console reports, or an empty string when absent. */
function launcherCount(launcher: HTMLElement): string {
  const count = launcher.querySelector('span[aria-live]')
  return count?.textContent?.trim() ?? ''
}

/**
 * Build one relay row that mirrors the console's own glyph and count.
 * @param launcher - the console's live launcher button.
 * @param onActivate - called after the forwarded click, so the drawer can yield.
 * @returns the row element (a `<button>` so it behaves like its siblings).
 */
function buildRow(launcher: HTMLElement, list: HTMLElement, onActivate: () => void): HTMLButtonElement {
  const row = document.createElement('button')
  row.type = 'button'
  row.setAttribute(RELAY_ATTRIBUTE, '')

  const label = launcherLabel(launcher)
  row.setAttribute('aria-label', label || '任务控制台')
  row.title = label || '任务控制台'

  // Glyph slot: the panel rows wrap their icon in a `panelGlyph` span so the
  // collapsed rail and the open drawer share one layout. Reuse the shipped
  // console icon when it exposes one; otherwise draw the same outline shape.
  const glyph = document.createElement('span')
  glyph.setAttribute('aria-hidden', 'true')
  glyph.dataset.dshMsCockpitGlyph = ''
  // Adopt the sibling glyph wrapper's class so sizes/alignment are the shell's,
  // not this module's guesswork.
  const glyphElement = [...list.querySelectorAll('[class*="panelGlyph"]')][0]
  if (glyphElement !== undefined && glyphElement.className !== '') glyph.className = glyphElement.className
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  icon.setAttribute('width', '16')
  icon.setAttribute('height', '16')
  icon.setAttribute('viewBox', '0 0 16 16')
  icon.setAttribute('fill', 'none')
  icon.setAttribute('aria-hidden', 'true')
  // The shipped rows size their glyph to 16px; an unsized SVG collapses to 0×0
  // and leaves the row looking like a blank line.
  icon.style.width = '16px'
  icon.style.height = '16px'
  icon.style.display = 'block'
  // A "dashboard" outline: three panes, matching the console's own intent.
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M2.2 2.6h11.6v10.8H2.2z M2.2 6.2h11.6 M5.8 6.2v7.2')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '1.2')
  path.setAttribute('stroke-linejoin', 'round')
  icon.appendChild(path)
  glyph.appendChild(icon)
  row.appendChild(glyph)

  // Label text, in the shipped rows' own title class so the drawer's open state
  // shows it and the collapsed rail hides it by the same rule.
  const text = document.createElement('span')
  text.dataset.dshMsCockpitLabel = ''
  text.textContent = label || '任务控制台'
  // Read a NON-EMPTY class from a shipped title, or the drawer label would be
  // unstyled (`className` can legitimately be '' on a rail-only row).
  const titleElement = [...list.querySelectorAll('[class*="panelTitle"]')]
    .find((element) => typeof element.className === 'string' && element.className !== '')
  if (titleElement !== undefined) text.className = titleElement.className
  row.appendChild(text)

  const count = launcherCount(launcher)
  if (count !== '' && count !== '0') {
    const badge = document.createElement('span')
    badge.dataset.dshMsCockpitCount = ''
    badge.textContent = count
    row.appendChild(badge)
  }

  row.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    // Forward to the shipped control FIRST: it owns the panel, the state and the
    // focus trap, and it must receive the click while the drawer is still up so
    // the two layers do not race. Yielding the drawer afterwards is purely a
    // presentation step — the console panel lives in the frame overlay, above
    // the drawer, so closing the drawer reveals it rather than hiding it.
    launcher.click()
    onActivate()
  })

  return row
}

/** Options for {@link installCockpitRelay}. */
export interface CockpitRelayOptions {
  /**
   * Called right after the console's launcher was activated. Used to close the
   * drawer, so the phone ends up looking at the console rather than at the
   * navigation it was chosen from.
   */
  onActivate: () => void
}

/**
 * Keep a relay row inside the drawer's panel list.
 *
 * The list is owned by the shell and re-rendered by React, so the row is
 * re-attached by a mutation observer whenever React removes it. A stable marker
 * keeps the two implementations from fighting: this module only ever inserts
 * when no row is present.
 * @param options - activation callback (see {@link CockpitRelayOptions}).
 * @returns the relay handle.
 */
export function installCockpitRelay(options: CockpitRelayOptions): CockpitRelay {
  let row: HTMLButtonElement | null = null
  let observer: MutationObserver | null = null

  /** Remove the relay row and any badge we own. */
  const removeRow = (): void => {
    row?.remove()
    row = null
  }

  /** Reconcile the row against the current DOM. */
  const sync = (): void => {
    const launcher = document.querySelector<HTMLElement>(`${COCKPIT_ROOT} ${COCKPIT_LAUNCHER}`)
    const list = document.querySelector<HTMLElement>('[class*="panelList"]')

    // No console or no drawer list: nothing to mirror.
    if (launcher === null || list === null) {
      removeRow()
      return
    }

    // Rebuild when the badge/label changed (the console re-renders its count).
    const existing = list.querySelector<HTMLButtonElement>(`[${RELAY_ATTRIBUTE}]`)
    const expectedCount = launcherCount(launcher)
    if (existing !== null) {
      const shown = existing.querySelector('[data-dsh-ms-cockpit-count]')?.textContent?.trim() ?? '0'
      if (shown === (expectedCount === '' ? '0' : expectedCount)) {
        row = existing
        return
      }
      existing.remove()
    }

    const next = buildRow(launcher, list, options.onActivate)
    // Adopt a sibling's class so the row inherits the shipped styling (36px
    // box, 12px radius, glyph alignment, rail behaviour) instead of this module
    // redefining it — the one thing that would drift on a host upgrade.
    const siblings = [...list.querySelectorAll('button')].filter((button) => !button.hasAttribute(RELAY_ATTRIBUTE))
    const sibling = siblings[0]
    if (sibling !== undefined) next.className = sibling.className

    // Placement: immediately BEFORE the trailing "更多" anchor, so the console
    // reads as a peer of 插件 / 自动化任务 rather than something appended after
    // the overflow menu. The anchor is a wrapper span whose last child is the
    // more-button, so insert before the wrapper.
    const moreAnchor = list.querySelector('[class*="moreAnchor"]')
    if (moreAnchor !== null && moreAnchor.parentElement === list) {
      list.insertBefore(next, moreAnchor)
    } else {
      list.appendChild(next)
    }
    row = next
  }

  observer = new MutationObserver(() => sync())
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributeFilter: ['aria-label'],
  })
  sync()

  return {
    sync,
    dispose: () => {
      observer?.disconnect()
      observer = null
      removeRow()
    },
  }
}
