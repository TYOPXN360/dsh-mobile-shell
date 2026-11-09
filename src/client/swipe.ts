/**
 * Swipe-to-open gesture for the conversation surface.
 *
 * Requirement: a rightward swipe ANYWHERE on the conversation page opens the
 * full sidebar; it overlays the conversation and a tap outside closes it.
 *
 * ## Why this file listens to both pointer AND touch events
 *
 * The first version tracked pointer events only, with passive listeners. On a
 * real phone that never worked: as soon as the finger moves, the browser
 * decides the interaction is a SCROLL, fires `pointercancel`, and stops
 * delivering `pointermove`. The listener therefore only ever saw the first few
 * pixels — enough to look correct under synthetic events, never enough to clear
 * a distance threshold.
 *
 * The fix, and the reason the working reference implementation
 * (`dsh-web-mobile`) does the same, is a `touchmove` listener registered with
 * `passive: false`. Once the stroke is known to be horizontal, calling
 * `preventDefault()` suppresses the browser's scroll claim and keeps the
 * pointer stream alive for the rest of the gesture.
 *
 * Timing is the delicate part: `preventDefault()` on `touchmove` suppresses the
 * default action for the WHOLE gesture, and WebKit does not resume scrolling
 * afterwards. Preventing before the axis is decided therefore breaks ordinary
 * vertical scrolling. This file prevents only AFTER the horizontal axis lock —
 * exactly the moment the stroke has stopped being a scroll.
 *
 * ## The gates that keep a global swipe from stealing content gestures
 *
 * Because a stroke may begin anywhere (not just in an edge strip), these
 * rejections carry the weight:
 * - a stroke beginning on an interactive control (button, link, input, switch);
 * - a stroke beginning inside horizontally scrollable content (code block,
 *   table, stats line) — a sideways drag there is a content scroll;
 * - a stroke whose first movement is more vertical than horizontal;
 * - a multi-touch interaction (pinch), handed back to the browser immediately;
 * - a mouse stroke, so a desktop window never loses its layout.
 */

/** Tunable gesture constants, exported so tests can assert on them. */
export const SWIPE_DEFAULTS = {
  /**
   * Horizontal travel, in px, before the stroke is COMMITTED to opening.
   * 44px is below the shortest deliberate swipe and above tap jitter.
   */
  openDistance: 44,
  /**
   * The horizontal component must exceed the vertical by this factor before the
   * axis is considered locked. 1.4 keeps a slightly diagonal scroll from opening
   * the drawer, the single most common false positive in swipe code.
   */
  axisRatio: 1.4,
  /**
   * Movement, in px, before the axis is decided at all. 8px matches the
   * reference implementation's lock threshold: it decides within the first
   * frames of movement while staying clear of tap jitter.
   */
  lockDistance: 8,
  /**
   * Fraction of the viewport width in which a stroke may START. The default
   * covers the whole viewport — this is a GLOBAL swipe — and a caller may
   * narrow it deliberately.
   */
  startZoneRatio: 1,
  /** Leftward travel before an open drawer closes (opt-in direction). */
  closeDistance: 64,
} as const

/** Options accepted by {@link installSwipeGesture}. */
export interface SwipeOptions {
  /** Called when the stroke proves a rightward open gesture. */
  onOpen: () => void
  /** Called when an open drawer receives a leftward close stroke. */
  onClose: () => void
  /** Whether the drawer is currently open (evaluated per stroke). */
  isOpen: () => boolean
  /** Whether the gesture should be armed at all (narrow + touch screens). */
  isActive: () => boolean
  /** Enable the leftward close direction. Defaults to true. */
  closeOnLeftSwipe?: boolean
  /** Overrides for the tunables above (tests use this). */
  tuning?: Partial<Record<keyof typeof SWIPE_DEFAULTS, number>>
}

/** Interval after a claimed stroke during which a synthetic click is suppressed. */
const CLICK_SUPPRESS_MS = 400

/** Elements whose own horizontal overflow must be respected. */
const HORIZONTAL_SCROLLER = '[data-dsh-ms-swipe-ignore], pre, table, [data-horizontal-scroll]'

/** Interactive elements that must not begin a navigation stroke. */
const INTERACTIVE = 'button, a, input, textarea, select, [role="switch"], [role="button"], [contenteditable="true"]'

/** True when the event target sits inside a horizontally scrollable box. */
function insideHorizontalScroller(target: Element | null): boolean {
  let node: Element | null = target
  while (node !== null && node !== document.documentElement) {
    if (node.matches?.(HORIZONTAL_SCROLLER) === true) return true
    const overflowX = getComputedStyle(node).overflowX
    if ((overflowX === 'auto' || overflowX === 'scroll') && node.scrollWidth > node.clientWidth + 2) return true
    node = node.parentElement
  }
  return false
}

/** True when the event target is an interactive control (or inside one). */
function insideInteractive(target: Element | null): boolean {
  return target !== null && target.closest?.(INTERACTIVE) != null
}

/** Where a stroke is in its lifecycle. */
type Phase = 'pending' | 'abandoned' | 'locked'

/** Per-stroke bookkeeping; a new object is allocated for each pointer down. */
interface Stroke {
  pointerId: number
  startX: number
  startY: number
  phase: Phase
  direction: 1 | -1
  fromDrawer: boolean
}

/**
 * Decide the stroke's axis from a movement delta.
 * @param absX - horizontal travel.
 * @param absY - vertical travel.
 * @param lockDistance - movement below which no decision is possible.
 * @param axisRatio - horizontal dominance required to call it a swipe.
 * @returns the new phase, or undefined to stay pending.
 */
export function decideAxis(
  absX: number,
  absY: number,
  lockDistance: number,
  axisRatio: number,
): 'pending' | 'abandoned' | 'locked' {
  if (absX < lockDistance && absY < lockDistance) return 'pending'
  if (absX < absY * axisRatio) return 'abandoned'
  return 'locked'
}

/**
 * Install the gesture listeners on the document.
 * @param options - callbacks and tunables.
 * @returns a disposer removing every listener.
 */
export function installSwipeGesture(options: SwipeOptions): () => void {
  const tuning = { ...SWIPE_DEFAULTS, ...options.tuning }
  const closeOnLeftSwipe = options.closeOnLeftSwipe !== false

  let stroke: Stroke | null = null
  let suppressClickUntil = 0

  /** Swallow the click the browser synthesizes after a claimed stroke. */
  const onClickCapture = (event: MouseEvent): void => {
    if (Date.now() > suppressClickUntil) return
    suppressClickUntil = 0
    event.stopPropagation()
    event.preventDefault()
  }

  /** Commit the stroke's decision once the axis is known. */
  const lockStroke = (active: Stroke, dx: number): void => {
    active.phase = 'locked'
    active.direction = dx > 0 ? 1 : -1
    suppressClickUntil = Date.now() + CLICK_SUPPRESS_MS
  }

  /**
   * Advance the stroke from a movement delta.
   * @returns true when the drawer should open, false when it should close,
   *   undefined when nothing has been decided yet.
   */
  const advance = (active: Stroke, dx: number, dy: number): 'open' | 'close' | undefined => {
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)

    if (active.phase === 'pending') {
      const next = decideAxis(absX, absY, tuning.lockDistance, tuning.axisRatio)
      if (next === 'pending') return undefined
      if (next === 'abandoned') {
        // Vertical wins: this is a scroll. Abandon permanently, so a later
        // horizontal drift mid-scroll cannot resurrect the gesture.
        active.phase = 'abandoned'
        return undefined
      }
      lockStroke(active, dx)
    }

    if (active.phase !== 'locked') return undefined

    const open = options.isOpen()
    if (!open && active.direction === 1 && !active.fromDrawer) {
      if (dx < tuning.openDistance) return undefined
      if (active.startX > window.innerWidth * tuning.startZoneRatio) return undefined
      return 'open'
    }
    if (open && closeOnLeftSwipe && active.direction === -1) {
      if (-dx < tuning.closeDistance) return undefined
      return 'close'
    }
    return undefined
  }

  const onPointerDown = (event: PointerEvent): void => {
    stroke = null
    if (!options.isActive()) return
    // A mouse-driven window keeps the desktop layout; a pen is being aimed.
    if (event.pointerType === 'mouse') return
    if (!event.isPrimary) return

    const target = event.target instanceof Element ? event.target : null
    if (target === null) return
    if (insideInteractive(target)) return

    const open = options.isOpen()
    const fromDrawer = target.closest('[data-dsh-drawer-surface]') !== null
    // Inside the open drawer: only a leftward close stroke may start.
    if (fromDrawer && !(open && closeOnLeftSwipe)) return
    // Sideways drags inside content belong to the content, not to navigation.
    if (!open && insideHorizontalScroller(target)) return

    stroke = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      phase: 'pending',
      direction: 1,
      fromDrawer,
    }
  }

  const onPointerMove = (event: PointerEvent): void => {
    const active = stroke
    if (active === null || event.pointerId !== active.pointerId) return
    if (event.pointerType === 'mouse') return

    const verdict = advance(active, event.clientX - active.startX, event.clientY - active.startY)
    if (verdict === undefined) return
    stroke = null
    if (verdict === 'open') options.onOpen()
    else options.onClose()
  }

  /**
   * Keep the pointer stream alive once the stroke is horizontal.
   *
   * THIS is what makes the gesture work on a phone. Without it the browser
   * classifies the movement as a scroll, fires `pointercancel`, and stops
   * sending `pointermove`. Preventing the default is only safe AFTER the axis
   * lock: before it, preventing suppresses the whole gesture's default action
   * and breaks ordinary scrolling (WebKit never resumes).
   */
  const onTouchMove = (event: TouchEvent): void => {
    const active = stroke
    if (active === null) return
    // Two fingers mean a pinch; hand the whole interaction back.
    if (event.touches.length !== 1 || !event.cancelable) {
      stroke = null
      return
    }
    const touch = event.touches[0]
    if (touch === undefined) return

    // Decide from touch coordinates: on iOS the browser claims the gesture
    // before the corresponding pointermove arrives, so waiting for the pointer
    // event would be too late to prevent it.
    const verdict = advance(active, touch.clientX - active.startX, touch.clientY - active.startY)
    if (verdict !== undefined) {
      stroke = null
      if (verdict === 'open') options.onOpen()
      else options.onClose()
      return
    }
    if (active.phase === 'locked') {
      // Hold the stroke: this line keeps pointermove (and scrolling) flowing
      // to us instead of the browser's scroll machinery.
      event.preventDefault()
    }
  }

  /** End the stroke; the commit already happened at the distance threshold. */
  const onPointerEnd = (event: PointerEvent): void => {
    if (stroke !== null && event.pointerId === stroke.pointerId) stroke = null
  }

  document.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true })
  document.addEventListener('pointermove', onPointerMove, { passive: true, capture: true })
  document.addEventListener('pointerup', onPointerEnd, { passive: true, capture: true })
  document.addEventListener('pointercancel', onPointerEnd, { passive: true, capture: true })
  // NOT passive: this listener must be allowed to preventDefault().
  document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
  document.addEventListener('click', onClickCapture, { capture: true })

  return () => {
    document.removeEventListener('pointerdown', onPointerDown, { capture: true })
    document.removeEventListener('pointermove', onPointerMove, { capture: true })
    document.removeEventListener('pointerup', onPointerEnd, { capture: true })
    document.removeEventListener('pointercancel', onPointerEnd, { capture: true })
    document.removeEventListener('touchmove', onTouchMove, { capture: true })
    document.removeEventListener('click', onClickCapture, { capture: true })
    stroke = null
  }
}
