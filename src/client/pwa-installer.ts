/**
 * PWA install plumbing — the browser half of "添加为 PWA 应用".
 *
 * The settings row is a *control*, not a promise: browsers only allow an
 * install prompt after they have decided the page is installable and the user
 * has interacted with it. So this module models exactly those three facts:
 *
 * - `installable` — a `beforeinstallprompt` event was captured and its
 *   `prompt()` is still usable;
 * - `installed`   — the app is already running standalone (launched from the
 *   home screen), or `appinstalled` fired in this session;
 * - `manual`      — no prompt API at all (iOS Safari), so the row shows the
 *   manual path instead of a dead button.
 *
 * A captured `BeforeInstallPromptEvent` can be used exactly once: after
 * `prompt()` resolves the event is spent and a later tap would reject. The
 * handler therefore DROPS the reference as soon as it is used, and waits for a
 * fresh event (the browser re-fires one if the app remains installable).
 *
 * Nothing here registers the service worker: that is the bootstrap's job (see
 * `pwa-bootstrap.ts`), because registration must happen at page load rather
 * than when the settings panel opens.
 */

/** The non-standard install prompt event Chromium fires. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** What the settings row renders. */
export type PwaState =
  /** Running as an installed app (standalone display mode). */
  | 'installed'
  /** A prompt is available right now. */
  | 'ready'
  /** The browser offers no API; the user must use the browser menu. */
  | 'manual'
  /** iOS Safari: the share-sheet path is the only one. */
  | 'ios'
  /**
   * The page is NOT a secure context, so installation is impossible no matter
   * what the user does. This is the state a LAN deployment hits: browsers only
   * grant the PWA APIs (install prompt, service worker) to `https://` origins
   * and to `localhost`/`127.0.0.1`. An HTTP origin such as
   * `http://192.168.2.36:3081` is neither, and reporting it as merely "not
   * ready" sends the user hunting for a missing button that can never appear.
   */
  | 'insecure'
  /** The prompt API exists but no prompt has been offered yet. */
  | 'pending'

/** Snapshot handed to subscribers. */
export interface PwaSnapshot {
  state: PwaState
  /** True while `prompt()` is in flight. */
  busy: boolean
  /**
   * The origin the page is served from, shown in the insecure-state hint so the
   * user can tell WHY installation is unavailable (and what to change).
   */
  origin: string
}

/** Listener signature. */
export type PwaListener = (snapshot: PwaSnapshot) => void

/** Whether the current window runs as an installed app. */
export function isStandalone(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true
  // iOS Safari exposes a non-standard flag instead of display-mode.
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return navigatorWithStandalone.standalone === true
}

/**
 * Whether this looks like iOS Safari, where no prompt API exists and the only
 * install path is Share → Add to Home Screen.
 */
export function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  // Chrome/Firefox/Edge on iOS are all WebKit and equally cannot install; the
  // copy is the same, so the whole iOS family is reported here.
  return iOS
}

/**
 * Whether this page is a secure context, which is the gate on every PWA API.
 *
 * `https://` and `localhost`/`127.0.0.1` qualify; a plain-HTTP LAN address does
 * not. The browser exposes the answer as `window.isSecureContext`, but a very
 * old engine may not, so the origin is checked as a fallback rather than
 * assuming `true`.
 * @returns true when install prompt and service worker are permitted.
 */
export function isSecureContext(): boolean {
  if (typeof window.isSecureContext === 'boolean') return window.isSecureContext
  try {
    const { protocol, hostname } = location
    return protocol === 'https:'
      || hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '[::1]'
      || hostname === '::1'
  } catch {
    return false
  }
}

/**
 * The install controller. One instance per plugin fiber.
 */
export class PwaInstaller {
  private prompt: BeforeInstallPromptEvent | null = null

  private installed = false

  private busy = false

  private listeners = new Set<PwaListener>()

  private disposers: Array<() => void> = []

  /** Start listening for the browser's install signals. */
  start(): void {
    this.installed = isStandalone()

    const onBeforeInstallPrompt = (event: Event): void => {
      // Keep the event: calling preventDefault() defers the mini-infobar so the
      // settings row can offer install at a moment the user chose.
      event.preventDefault()
      this.prompt = event as BeforeInstallPromptEvent
      this.emit()
    }
    const onInstalled = (): void => {
      this.installed = true
      this.prompt = null
      this.emit()
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    this.disposers.push(() => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    })

    // display-mode is the authoritative "am I an installed app" signal: the
    // user may have launched from the home screen before this page loaded.
    const standalone = window.matchMedia('(display-mode: standalone)')
    const onDisplayMode = (): void => {
      this.installed = isStandalone()
      this.emit()
    }
    standalone.addEventListener('change', onDisplayMode)
    this.disposers.push(() => standalone.removeEventListener('change', onDisplayMode))

    this.emit()
  }

  /** Stop listening and drop the captured prompt. */
  dispose(): void {
    for (const dispose of this.disposers) dispose()
    this.disposers = []
    this.listeners.clear()
    this.prompt = null
  }

  /** Subscribe to snapshot changes; the returned function unsubscribes. */
  subscribe(listener: PwaListener): () => void {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** The current snapshot. */
  snapshot(): PwaSnapshot {
    return { state: this.state(), busy: this.busy, origin: location.origin }
  }

  /** Resolve the state from the facts above, in priority order. */
  private state(): PwaState {
    // Already an app: nothing else matters.
    if (this.installed) return 'installed'
    // A live prompt can only exist in a secure context, so this check is safe to
    // run after it and before every "cannot" branch.
    if (this.prompt !== null) return 'ready'
    // THE decisive fact for a LAN deployment: an insecure origin can never
    // install, so say so instead of implying the browser simply has not offered
    // the prompt yet.
    if (!isSecureContext()) return 'insecure'
    if (isIosSafari()) return 'ios'
    // The event constructor is the reliable capability probe: Chromium defines
    // it whether or not it has fired yet, and Firefox/Safari never do. (An
    // `onbeforeinstallprompt` property check is NOT reliable — the property is
    // absent on some Chromium builds that still support installation.)
    if (!('BeforeInstallPromptEvent' in window)) return 'manual'
    return 'pending'
  }

  /**
   * Show the browser's install prompt.
   * @returns the user's choice, or undefined when no prompt was available.
   */
  async install(): Promise<'accepted' | 'dismissed' | undefined> {
    const prompt = this.prompt
    if (prompt === null || this.busy) return undefined
    this.busy = true
    this.emit()
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      // The event is spent either way; a new one arrives only if the app stays
      // installable, so never reuse this reference.
      this.prompt = null
      if (choice.outcome === 'accepted') this.installed = true
      return choice.outcome
    } catch (error) {
      console.warn('dsh-mobile-shell: install prompt failed', error)
      this.prompt = null
      return undefined
    } finally {
      this.busy = false
      this.emit()
    }
  }

  /** Publish the snapshot to every subscriber. */
  private emit(): void {
    const snapshot = this.snapshot()
    for (const listener of this.listeners) {
      try {
        listener(snapshot)
      } catch (error) {
        console.warn('dsh-mobile-shell: pwa listener failed', error)
      }
    }
  }
}
