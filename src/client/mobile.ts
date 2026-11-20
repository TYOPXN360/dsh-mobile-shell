/**
 * Mobile-adaptation preference.
 *
 * The narrow-screen drawer is the plugin's most invasive feature: it removes
 * the shell's sidebar rail from the grid, overlays it on the conversation, and
 * arms the right-swipe gesture. Some readers prefer the host's own layout on a
 * phone (or need to compare against it while debugging), so the whole
 * adaptation gets its own switch, independent of the PWA and motion rows.
 *
 * The preference is persisted in localStorage and defaults to ON. Only an
 * explicit `'off'` disables it, which keeps the first run identical to the
 * behaviour this plugin shipped before the switch existed.
 *
 * The switch also owns the `<html data-dsh-ms-mobile="off">` marker. CSS keeps
 * the adaptation as the default (no attribute) and stands every drawer rule
 * down when the marker is present, so a disabled reader gets the host's native
 * narrow layout rather than a half-applied overlay.
 */

/** localStorage key holding the reader's preference. */
export const MOBILE_STORAGE_KEY = 'dsh-mobile-shell:mobile'

/** Attribute written on `<html>` only while the adaptation is disabled. */
export const MOBILE_ATTRIBUTE = 'data-dsh-ms-mobile'

/** Value of {@link MOBILE_ATTRIBUTE} that turns the adaptation off. */
export const MOBILE_OFF = 'off'

/** Minimum storage surface this module needs (localStorage-compatible). */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Reader-visible state of the feature. */
export interface MobileSnapshot {
  readonly enabled: boolean
}

type Listener = (snapshot: MobileSnapshot) => void

/**
 * Read the saved preference.
 * @param storage - storage surface, or null when the browser denies access.
 * @returns whether the mobile adaptation is enabled.
 */
export function readMobilePreference(storage: StorageLike | null): boolean {
  try {
    return storage?.getItem(MOBILE_STORAGE_KEY) !== MOBILE_OFF
  } catch {
    return true
  }
}

/**
 * Persist the preference, tolerating private-mode and quota failures.
 * @param storage - storage surface, or null.
 * @param enabled - value to save.
 */
export function writeMobilePreference(storage: StorageLike | null, enabled: boolean): void {
  try {
    storage?.setItem(MOBILE_STORAGE_KEY, enabled ? 'on' : MOBILE_OFF)
  } catch {
    /* A denied storage must not break the switch or the layout. */
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
 * Preference owner shared by the settings row, the drawer wiring and the
 * stylesheet marker. One instance lives with the plugin fiber.
 */
export class MobileController {
  private readonly listeners = new Set<Listener>()
  private current: boolean
  private doc: Document | null = null

  /**
   * @param storage - preference storage; defaults to localStorage when present.
   */
  constructor(private readonly storage: StorageLike | null = defaultStorage()) {
    this.current = readMobilePreference(this.storage)
  }

  /** @returns the current reader-visible state. */
  snapshot(): MobileSnapshot {
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

  /**
   * Publish the current state onto `<html>`. Safe to call more than once.
   * Called before the drawer is wired so a disabled page never paints the
   * overlay for a frame.
   * @param doc - document whose root is marked.
   */
  start(doc: Document = document): void {
    this.doc = doc
    this.syncAttribute()
  }

  /** Remove the marker and drop every listener. */
  dispose(): void {
    this.doc?.documentElement.removeAttribute(MOBILE_ATTRIBUTE)
    this.doc = null
    this.listeners.clear()
  }

  /**
   * Apply and persist a new preference.
   * @param enabled - whether the narrow-screen adaptation should run.
   */
  setEnabled(enabled: boolean): void {
    if (this.current === enabled) return
    this.current = enabled
    writeMobilePreference(this.storage, enabled)
    this.syncAttribute()
    for (const listener of [...this.listeners]) listener(this.snapshot())
  }

  /** Write, or clear, the CSS marker that stands the drawer down. */
  private syncAttribute(): void {
    if (this.doc === null) return
    if (this.current) this.doc.documentElement.removeAttribute(MOBILE_ATTRIBUTE)
    else this.doc.documentElement.setAttribute(MOBILE_ATTRIBUTE, MOBILE_OFF)
  }
}
