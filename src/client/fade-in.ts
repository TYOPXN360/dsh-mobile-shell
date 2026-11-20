/**
 * Fade-in for newly inserted chat content.
 *
 * The host renders streamed Markdown incrementally: every new paragraph, list
 * item, tool row, or reasoning block is a fresh DOM node. Those nodes currently
 * pop into view at full opacity. This module observes the mounted chat column
 * and plays a short opacity fade on each new content block:
 *
 *   new node inserted  →  opacity 0 → its own opacity over ~180ms
 *
 * Design boundaries:
 * - only the OUTER chat column is observed; nested process/group flows are
 *   covered because they live inside it;
 * - only the outermost node added in a batch is animated, so a new row with
 *   its whole Markdown subtree fades as one unit instead of every paragraph
 *   double-fading;
 * - only content blocks and chat rows qualify; icons, spans, links and other
 *   inline churn are ignored;
 * - history prepends, session switches, and huge commits are not animated;
 * - `prefers-reduced-motion: reduce` disables the effect completely.
 *
 * The animation uses the Web Animations API with `fill: 'none'`, so it never
 * writes a permanent inline opacity and never competes with the host's own
 * fold/reveal transitions. It is independent of the smooth-scroll engine:
 * opacity does not change layout, and the scroll compensation still sees the
 * same growth.
 */

/** Opacity fade duration; long enough to read, short enough for token rate. */
export const FADE_IN_DURATION_MS = 180

/** Monotonic ease-out: fast entry, soft landing, no overshoot. */
export const FADE_IN_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

/** Above this many animated blocks in one batch, treat it as a bulk load. */
export const FADE_IN_MAX_BATCH = 12

/** Above this many added elements in one batch, do not even inspect them. */
export const FADE_IN_MAX_NODES = 60

/** Only rows inside this many trailing column children are live content. */
export const FADE_IN_TAIL_WINDOW = 12

/** A freshly bound column settles before its first additions are animated. */
export const FADE_IN_WARMUP_MS = 200

/** The host's outer chat column. */
const FLOW_SELECTOR = '[data-chat-flow]'

/** Session owner around the column, used to suppress switch batches. */
const CONVERSATION_SELECTOR = '[data-conversation-content]'

/**
 * Minimal DOM shape the pure decision helpers need. `HTMLElement` satisfies
 * it structurally; tests can build plain objects without a DOM.
 */
export interface FadeNode {
  readonly nodeType: number
  readonly parentElement: FadeNode | null
  readonly tagName: string
  readonly children?: ArrayLike<FadeNode>
  hasAttribute(name: string): boolean
  getAttribute?(name: string): string | null
}

/** Attributes that identify a chat row or an expandable step. */
const ROW_ATTRIBUTES = [
  'data-chat-flow-key',
  'data-chat-anchor-key',
  'data-chat-group-key',
  'data-chat-call-id',
  'data-chat-node-key',
] as const

/** Block-level content emitted by the Markdown renderer or by tool cards. */
const BLOCK_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'DL', 'DT', 'DD',
  'PRE', 'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH',
  'HR', 'FIGURE', 'FIGCAPTION', 'DETAILS', 'SUMMARY',
])

/** Nodes that never carry visible prose and must not fade. */
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'LINK', 'META', 'TEMPLATE', 'NOSCRIPT',
  'BR', 'WBR', 'SVG', 'PATH', 'CIRCLE', 'RECT', 'LINE', 'POLYLINE',
  'POLYGON', 'G', 'DEFS', 'USE', 'CLIPPATH', 'MASK', 'PATTERN', 'IMAGE',
])

/**
 * Read an attribute through either DOM accessor, tolerating test objects that
 * only implement `hasAttribute`.
 * @param element - node to inspect.
 * @param name - attribute name.
 * @returns the value, `''` for a present boolean attribute, or null.
 */
function attribute(element: FadeNode, name: string): string | null {
  const value = element.getAttribute?.(name)
  if (value !== undefined) return value
  return element.hasAttribute(name) ? '' : null
}

/**
 * Whether one inserted node is a content block worth fading.
 *
 * Rows are identified by the host's stable data attributes; prose is
 * identified by its semantic block tag. Inline elements and layout wrappers
 * are deliberately excluded so streamed syntax highlighting does not flash.
 * @param element - inserted element.
 * @returns whether the node may receive the fade.
 */
export function isFadeCandidate(element: FadeNode): boolean {
  if (element.nodeType !== 1) return false
  const tag = element.tagName.toUpperCase()
  if (SKIP_TAGS.has(tag)) return false
  if (element.hasAttribute('hidden')) return false
  if (element.hasAttribute('data-chat-turn-spacer')) return false
  if (element.hasAttribute('data-text-interaction-surface')) return false
  if (element.hasAttribute('data-chat-motion')) return false
  const ariaHidden = attribute(element, 'aria-hidden')
  if (ariaHidden !== null && ariaHidden !== 'false') return false
  if (ROW_ATTRIBUTES.some(name => element.hasAttribute(name))) return true
  return BLOCK_TAGS.has(tag)
}

/**
 * Keep only the outermost inserted nodes.
 *
 * React commits a new row and its whole subtree together. Animating both the
 * row and each paragraph would multiply opacity and make the text arrive at a
 * different rate than the row; the outermost node is the visual unit.
 * @param elements - inserted elements in any order.
 * @returns the subset with no inserted ancestor.
 */
export function outermostAdditions<T extends FadeNode>(elements: readonly T[]): T[] {
  const added = new Set<FadeNode>(elements)
  const result: T[] = []
  for (const element of new Set(elements)) {
    let nested = false
    for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
      if (added.has(parent)) {
        nested = true
        break
      }
    }
    if (!nested) result.push(element)
  }
  return result
}

/**
 * Whether a subtree contains at least one fadeable block.
 *
 * The outermost inserted node can be a wrapper that is not itself a row or a
 * semantic block; it should still fade as a unit when it contains content.
 * @param element - inserted node.
 * @returns whether the node or a descendant qualifies.
 */
export function containsFadeCandidate(element: FadeNode): boolean {
  if (isFadeCandidate(element)) return true
  const children = element.children
  if (children === undefined) return false
  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    if (child !== undefined && containsFadeCandidate(child)) return true
  }
  return false
}

/**
 * Whether an inserted node belongs to the live tail of the column.
 *
 * New streamed content is appended at the end; history pagination prepends
 * older rows at the start. Limiting the effect to the trailing window keeps
 * loading history visually silent without measuring layout.
 * @param element - inserted node inside the column.
 * @param column - outer chat column.
 * @param windowSize - number of trailing direct children considered live.
 * @returns whether the node's top-level row is in the tail window.
 */
export function isInTailWindow(
  element: FadeNode,
  column: FadeNode,
  windowSize: number = FADE_IN_TAIL_WINDOW,
): boolean {
  let top: FadeNode = element
  while (top.parentElement !== null && top.parentElement !== column) {
    top = top.parentElement
  }
  if (top.parentElement !== column) return false
  const children = column.children
  if (children === undefined) return true
  const start = Math.max(0, children.length - Math.max(1, windowSize))
  for (let index = start; index < children.length; index++) {
    if (children[index] === top) return true
  }
  return false
}

/**
 * Whether one observed batch is small enough to animate.
 *
 * Session switches and history loads insert many rows at once; a short,
 * bounded stream inserts one or a few. Skipping the whole batch avoids a
 * full-screen flash on navigation.
 * @param candidateCount - number of outer targets that qualified.
 * @param nodeCount - number of element nodes added in the batch.
 * @returns whether every qualifying target should fade.
 */
export function shouldFadeBatch(candidateCount: number, nodeCount: number): boolean {
  return candidateCount > 0
    && candidateCount <= FADE_IN_MAX_BATCH
    && nodeCount <= FADE_IN_MAX_NODES
}

/**
 * One document-level observer that fades new chat content in.
 *
 * There is at most one engine per page. It discovers the mounted outer chat
 * column, observes additions inside it, and applies a compositor-friendly
 * opacity animation to the outermost new content blocks. Every animation is
 * cancellable; disabling the feature restores the elements immediately.
 */
export class FadeInEngine {
  private enabled = false
  private column: HTMLElement | null = null
  private observer: MutationObserver | null = null
  private columnObserver: MutationObserver | null = null
  private animations = new Set<Animation>()
  private byElement = new WeakMap<HTMLElement, Animation>()
  private discoverQueued = false
  private checkQueued = false
  private lastSession = ''
  private readyAt = 0

  /**
   * @param doc - document owning the chat.
   * @param win - its window, used for animation and motion preference.
   */
  constructor(
    private readonly doc: Document,
    private readonly win: Window,
  ) {}

  /**
   * Attach or detach all observation. Enabling starts with the current
   * content already settled; only later additions fade.
   * @param enabled - desired state.
   */
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return
    this.enabled = enabled
    if (enabled) {
      this.connect()
      this.discover()
    } else {
      this.disconnect()
    }
  }

  /** Remove observers and cancel every running fade. */
  dispose(): void {
    this.enabled = false
    this.disconnect()
  }

  /** Observe the document only to find and replace the mounted chat column. */
  private connect(): void {
    if (this.observer === null && typeof MutationObserver === 'function') {
      this.observer = new MutationObserver(this.onDocumentMutations)
      this.observer.observe(this.doc.documentElement, {
        childList: true,
        subtree: true,
      })
    }
  }

  /** Detach both observers and release every temporary animation. */
  private disconnect(): void {
    this.observer?.disconnect()
    this.observer = null
    this.checkQueued = false
    this.unbindColumn()
    this.column = null
  }

  /**
   * Only a remount or a hidden column matters at document scope. Chat rows can
   * mutate at token rate, so the layout read is coalesced to one check per
   * frame instead of forcing a synchronous layout on every commit.
   */
  private readonly onDocumentMutations = (): void => {
    if (!this.enabled || this.checkQueued) return
    this.checkQueued = true
    const check = (): void => {
      this.checkQueued = false
      if (!this.enabled) return
      const column = this.column
      if (column === null || !column.isConnected || column.getClientRects().length === 0) {
        this.queueDiscover()
      }
    }
    if (typeof this.win.requestAnimationFrame === 'function') {
      this.win.requestAnimationFrame(check)
    } else {
      check()
    }
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

  /** Find the visible outer chat column, falling back to a mounted one. */
  private discover(): void {
    const next = this.findColumn()
    if (next === this.column) {
      if (next !== null && this.columnObserver === null) this.bindColumn(next)
      return
    }
    this.unbindColumn()
    this.column = next
    if (next !== null) this.bindColumn(next)
  }

  /**
   * @returns the first visible top-level flow, or the first mounted one.
   */
  private findColumn(): HTMLElement | null {
    let fallback: HTMLElement | null = null
    for (const element of this.doc.querySelectorAll<HTMLElement>(FLOW_SELECTOR)) {
      // Group/process bodies contain their own [data-chat-flow]; only the
      // column without a flow ancestor is the transcript.
      if (element.parentElement?.closest(FLOW_SELECTOR) != null) continue
      fallback ??= element
      if (element.getClientRects().length > 0) return element
    }
    return fallback
  }

  /**
   * Observe additions inside one column.
   * @param column - mounted outer chat column.
   */
  private bindColumn(column: HTMLElement): void {
    this.columnObserver?.disconnect()
    this.columnObserver = null
    this.lastSession = this.readSession(column)
    this.readyAt = this.now() + FADE_IN_WARMUP_MS
    if (typeof MutationObserver !== 'function') return
    this.columnObserver = new MutationObserver(this.onColumnMutations)
    this.columnObserver.observe(column, { childList: true, subtree: true })
  }

  /** Stop observing one column and release animations attached to it. */
  private unbindColumn(): void {
    this.columnObserver?.disconnect()
    this.columnObserver = null
    this.lastSession = ''
    this.readyAt = 0
    this.cancelAnimations()
  }

  /** @param column - chat column. @returns the owning session id, if any. */
  private readSession(column: HTMLElement): string {
    return column.closest(CONVERSATION_SELECTOR)?.getAttribute('data-conversation-session') ?? ''
  }

  /**
   * Animate the outermost new content blocks in one observer batch.
   * @param records - additions reported for the chat column.
   */
  private readonly onColumnMutations = (records: MutationRecord[]): void => {
    if (!this.enabled) return
    const column = this.column
    if (column === null || !column.isConnected) {
      this.queueDiscover()
      return
    }
    const session = this.readSession(column)
    if (session !== this.lastSession) {
      // A session swap replaces the whole transcript; let its first commits
      // settle instead of fading whatever happened to mount first.
      this.lastSession = session
      this.readyAt = this.now() + FADE_IN_WARMUP_MS
      return
    }
    // A freshly mounted column is still committing its initial rows; those
    // are existing content, not new lines, and must appear instantly.
    if (this.now() < this.readyAt) return
    const added: HTMLElement[] = []
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) added.push(node as HTMLElement)
      }
    }
    if (added.length === 0 || added.length > FADE_IN_MAX_NODES) return
    const outer = outermostAdditions(added)
    const targets: HTMLElement[] = []
    for (const element of outer) {
      if (!element.isConnected || !column.contains(element)) continue
      if (this.hasHiddenAncestor(element, column)) continue
      if (this.hasMotionAncestor(element, column)) continue
      if (this.hasFadingAncestor(element, column)) continue
      if (!containsFadeCandidate(element)) continue
      if (!isInTailWindow(element, column)) continue
      targets.push(element)
    }
    if (!shouldFadeBatch(targets.length, added.length)) return
    for (const target of targets) this.fade(target)
  }

  /**
   * @param element - inserted node.
   * @param column - chat column.
   * @returns whether the node or an ancestor up to the column is hidden.
   */
  private hasHiddenAncestor(element: HTMLElement, column: HTMLElement): boolean {
    for (let node: HTMLElement | null = element; node !== null; node = node.parentElement) {
      if (node.hasAttribute('hidden')) return true
      const ariaHidden = node.getAttribute('aria-hidden')
      if (ariaHidden !== null && ariaHidden !== 'false') return true
      if (node === column) break
    }
    return false
  }

  /**
   * @param element - inserted node.
   * @param column - chat column.
   * @returns whether the host's own fold/reveal motion owns this subtree.
   */
  private hasMotionAncestor(element: HTMLElement, column: HTMLElement): boolean {
    for (let node: HTMLElement | null = element; node !== null && node !== column; node = node.parentElement) {
      if (node.hasAttribute('data-chat-motion')) return true
    }
    return false
  }

  /**
   * @param element - inserted node.
   * @param column - chat column.
   * @returns whether an ancestor is already fading; its opacity already covers
   * this subtree, and a second fade would arrive at a different rate.
   */
  private hasFadingAncestor(element: HTMLElement, column: HTMLElement): boolean {
    for (let node: HTMLElement | null = element; node !== null && node !== column; node = node.parentElement) {
      if (this.byElement.has(node)) return true
    }
    return false
  }

  /**
   * Play one fade, replacing an earlier fade on the same element.
   * @param element - new content block.
   */
  private fade(element: HTMLElement): void {
    if (this.prefersReducedMotion()) return
    if (typeof element.animate !== 'function') return
    const previous = this.byElement.get(element)
    if (previous !== undefined) {
      this.byElement.delete(element)
      this.animations.delete(previous)
      previous.cancel()
    }
    let end = 1
    try {
      const parsed = Number.parseFloat(this.win.getComputedStyle(element).opacity)
      if (Number.isFinite(parsed)) end = parsed
    } catch {
      /* Keep the default; a detached node simply will not animate visibly. */
    }
    // A block already transparent is owned by some other transition.
    if (!(end > 0.05)) return
    let animation: Animation
    try {
      animation = element.animate(
        [{ opacity: 0 }, { opacity: end }],
        { duration: FADE_IN_DURATION_MS, easing: FADE_IN_EASING, fill: 'none' },
      )
    } catch {
      return
    }
    this.byElement.set(element, animation)
    this.animations.add(animation)
    const settle = (): void => {
      if (this.byElement.get(element) === animation) this.byElement.delete(element)
      this.animations.delete(animation)
    }
    animation.onfinish = settle
    animation.oncancel = settle
  }

  /** Cancel every fade this engine started. */
  private cancelAnimations(): void {
    const animations = [...this.animations]
    this.animations.clear()
    this.byElement = new WeakMap<HTMLElement, Animation>()
    for (const animation of animations) animation.cancel()
  }

  /** @returns whether the OS asks for reduced motion. */
  private prefersReducedMotion(): boolean {
    if (typeof this.win.matchMedia !== 'function') return false
    return this.win.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /** @returns a monotonic millisecond clock for warmup expiry. */
  private now(): number {
    return typeof this.win.performance?.now === 'function' ? this.win.performance.now() : Date.now()
  }
}
