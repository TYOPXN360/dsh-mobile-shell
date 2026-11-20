/**
 * Top-left backoff — yield the mobile expand affordance when the host (or
 * another plugin) already owns it.
 *
 * DSH 0.2.2 and later render their own narrow-screen drawer below 768px. The
 * shell mounts the reopen control into the frame's `shell.leading` seat
 * (`[data-shell-leading] [data-sidebar-opener]`), draws the mask, and owns the
 * sidebar column geometry. In that regime this plugin's header button and its
 * fixed sidebar overlay are not merely redundant: the shell's mask sits above
 * the overlay, so the overlay would be unusable. The correct behaviour is to
 * stand down completely and let the shell own the phone drawer.
 *
 * The same rule applies to a third-party mobile navigation toggle. When one is
 * visible (dsh-web-mobile uses `[data-mobile-nav="toggle"]`; anything else that
 * claims the host's top-left chrome seat is caught by the `shell.leading`
 * probe), this plugin hides its own button and stops driving its overlay. One
 * expand control, one drawer owner.
 *
 * The 768–1023px touch range is deliberately different: the shell still uses
 * its 56px rail there and mounts no leading opener. This plugin keeps providing
 * the overlay drawer and its button in that band.
 */

/** Attribute the stylesheet keys on. Set on `<html>` while backing off. */
export const BACKOFF_ATTRIBUTE = 'data-dsh-ms-backoff'

/** Why the plugin is standing down. */
export type BackoffReason = 'native-drawer' | 'foreign-toggle'

/** One backoff observation. */
export interface BackoffState {
  active: boolean
  reason: BackoffReason | null
}

/** Listener signature for backoff changes. */
export type BackoffListener = (state: BackoffState) => void

/**
 * The slice of `Document` this module needs. Declaring it structurally keeps
 * the detector testable without a DOM implementation.
 */
export interface BackoffDocument {
  documentElement: Element
  querySelector(selector: string): Element | null
  querySelectorAll(selector: string): Iterable<Element>
}

/** The host's own narrow-screen drawer mode. */
export const NATIVE_DRAWER_SELECTOR = '[data-sidebar-drawer]'

/** The frame's top-left chrome seat. */
export const HOST_LEADING_SELECTOR = '[data-shell-leading]'

/** The host's reopen control inside that seat. */
export const HOST_OPENER_SELECTOR = '[data-sidebar-opener]'

/** A known third-party (dsh-web-mobile) mobile navigation toggle. */
export const FOREIGN_TOGGLE_SELECTOR = '[data-mobile-nav="toggle"]'

/** Anything inside the host's leading seat is a top-left chrome control. */
export const HOST_LEADING_CONTROL_SELECTOR = `${HOST_LEADING_SELECTOR} :is(button, a, [role="button"])`

/** Our own surfaces never count as competitors. */
const OWN_SURFACE_SELECTOR = '[data-dsh-ms]'

/**
 * Whether an element is actually painted. A hidden node must not trigger the
 * backoff: the host keeps the desktop opener in the DOM across breakpoints, and
 * a `display: none` control cannot be the button the user is competing with.
 * @param element - candidate control.
 * @returns true when it has layout boxes.
 */
export function isRendered(element: Element): boolean {
  if (!element.isConnected) return false
  if (typeof element.getClientRects === 'function') {
    return element.getClientRects().length > 0
  }
  const box = element as HTMLElement
  return box.offsetWidth > 0 || box.offsetHeight > 0
}

/**
 * First visible match for a selector, ignoring this plugin's own controls.
 * @param doc - document-like host.
 * @param selector - candidate selector.
 * @returns the match, or null.
 */
function firstVisible(doc: BackoffDocument, selector: string): Element | null {
  for (const element of doc.querySelectorAll(selector)) {
    if (element.closest(OWN_SURFACE_SELECTOR) !== null) continue
    if (isRendered(element)) return element
  }
  return null
}

/**
 * Decide whether this plugin must yield the top-left affordance.
 *
 * Priority matters: the host's native drawer is a stronger signal than a
 * third-party toggle (it also owns the mask and column geometry), and the
 * host's own opener is reported as `native-drawer` even on a build that does
 * not stamp the frame attribute yet.
 * @param doc - document-like host.
 * @returns the current backoff state.
 */
export function detectBackoff(doc: BackoffDocument): BackoffState {
  if (doc.querySelector(NATIVE_DRAWER_SELECTOR) !== null) {
    return { active: true, reason: 'native-drawer' }
  }
  if (firstVisible(doc, `${HOST_LEADING_SELECTOR} ${HOST_OPENER_SELECTOR}`) !== null) {
    return { active: true, reason: 'native-drawer' }
  }
  if (firstVisible(doc, HOST_LEADING_CONTROL_SELECTOR) !== null) {
    return { active: true, reason: 'foreign-toggle' }
  }
  if (firstVisible(doc, FOREIGN_TOGGLE_SELECTOR) !== null) {
    return { active: true, reason: 'foreign-toggle' }
  }
  return { active: false, reason: null }
}

/** Handle returned by {@link installBackoff}. */
export interface BackoffController {
  /** Current state, without recomputing the DOM. */
  state(): BackoffState
  /** Subscribe to changes; the current state is not replayed. */
  subscribe(listener: BackoffListener): () => void
  /** Recompute immediately (used after a plugin hot-swap). */
  sync(): void
  /** Remove the attribute, observers and listeners. */
  dispose(): void
}

/** Pending recompute, so bursts of mutations collapse into one pass. */
type Pending = { kind: 'raf'; id: number } | { kind: 'timeout'; id: ReturnType<typeof setTimeout> }

/**
 * Watch for a competing top-left control and publish the verdict on `<html>`.
 *
 * The attribute write is synchronous with each state change, so the stylesheet
 * and the drawer lifecycle always agree; the observer only debounces DOM
 * churn. Subscribers are notified AFTER the attribute is written, which lets
 * the drawer close itself without a frame of stale CSS.
 * @param doc - the browser document (or a structural stub in tests).
 * @returns the controller.
 */
export function installBackoff(doc: BackoffDocument): BackoffController {
  let current = detectBackoff(doc)
  let disposed = false
  let pending: Pending | null = null
  let observer: MutationObserver | null = null
  const listeners = new Set<BackoffListener>()

  /** Publish the state to the document. */
  const write = (state: BackoffState): void => {
    const root = doc.documentElement
    if (state.active) root.setAttribute(BACKOFF_ATTRIBUTE, state.reason ?? '')
    else root.removeAttribute(BACKOFF_ATTRIBUTE)
  }

  /** Apply a recomputed state, notifying only when it really changed. */
  const publish = (next: BackoffState): void => {
    if (disposed) return
    if (next.active === current.active && next.reason === current.reason) return
    current = next
    write(next)
    for (const listener of listeners) {
      try {
        listener(next)
      } catch (error) {
        // A subscriber must never break the detector.
        console.warn('dsh-mobile-shell: backoff listener failed', error)
      }
    }
  }

  /** Drop a queued recompute. */
  const cancel = (): void => {
    if (pending === null) return
    if (pending.kind === 'raf') {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(pending.id)
    } else {
      clearTimeout(pending.id)
    }
    pending = null
  }

  /** Recompute now. */
  const reconcile = (): void => {
    pending = null
    publish(detectBackoff(doc))
  }

  /** Queue one recompute for the next frame (or macrotask in tests). */
  const schedule = (): void => {
    if (disposed || pending !== null) return
    if (typeof requestAnimationFrame === 'function') {
      pending = { kind: 'raf', id: requestAnimationFrame(reconcile) }
    } else {
      pending = { kind: 'timeout', id: setTimeout(reconcile, 0) }
    }
  }

  // The initial verdict must be visible before the first paint of the plugin's
  // own button, not one observer tick later.
  write(current)

  if (typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(schedule)
    observer.observe(doc.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      // Visibility flips arrive as style/hidden changes or as a mount/unmount
      // (the host's drawer seat is conditional). A `class` watch would fire on
      // every React render for no signal this module reads.
      attributeFilter: ['data-sidebar-drawer', 'data-sidebar-collapsed', 'hidden', 'aria-hidden', 'style'],
    })
  }

  const onResize = (): void => schedule()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', onResize, { passive: true })
  }

  return {
    state: () => current,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    sync: () => {
      cancel()
      reconcile()
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      cancel()
      observer?.disconnect()
      observer = null
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', onResize)
      }
      listeners.clear()
      doc.documentElement.removeAttribute(BACKOFF_ATTRIBUTE)
    },
  }
}
