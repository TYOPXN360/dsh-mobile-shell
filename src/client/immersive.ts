/**
 * Edge-to-edge PWA chrome — the browser-side half of the immersive status bar.
 *
 * The host half writes `viewport-fit=cover` and the Apple metas into the served
 * index, so the first layout already has the safe-area contract. This module is
 * the runtime companion: it covers pages served before the host transform was
 * installed, writes the transparent `theme-color` while the page runs as an
 * installed app, and marks `<html>` so the stylesheet can apply the safe-area
 * padding.
 *
 * Android 10+ uses the manifest's `theme_color: transparent` for the status bar
 * background; the clock and battery icons are drawn by the system. iOS has no
 * fully transparent option, so its closest mode is
 * `apple-mobile-web-app-status-bar-style=black-translucent` (content behind a
 * translucent dark bar). The same safe-area CSS covers both.
 *
 * The CSS half lives in `styles.ts`: while `<html data-dsh-ms-standalone>` is
 * present, the frame keeps painting its base background under the system bars
 * and pads only its CONTENT by the safe-area insets, so no header control is
 * hidden behind the clock. The flag is driven by JavaScript rather than a bare
 * `display-mode` media query because an installed iOS web app exposes the older
 * `navigator.standalone` property instead.
 *
 * Everything is reversible: a plugin reload restores the host's original
 * viewport/theme metadata and removes the flag.
 */

import {
  DEFAULT_VIEWPORT_WITH_COVER,
  viewportWithCover,
} from '../pwa/viewport.ts'

/** Re-exported so callers can test the same helper the host transform uses. */
export { viewportWithCover }

/** Marks `<html>` while the page is running as an installed app. */
export const STANDALONE_ATTRIBUTE = 'data-dsh-ms-standalone'

/** The transparent theme colour consumed by Android Chrome/WebAPK. */
export const IMMERSIVE_THEME_COLOR = 'transparent'

/**
 * The ordinary browser-tab colour. The manifest itself is transparent, so a
 * normal tab gets this meta as a best-effort override; browsers that give the
 * manifest precedence may still use the transparent value in a tab.
 */
export const BROWSER_THEME_COLOR = '#111213'

/** iOS's only "content behind the status bar" style. */
export const APPLE_STATUS_BAR_STYLE = 'black-translucent'

/** One reversible document change. */
interface DocumentChange {
  undo(): void
}

/** A meta element plus its reversible change. */
interface MetaHandle extends DocumentChange {
  element: HTMLMetaElement
}

/**
 * Ensure exactly one `<meta name="...">` and return a handle to it.
 *
 * An element the host already owns is UPDATED, not recreated, and `undo()`
 * restores its previous content. Removing a host meta on teardown would strip
 * metadata this plugin never owned.
 * @param doc - document whose head is edited.
 * @param name - meta name.
 * @param content - value to write.
 * @returns the element and its undo action.
 */
function ensureMeta(doc: Document, name: string, content: string): MetaHandle {
  const existing = doc.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (existing !== null) {
    const previous = existing.getAttribute('content')
    existing.setAttribute('content', content)
    return {
      element: existing,
      undo: () => {
        if (previous === null) existing.removeAttribute('content')
        else existing.setAttribute('content', previous)
      },
    }
  }

  const meta = doc.createElement('meta')
  meta.setAttribute('name', name)
  meta.setAttribute('content', content)
  doc.head.appendChild(meta)
  return {
    element: meta,
    undo: () => meta.remove(),
  }
}

/**
 * Add `viewport-fit=cover` to the host's viewport declaration.
 * @param doc - document whose head is edited.
 * @returns the reversible change.
 */
function ensureViewportCover(doc: Document): DocumentChange {
  const existing = doc.head.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  if (existing === null) {
    const meta = doc.createElement('meta')
    meta.setAttribute('name', 'viewport')
    meta.setAttribute('content', DEFAULT_VIEWPORT_WITH_COVER)
    doc.head.appendChild(meta)
    return { undo: () => meta.remove() }
  }

  const previous = existing.getAttribute('content')
  const next = viewportWithCover(previous ?? '')
  if (next === previous) return { undo: () => {} }
  existing.setAttribute('content', next)
  return {
    undo: () => {
      if (previous === null) existing.removeAttribute('content')
      else existing.setAttribute('content', previous)
    },
  }
}

/**
 * Whether this window is currently an installed app.
 *
 * Kept local instead of importing the install controller: this module only
 * needs the read-only posture, and the extra `matchMedia` calls are cheaper
 * than coupling the stylesheet contract to the install state machine.
 * @param win - window to inspect.
 * @returns true for standalone, fullscreen, minimal-ui, or iOS home-screen mode.
 */
function isStandaloneWindow(win: Window): boolean {
  if (typeof win.matchMedia === 'function') {
    for (const mode of ['standalone', 'fullscreen', 'minimal-ui']) {
      if (win.matchMedia(`(display-mode: ${mode})`).matches) return true
    }
  }
  const navigatorWithStandalone = win.navigator as Navigator & { standalone?: boolean }
  return navigatorWithStandalone.standalone === true
}

/**
 * Mirror the standalone posture onto `<html>` and keep it current.
 *
 * The attribute is what CSS gates the safe-area padding on. It is written
 * before the first layout this plugin can influence, and updated if the browser
 * moves between display modes.
 * @param doc - document whose root is marked.
 * @param win - window supplying the display-mode signal.
 * @returns the teardown for the listeners and the attribute.
 */
function watchStandalone(doc: Document, win: Window): DocumentChange {
  const sync = (): void => {
    if (isStandaloneWindow(win)) doc.documentElement.setAttribute(STANDALONE_ATTRIBUTE, '')
    else doc.documentElement.removeAttribute(STANDALONE_ATTRIBUTE)
  }

  sync()

  const modes = ['standalone', 'fullscreen', 'minimal-ui']
    .map((mode) => win.matchMedia(`(display-mode: ${mode})`))
  for (const mode of modes) mode.addEventListener('change', sync)
  win.addEventListener('appinstalled', sync)

  return {
    undo: () => {
      for (const mode of modes) mode.removeEventListener('change', sync)
      win.removeEventListener('appinstalled', sync)
      doc.documentElement.removeAttribute(STANDALONE_ATTRIBUTE)
    },
  }
}

/** Handle returned by {@link installImmersive}. */
export interface ImmersiveController {
  /** Restore the host's metadata and remove the standalone flag. */
  dispose(): void
}

/**
 * Apply the immersive PWA document metadata.
 *
 * This is page-load work, not panel work: the viewport declaration must exist
 * before the phone lays the app out, and the theme colour must be in the
 * document before the status bar is painted.
 * @param doc - document to edit (defaults to the current document).
 * @param win - window supplying the display-mode signal (defaults to the current window).
 * @returns the teardown.
 */
export function installImmersive(
  doc: Document = document,
  win: Window = window,
): ImmersiveController {
  const viewport = ensureViewportCover(doc)
  const theme = ensureMeta(doc, 'theme-color', BROWSER_THEME_COLOR)
  const appleStatusBar = ensureMeta(doc, 'apple-mobile-web-app-status-bar-style', APPLE_STATUS_BAR_STYLE)
  const appleCapable = ensureMeta(doc, 'apple-mobile-web-app-capable', 'yes')
  const standalone = watchStandalone(doc, win)

  /**
   * The installed app gets the transparent bar; a normal browser tab gets the
   * brand-dark value. Some Chromium builds ignore dynamic theme-color changes
   * in an installed app, so the manifest's static `transparent` is the primary
   * mechanism and this is the complement for browsers that do honour it.
   */
  const syncTheme = (): void => {
    theme.element.setAttribute(
      'content',
      isStandaloneWindow(win) ? IMMERSIVE_THEME_COLOR : BROWSER_THEME_COLOR,
    )
  }
  syncTheme()
  win.addEventListener('appinstalled', syncTheme)

  let disposed = false
  return {
    dispose: () => {
      if (disposed) return
      disposed = true
      win.removeEventListener('appinstalled', syncTheme)
      standalone.undo()
      appleCapable.undo()
      appleStatusBar.undo()
      theme.undo()
      viewport.undo()
    },
  }
}
