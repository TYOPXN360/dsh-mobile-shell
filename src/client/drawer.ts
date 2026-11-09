/**
 * Drawer controller — the single source of truth for "is the mobile sidebar
 * open", plus the DOM attributes the stylesheet switches on.
 *
 * Why the plugin owns this bit of state instead of reading it from the shell:
 * the shipped frame already has a narrow-mode expansion flag, but it has no
 * notification surface (it is store-internal) and it makes the sidebar a grid
 * TRACK — the centre column shrinks by 280px. This plugin needs the opposite
 * geometry: the sidebar overlays the conversation and the centre keeps its full
 * width. So the drawer's open/closed state lives here, and the shell's own flag
 * is driven as a side effect (that is what actually mounts the real sidebar
 * subtree — we never re-implement it).
 *
 * Invariants enforced here:
 * - exactly one `open` state, published as `<html data-dsh-drawer="open|closed">`;
 * - opening is idempotent, closing is idempotent (gesture + button + backdrop
 *   all funnel through the same two functions);
 * - the state is reset to closed on teardown so a plugin reload cannot leave a
 *   transparent overlay swallowing taps.
 */

/** Attribute the stylesheet keys on. Set on `<html>` so it survives tree swaps. */
export const DRAWER_ATTRIBUTE = 'data-dsh-drawer'

/** Body lock attribute: stops the conversation scrolling behind the drawer. */
export const DRAWER_LOCK_ATTRIBUTE = 'data-dsh-drawer-lock'

/** Why the drawer changed state; listeners use it to avoid fighting gestures. */
export type DrawerCause = 'button' | 'gesture' | 'backdrop' | 'escape' | 'reset'

/** One drawer state change. */
export interface DrawerChange {
  open: boolean
  cause: DrawerCause
}

/**
 * Narrow-screen and touch predicate.
 *
 * Both halves are load-bearing. The width bound matches the shell's own
 * auto-collapse breakpoint (1024px) so this plugin never disagrees with the
 * shell about what "narrow" means — a 1000px desktop window keeps its rail and
 * its normal layout. The coarse-pointer half keeps every mouse-driven window
 * (including a split-screen or scaled desktop) on the unimodified desktop
 * layout, which is the hard requirement for this feature.
 */
export const NARROW_TOUCH_QUERY = '(max-width: 1023px) and (pointer: coarse)'

/** Listener signature for drawer changes. */
export type DrawerListener = (change: DrawerChange) => void

/**
 * The controller. Owns the open flag, the published attributes, and the
 * subscribe/notify loop.
 */
export class DrawerController {
  private open = false

  private listeners = new Set<DrawerListener>()

  /** True while the drawer is open. */
  get isOpen(): boolean {
    return this.open
  }

  /** Subscribe to state changes; the returned function unsubscribes. */
  subscribe(listener: DrawerListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Open the drawer. Idempotent.
   * @param cause - what requested the change (for listeners and debugging).
   * @returns whether the state actually changed.
   */
  openDrawer(cause: DrawerCause): boolean {
    return this.set(true, cause)
  }

  /**
   * Close the drawer. Idempotent.
   * @param cause - what requested the change.
   * @returns whether the state actually changed.
   */
  closeDrawer(cause: DrawerCause): boolean {
    return this.set(false, cause)
  }

  /** Flip the drawer; used by the header button. */
  toggle(cause: DrawerCause): boolean {
    return this.set(!this.open, cause)
  }

  /**
   * Forget the current state without notifying (teardown). Removes every
   * attribute this controller owns so a reload starts from a clean document.
   */
  dispose(): void {
    this.open = false
    this.listeners.clear()
    const root = document.documentElement
    root.removeAttribute(DRAWER_ATTRIBUTE)
    root.removeAttribute(DRAWER_LOCK_ATTRIBUTE)
  }

  /**
   * Write the new state and publish it.
   * @param next - desired open state.
   * @param cause - what requested the change.
   * @returns whether the state changed.
   */
  private set(next: boolean, cause: DrawerCause): boolean {
    if (this.open === next) return false
    this.open = next
    const root = document.documentElement
    if (next) {
      root.setAttribute(DRAWER_ATTRIBUTE, 'open')
      root.setAttribute(DRAWER_LOCK_ATTRIBUTE, '')
    } else {
      root.setAttribute(DRAWER_ATTRIBUTE, 'closed')
      root.removeAttribute(DRAWER_LOCK_ATTRIBUTE)
    }
    for (const listener of this.listeners) {
      try {
        listener({ open: next, cause })
      } catch (error) {
        // A listener must never break the state machine.
        console.warn('dsh-mobile-shell: drawer listener failed', error)
      }
    }
    return true
  }
}
