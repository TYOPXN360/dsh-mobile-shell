/**
 * Frame bridge — reads and writes the bits of the shell's layout that this
 * plugin needs, without ever replacing the shell.
 *
 * Two responsibilities, both narrow:
 *
 * 1. **Mark the frame.** The shell's frame element carries a hashed CSS class
 *    name that changes between host builds, so the stylesheet cannot select it
 *    directly. We tag it with `data-dsh-mobile-shell="frame"` instead, which is
 *    a contract we own and the stylesheet can rely on.
 *
 * 2. **Publish the right-hand track.** The frame's column template is an
 *    INLINE style (`<n>px minmax(0px, 1fr) minmax(0px, <max>px)`), and the
 *    drawer has to reclaim the first track (the sidebar rail) while leaving the
 *    third one alone. CSS can override the whole property but cannot override
 *    one track, so the third (right-panel) track is republished as a custom
 *    property and the override reads it. Without this, hiding the rail on a
 *    wide touch tablet that has the right panel open would silently delete the
 *    right panel's column.
 */

/** Attribute marking the shell's frame element. */
export const FRAME_ATTRIBUTE = 'data-dsh-mobile-shell'

/** Custom property carrying the frame's right-hand track expression. */
export const FRAME_RIGHT_VAR = '--dsh-ms-frame-right'

/** Default right track: zero, matching a frame with no right panel. */
const ZERO_TRACK = 'minmax(0px, 0px)'

/**
 * Split a track list into its individual tracks.
 *
 * `grid-template-columns` separates tracks with SPACES, while a track function
 * such as `minmax(0px, 1fr)` contains spaces AND a comma of its own. So neither
 * `split(' ')` nor `split(',')` is correct: the split point is a space that
 * occurs outside any parentheses. Depth counting is the whole rule.
 * @param value - the inline track list.
 * @returns the top-level tracks, trimmed, with empty runs collapsed.
 */
export function splitTracks(value: string): string[] {
  const tracks: string[] = []
  let depth = 0
  let current = ''
  for (const char of value) {
    if (char === '(') {
      depth += 1
    } else if (char === ')') {
      depth = Math.max(0, depth - 1)
    } else if ((char === ' ' || char === '\t' || char === '\n') && depth === 0) {
      if (current !== '') tracks.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current !== '') tracks.push(current)
  return tracks
}

/**
 * Extract the third (right panel) track from an inline column template.
 * @param template - the frame's inline `grid-template-columns` value.
 * @returns the third track, or the zero track when the template is not the
 *   expected three-track shape (the shell changed, so assume no right panel).
 */
export function rightTrackOf(template: string): string {
  const tracks = splitTracks(template)
  return tracks.length >= 3 ? (tracks[2] as string) : ZERO_TRACK
}

/** Handle returned by {@link installFrameBridge}. */
export interface FrameBridge {
  /** The marked frame element, or null while the shell has not rendered yet. */
  frame(): HTMLElement | null
  /** Whether the shell currently reports the sidebar as collapsed. */
  shellCollapsed(): boolean
  /** Release observers and the marker. */
  dispose(): void
}

/** The marker element selector, used for lookups after a re-render. */
const FRAME_SELECTOR = `[${FRAME_ATTRIBUTE}="frame"]`

/**
 * Install the bridge: mark the frame, keep the marker alive across React
 * re-renders, and mirror the shell's collapsed flag plus right track onto it.
 * @param onShellChange - called whenever the shell's collapsed flag flips, so
 *   the drawer can reconcile (an external collapse must close the drawer).
 * @returns the bridge handle.
 */
export function installFrameBridge(onShellChange: (collapsed: boolean) => void): FrameBridge {
  let marked: HTMLElement | null = null
  let lastCollapsed: boolean | null = null

  /** Publish the current track expression for the stylesheet's override. */
  const publishRightTrack = (frame: HTMLElement): void => {
    const template = frame.style.gridTemplateColumns
    const right = rightTrackOf(template)
    if (frame.style.getPropertyValue(FRAME_RIGHT_VAR) !== right) {
      frame.style.setProperty(FRAME_RIGHT_VAR, right)
    }
  }

  /** Report the shell's collapsed flag when it changes. */
  const publishCollapsed = (frame: HTMLElement): void => {
    const collapsed = frame.hasAttribute('data-sidebar-collapsed')
    if (lastCollapsed === collapsed) return
    lastCollapsed = collapsed
    onShellChange(collapsed)
  }

  /**
   * Find the frame and attach to it. The frame is identified structurally (it
   * is the element that owns the overlay layer) rather than by class name.
   */
  const sync = (): void => {
    const overlay = document.querySelector('[data-shell-overlay]')
    const frame = (overlay?.parentElement ?? null) as HTMLElement | null
    if (frame === null) return
    if (frame !== marked) {
      if (marked !== null && marked.isConnected) marked.removeAttribute(FRAME_ATTRIBUTE)
      marked = frame
      frame.setAttribute(FRAME_ATTRIBUTE, 'frame')
      publishRightTrack(frame)
      lastCollapsed = null
    }
    publishCollapsed(frame)
    publishRightTrack(frame)
  }

  // A frame re-render (React reuses the node, so the marker usually survives)
  // or a plugin hot-swap (new node) both show up as subtree mutations.
  const observer = new MutationObserver(() => sync())
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'data-sidebar-collapsed'],
  })
  sync()

  return {
    frame: () => (marked !== null && marked.isConnected ? marked : (document.querySelector(FRAME_SELECTOR) as HTMLElement | null)),
    shellCollapsed: () => {
      const frame = marked
      return frame === null ? true : frame.hasAttribute('data-sidebar-collapsed')
    },
    dispose: () => {
      observer.disconnect()
      marked?.removeAttribute(FRAME_ATTRIBUTE)
      marked = null
    },
  }
}
