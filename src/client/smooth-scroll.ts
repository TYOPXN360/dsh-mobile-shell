/**
 * Smooth tail motion for the chat transcript.
 *
 * The host pins the transcript to the bottom by writing `scrollTop` in a
 * layout effect. That write is correct but instantaneous: every streamed line
 * moves the old text up by a whole line in one frame. This module does NOT
 * touch the host's scrolling, follow intent, or measurements. It observes the
 * resulting movement and applies a short, decaying visual compensation on the
 * chat column itself:
 *
 *   growth pushes the column up by N pixels  →  translate it back down by N
 *   →  release that offset over ~200ms
 *
 * The eye therefore sees the old lines glide upward while the new line enters,
 * on phones and desktops alike. Because the compensation is a `translate`, it
 * never changes `scrollHeight`, the floor, anchors, or hit testing; the host
 * keeps owning the scrollport exactly as before.
 *
 * Scope is deliberately narrow:
 * - only the chat column (`[data-chat-flow]`) is translated;
 * - only when the viewport was already following the tail;
 * - only for growth caused by a NEW content block, never for a soft wrap
 *   inside an existing paragraph (text reflow advances instantly so the
 *   reader never sees the column step backward);
 * - never a late correction after the host's movement has already painted;
 * - not at all under `prefers-reduced-motion`.
 *
 * The same switch also owns the new-content opacity fade in `fade-in.ts`.
 * That engine is intentionally separate: opacity never changes layout, so the
 * scroll compensation and the fade cannot mask or re-trigger each other.
 */

import { FadeInEngine, isFadeCandidate } from './fade-in.ts'

/** localStorage key holding the reader's preference. */
export const SMOOTH_SCROLL_STORAGE_KEY = 'dsh-mobile-shell:smooth-scroll'

/** Attribute on `<html>` while the feature is active (debugging + CSS hook). */
export const SMOOTH_SCROLL_ATTRIBUTE = 'data-dsh-ms-smooth-scroll'

/** The chat column the host renders. Stable data attribute, not a hashed class. */
const COLUMN_SELECTOR = '[data-chat-flow]'

/** A viewport this close to the floor counts as following the tail. */
const FOLLOW_SLOP = 32

/** Below this, movement is layout rounding, not a new line. */
const MIN_STEP = 0.5

/** Above this, a single change is a navigation/session jump, not a streamed line. */
const MAX_STEP = 320

/**
 * Never hold back more than a few lines at once. Large jumps must not leave
 * the reader far behind and then rush to catch up.
 */
const MAX_OFFSET = 120

/** Content growth that the host never followed stops being compensable. */
const PENDING_GROWTH_TTL_MS = 100

/**
 * Growth is treated as a block entering only while the DOM addition is this
 * fresh. A soft wrap later in the same paragraph is text reflow, not a new
 * block, and must advance without a downward correction.
 */
export const BLOCK_ADD_WINDOW_MS = 100

/** Time to lose half of the pending offset; a 30px line settles in ~290ms. */
export const SMOOTH_SCROLL_HALF_LIFE_MS = 45

/** Below this the offset is indistinguishable from zero; clear the style. */
const SETTLE_PX = 0.35

/** Minimum storage surface this module needs (localStorage-compatible). */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Reader-visible state of the feature. */
export interface SmoothScrollSnapshot {
  readonly enabled: boolean
}

type Listener = (snapshot: SmoothScrollSnapshot) => void

/**
 * Read the saved preference. Absence means enabled: the feature is the reason
 * the row exists, and a first-time reader should see it work without hunting
 * for a switch. Only an explicit `off` disables it.
 * @param storage - storage surface, or null when the browser denies access.
 * @returns whether smooth tail motion is enabled.
 */
export function readSmoothScrollPreference(storage: StorageLike | null): boolean {
  try {
    return storage?.getItem(SMOOTH_SCROLL_STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

/**
 * Persist the preference, tolerating private-mode and quota failures.
 * @param storage - storage surface, or null.
 * @param enabled - value to save.
 */
export function writeSmoothScrollPreference(storage: StorageLike | null, enabled: boolean): void {
  try {
    storage?.setItem(SMOOTH_SCROLL_STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    /* A denied storage must not break the switch or the chat. */
  }
}

/** Locate localStorage without assuming it is available (SSR, sandbox, tests). */
function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/**
 * How much new content growth can become pending visual lag.
 *
 * The host follows in two different places: sometimes its layout effect moves
 * `scrollTop` in the same commit as the DOM change, sometimes its size
 * observer follows one frame later. This helper records growth first and
 * lets the later movement claim it, so neither path is missed and a movement
 * is never compensated twice.
 * @param grew - how much the chat column's layout height increased, in pixels.
 * @param following - whether the host still intends to follow the tail.
 * @param msSinceBlockAdd - age of the newest content-block insertion.
 * @param consumed - whether that block already used its one glide.
 * @returns growth to add to the pending pool, zero for jumps, shrink, a
 * soft wrap, or a block that already glided.
 */
export function growthStep(
  grew: number,
  following: boolean,
  msSinceBlockAdd: number = 0,
  consumed: boolean = false,
): number {
  if (consumed) return 0
  if (!following) return 0
  if (!(grew > MIN_STEP) || grew > MAX_STEP) return 0
  if (!(msSinceBlockAdd <= BLOCK_ADD_WINDOW_MS)) return 0
  return grew
}

/**
 * Pixels of visual lag to add for one observed scroll movement.
 * @param moved - how far `scrollTop` increased, in pixels.
 * @param pendingGrowth - growth recorded earlier and not yet compensated.
 * @param following - whether the host still intends to follow the tail.
 * @returns compensation in pixels, zero when the movement is not a followed growth.
 */
export function growthCompensation(
  moved: number,
  pendingGrowth: number,
  following: boolean,
): number {
  if (!following) return 0
  if (!(moved > MIN_STEP) || moved > MAX_STEP) return 0
  if (!(pendingGrowth > MIN_STEP)) return 0
  return Math.min(moved, pendingGrowth)
}

/**
 * Exponential ease-out for the pending offset.
 *
 * The curve is monotonic and critically damped: it approaches zero from above
 * and never overshoots or oscillates, so the line push reads as smooth motion
 * rather than a spring. A new block adds to the offset while it is already
 * decaying.
 * @param offset - current visual lag, in pixels.
 * @param elapsedMs - time since the previous animation frame.
 * @returns the next offset, or zero once it is visually settled.
 */
export function decayOffset(offset: number, elapsedMs: number): number {
  if (!(offset > 0)) return 0
  const next = offset * Math.pow(0.5, Math.max(0, elapsedMs) / SMOOTH_SCROLL_HALF_LIFE_MS)
  return next < SETTLE_PX ? 0 : next
}

/**
 * One document-level observer that turns host tail jumps into visible motion.
 *
 * There is at most one engine per page. It discovers the mounted chat column,
 * finds the actual scrollport above it (the host has two layout modes: its own
 * scroller, or an enclosing `[data-conversation-scroll]`), and translates only
 * the column. Every temporary style is removed when the offset settles, when
 * the feature is switched off, or when the plugin unloads.
 */
export class SmoothScrollEngine {
  private enabled = false
  private column: HTMLElement | null = null
  private scroller: HTMLElement | null = null
  private observer: MutationObserver | null = null
  private columnObserver: MutationObserver | null = null
  private resizes: ResizeObserver | null = null
  private frame: number | null = null
  private lastFrameAt: number | null = null
  private offset = 0
  private lastTop = 0
  /** Chat column layout height; independent of this engine's visual offset. */
  private lastHeight = 0
  /** Column width; a reflow is not streamed growth and must not animate. */
  private lastWidth = 0
  private lastFloor = 0
  private pendingGrowth = 0
  private pendingAt = 0
  /** When the newest content block entered the column, for soft-wrap gating. */
  private lastBlockAddAt = Number.NEGATIVE_INFINITY
  /** One glide per inserted block; later text reflow is a soft wrap. */
  private blockConsumed = false
  private primed = false
  private discoverQueued = false
  private sampleQueued = false
  /** Inline overscroll values this engine replaced; restored on unbind. */
  private overscroll: Array<{ element: HTMLElement; previous: string }> = []

  /**
   * @param doc - document owning the chat.
   * @param win - its window, used for animation and motion preference.
   */
  constructor(
    private readonly doc: Document,
    private readonly win: Window,
  ) {}

  /**
   * Attach or detach all observation. Enabling primes the next sample instead
   * of animating whatever jump happened while the reader was in Settings.
   * @param enabled - desired state.
   */
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    this.enabled = enabled
    if (enabled) {
      this.doc.documentElement.setAttribute(SMOOTH_SCROLL_ATTRIBUTE, '')
      this.primed = false
      this.connect()
      this.discover()
    } else {
      this.doc.documentElement.removeAttribute(SMOOTH_SCROLL_ATTRIBUTE)
      this.disconnect()
      this.reset()
    }
  }

  /** Remove observers, pending frames, and every style this engine wrote. */
  dispose(): void {
    this.enabled = false
    this.doc.documentElement.removeAttribute(SMOOTH_SCROLL_ATTRIBUTE)
    this.disconnect()
    this.reset()
  }

  /** Observe the whole document so a chat remount is picked up without polling. */
  private connect(): void {
    if (this.observer === null && typeof MutationObserver === 'function') {
      this.observer = new MutationObserver(this.onMutations)
      this.observer.observe(this.doc.documentElement, {
        childList: true,
        subtree: true,
      })
    }
    this.doc.addEventListener('scroll', this.onScroll, { capture: true, passive: true })
    // A previous disable restored the host's overscroll value; adopt the same
    // scrollport again before the first sample can arrive.
    if (this.scroller !== null && this.scroller.isConnected) this.bindScroller(this.scroller)
  }

  /** Detach observation and stop the animation loop. */
  private disconnect(): void {
    this.observer?.disconnect()
    this.observer = null
    this.doc.removeEventListener('scroll', this.onScroll, { capture: true })
    this.columnObserver?.disconnect()
    this.columnObserver = null
    this.resizes?.disconnect()
    this.resizes = null
    if (this.frame !== null) this.win.cancelAnimationFrame(this.frame)
    this.frame = null
    this.lastFrameAt = null
    this.restoreOverscroll()
  }

  /**
   * Only remounts matter here. Content growth is measured by the size
   * observer, which runs once per frame instead of once per streamed token;
   * reading layout from every mutation would force a layout at token rate.
   */
  private readonly onMutations = (): void => {
    if (!this.enabled) return
    if (this.column === null || !this.column.isConnected
      || (this.scroller !== null && !this.scroller.isConnected)) {
      this.queueDiscover()
    }
  }

  /** A scroll from our scrollport is another chance to catch a late host jump. */
  private readonly onScroll = (event: Event): void => {
    if (!this.enabled || this.scroller === null) return
    const target = event.target
    if (target !== this.scroller && target !== this.doc.scrollingElement && target !== this.doc) return
    this.sample()
  }

  /** Coalesce remount discovery into one microtask. */
  private queueDiscover(): void {
    if (this.discoverQueued) return
    this.discoverQueued = true
    queueMicrotask(() => {
      this.discoverQueued = false
      if (this.enabled) this.discover()
    })
  }

  /**
   * Sample after the current observer batch. The host follows tail growth from
   * its own ResizeObserver, and observer order is not a contract; a microtask
   * lets the host's scroll write land first so the jump never reaches paint.
   */
  private queueSample(): void {
    if (this.sampleQueued) return
    this.sampleQueued = true
    queueMicrotask(() => {
      this.sampleQueued = false
      if (this.enabled) this.sample()
    })
  }

  /** Find the visible chat column and its scrollport, resetting baselines on a swap. */
  private discover(): void {
    const next = this.findColumn()
    if (next === this.column) {
      if (next !== null && (this.scroller === null || !this.scroller.isConnected)) {
        this.bindScroller(this.findScroller(next))
        this.primed = false
      }
      if (next !== null && this.resizes === null) this.observeSize(next)
      if (next !== null && this.columnObserver === null) this.observeAdditions(next)
      return
    }
    this.columnObserver?.disconnect()
    this.columnObserver = null
    this.resizes?.disconnect()
    this.resizes = null
    this.reset()
    this.column = next
    this.bindScroller(next === null ? null : this.findScroller(next))
    if (next !== null) {
      this.observeSize(next)
      this.observeAdditions(next)
    }
  }

  /**
   * Watch the column itself. A width change, an image load, or a markdown
   * block that reflows can grow the content without any mutation this engine
   * sees; the size observer closes that gap.
   * @param column - mounted chat column.
   */
  private observeSize(column: HTMLElement): void {
    if (typeof ResizeObserver !== 'function') return
    this.resizes?.disconnect()
    this.resizes = new ResizeObserver(() => {
      if (!this.enabled) return
      // If our observer runs after the host's, this read already sees the
      // followed scrollTop. If it runs first, the microtask runs after the
      // batch, still before paint.
      this.sample()
      this.queueSample()
    })
    this.resizes.observe(column)
  }

  /**
   * Record when a content block is inserted. Only growth in the short window
   * after this timestamp is treated as a block entering; text reflow inside an
   * existing block is a soft wrap and advances without compensation.
   * @param column - mounted chat column.
   */
  private observeAdditions(column: HTMLElement): void {
    if (typeof MutationObserver !== 'function') return
    this.columnObserver?.disconnect()
    this.columnObserver = new MutationObserver((records) => {
      if (!this.enabled) return
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue
          if (!isFadeCandidate(node as HTMLElement)) continue
          this.lastBlockAddAt = this.now()
          this.blockConsumed = false
          return
        }
      }
    })
    this.columnObserver.observe(column, { childList: true, subtree: true })
  }

  /** @returns the first mounted, visible column, or a detached fallback. */
  private findColumn(): HTMLElement | null {
    let fallback: HTMLElement | null = null
    for (const element of this.doc.querySelectorAll<HTMLElement>(COLUMN_SELECTOR)) {
      // Group/process bodies contain their own [data-chat-flow]; the outer
      // column is the transcript this engine may translate.
      if (element.parentElement?.closest(COLUMN_SELECTOR) != null) continue
      if (element.closest('[hidden]') !== null) continue
      if (element.getClientRects().length > 0) return element
      fallback ??= element
    }
    return fallback
  }

  /**
   * Walk out to the element that actually scrolls. The host either scrolls
   * `.scroll` itself or delegates to an enclosing conversation scrollport, so
   * both are found by computed overflow rather than by a hashed class name.
   * @param column - mounted chat column.
   * @returns the nearest vertical scrollport, or the document scroller.
   */
  private findScroller(column: HTMLElement): HTMLElement | null {
    for (let node = column.parentElement; node !== null; node = node.parentElement) {
      const overflow = this.win.getComputedStyle(node).overflowY
      if (overflow !== 'auto' && overflow !== 'scroll' && overflow !== 'overlay') continue
      if (node.scrollHeight > node.clientHeight + 1) return node
    }
    const root = this.doc.scrollingElement
    return root instanceof HTMLElement && root.scrollHeight > root.clientHeight + 1 ? root : null
  }

  /**
   * Adopt one scrollport and turn off its overscroll elasticity while the
   * feature is active. The transcript must glide, not bounce, and a pull at
   * the top must not chain into the page. Previous inline values are restored
   * verbatim, so switching the feature off returns control to the host's CSS.
   * @param next - the new scrollport, or null when the chat is unmounted.
   */
  private bindScroller(next: HTMLElement | null): void {
    if (next === this.scroller && this.overscroll.length > 0) return
    this.restoreOverscroll()
    this.scroller = next
    if (next === null) return
    const targets = next === this.doc.scrollingElement && this.doc.body !== null
      ? [next, this.doc.body]
      : [next]
    for (const element of targets) {
      this.overscroll.push({ element, previous: element.style.getPropertyValue('overscroll-behavior') })
      element.style.setProperty('overscroll-behavior', 'none')
    }
  }

  /** Put every replaced overscroll value back. */
  private restoreOverscroll(): void {
    for (const { element, previous } of this.overscroll) {
      if (previous === '') element.style.removeProperty('overscroll-behavior')
      else element.style.setProperty('overscroll-behavior', previous)
    }
    this.overscroll = []
  }

  /**
   * Compare the scrollport against the previous sample and decide whether this
   * commit was streamed growth. The read is the only layout cost; the write is
   * a compositor-only translation, so the host's own measurements stay valid.
   */
  private sample(): void {
    if (!this.enabled) return
    const column = this.column
    if (column === null || !column.isConnected) {
      this.queueDiscover()
      return
    }
    // A session switch can leave the previous column mounted but hidden; its
    // scrollport no longer represents what the reader sees.
    if (column.getClientRects().length === 0) {
      this.queueDiscover()
      return
    }
    const scroller = this.scroller ?? this.findScroller(column)
    if (scroller === null) {
      this.primed = false
      return
    }
    this.bindScroller(scroller)
    const top = scroller.scrollTop
    // Measure the column's LAYOUT height, not the scroller's scrollHeight:
    // our own translate can transiently extend scrollable overflow, and that
    // must never look like new content.
    const height = column.offsetHeight
    const width = column.offsetWidth
    const floor = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    const following = this.following(column, floor, top)
    if (this.primed && width !== this.lastWidth) {
      // A window resize, rotation, or sidebar transition re-wraps text. The
      // resulting height change is a reflow, not a new block.
      this.pendingGrowth = 0
    } else if (this.primed) {
      const moved = top - this.lastTop
      const grew = height - this.lastHeight
      const now = this.now()
      if (grew > MIN_STEP) {
        // A block gets one glide for the growth that introduces it. Text that
        // later wraps inside the same block is reflow, not a new block, and
        // must not move the column again.
        const step = growthStep(
          grew, following, now - this.lastBlockAddAt, this.blockConsumed,
        )
        if (step > 0) {
          this.pendingGrowth = Math.min(MAX_STEP, this.pendingGrowth + step)
          this.pendingAt = now
        } else if (grew > MAX_STEP) {
          // A session switch, history prepend, or other jump: never animate.
          this.pendingGrowth = 0
        }
        // Whether it glided or was rejected, this block's one growth event is
        // spent; the next growth in the same block is a soft wrap.
        this.blockConsumed = true
      }
      if (moved < -MIN_STEP) this.pendingGrowth = 0
      // Expire growth the host never followed before it can be paired with a
      // much later movement. Only a same-frame (or next-frame) follow glides.
      if (this.pendingGrowth > 0 && now - this.pendingAt > PENDING_GROWTH_TTL_MS) {
        this.pendingGrowth = 0
      }
      // Only compensate a movement paired with growth that is already known.
      // A movement whose growth report arrives later has already painted;
      // correcting it then would read as a backward bounce, so it is left
      // instant and the next block starts from a clean baseline.
      const compensation = growthCompensation(moved, this.pendingGrowth, following)
      if (compensation > 0) {
        this.pendingGrowth = Math.max(0, this.pendingGrowth - compensation)
        if (!this.prefersReducedMotion()) this.hold(compensation)
      }
    }
    this.lastTop = top
    this.lastHeight = height
    this.lastWidth = width
    this.lastFloor = floor
    this.primed = true
  }

  /**
   * Whether the host currently intends to follow the tail. The host exposes
   * that intent as an attribute; the metric fallback keeps an older host
   * working when the attribute is absent.
   * @param column - mounted chat column.
   * @param floor - current scroll floor.
   * @param top - current scroll position.
   * @returns whether growth should move the reader.
   */
  private following(column: HTMLElement, floor: number, top: number): boolean {
    if (column.closest('[data-chat-following-tail]') !== null) return true
    return this.primed && floor - top <= FOLLOW_SLOP && this.lastFloor - this.lastTop <= FOLLOW_SLOP
  }

  /** @returns a monotonic millisecond clock for pending-growth expiry. */
  private now(): number {
    return typeof this.win.performance?.now === 'function' ? this.win.performance.now() : Date.now()
  }

  /** Add visual lag and start the decay loop. */
  private hold(pixels: number): void {
    this.offset = Math.min(MAX_OFFSET, this.offset + pixels)
    this.apply()
    if (this.frame !== null) return
    this.lastFrameAt = null
    this.frame = this.win.requestAnimationFrame(this.tick)
  }

  /** Release the lag exponentially; the last step clears every temporary style. */
  private readonly tick = (now: number): void => {
    this.frame = null
    const elapsed = this.lastFrameAt === null ? 16 : Math.max(1, Math.min(64, now - this.lastFrameAt))
    this.lastFrameAt = now
    this.offset = decayOffset(this.offset, elapsed)
    this.apply()
    if (this.offset > 0) this.frame = this.win.requestAnimationFrame(this.tick)
    else this.lastFrameAt = null
  }

  /** Write the current lag as an individual transform (never `scrollTop`). */
  private apply(): void {
    const column = this.column
    if (column === null) return
    if (this.offset > 0) {
      column.style.setProperty('translate', `0 ${this.offset.toFixed(2)}px`)
    } else {
      column.style.removeProperty('translate')
    }
  }

  /** @returns whether the OS asks for reduced motion. */
  private prefersReducedMotion(): boolean {
    if (typeof this.win.matchMedia !== 'function') return false
    return this.win.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /** Drop pending motion and restore the untransformed layout. */
  private reset(): void {
    if (this.frame !== null) this.win.cancelAnimationFrame(this.frame)
    this.frame = null
    this.lastFrameAt = null
    this.offset = 0
    this.pendingGrowth = 0
    this.lastBlockAddAt = Number.NEGATIVE_INFINITY
    this.blockConsumed = false
    this.primed = false
    this.apply()
  }
}

/**
 * Preference owner shared by the settings row and both motion engines. One
 * instance is created with the plugin fiber, started at page load (so the
 * feature works before Settings is ever opened), and disposed with the fiber.
 *
 * The same switch governs the two halves of the new-content transition:
 * {@link SmoothScrollEngine} glides old lines upward, and
 * {@link FadeInEngine} fades the new line in. They stay separate engines so a
 * failure in one can never disable the other.
 */
export class SmoothScrollController {
  private readonly listeners = new Set<Listener>()
  private engine: SmoothScrollEngine | null = null
  private fade: FadeInEngine | null = null
  private started = false
  private current: boolean

  /**
   * @param storage - preference storage; defaults to localStorage when present.
   */
  constructor(private readonly storage: StorageLike | null = defaultStorage()) {
    this.current = readSmoothScrollPreference(this.storage)
  }

  /** @returns the current reader-visible state. */
  snapshot(): SmoothScrollSnapshot {
    return { enabled: this.current }
  }

  /**
   * Listen for switch changes.
   * @param listener - called with a fresh snapshot after every change.
   * @returns teardown for this listener.
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Begin observing the live document. Safe to call once. */
  start(doc: Document = document): void {
    if (this.started) return
    this.started = true
    const view = doc.defaultView
    if (view === null) return
    this.engine = new SmoothScrollEngine(doc, view)
    this.fade = new FadeInEngine(doc, view)
    this.engine.setEnabled(this.current)
    this.fade.setEnabled(this.current)
  }

  /** Stop observing, restore the transcript, and drop every listener. */
  dispose(): void {
    this.engine?.dispose()
    this.engine = null
    this.fade?.dispose()
    this.fade = null
    this.started = false
    this.listeners.clear()
  }

  /**
   * Apply and persist a new preference.
   * @param enabled - whether new lines should push old ones smoothly.
   */
  setEnabled(enabled: boolean): void {
    if (this.current === enabled) return
    this.current = enabled
    writeSmoothScrollPreference(this.storage, enabled)
    this.engine?.setEnabled(enabled)
    this.fade?.setEnabled(enabled)
    for (const listener of [...this.listeners]) listener(this.snapshot())
  }
}
