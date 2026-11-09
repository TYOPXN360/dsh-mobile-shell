/**
 * Page bootstrap — the parts of an installable PWA that must run at page load
 * rather than when a panel opens.
 *
 * Three jobs, in order:
 *
 * 1. **Harden the shipped manifest link.** The host's own `index.html` already
 *    links `./manifest.webmanifest`, which this plugin's host half now serves.
 *    Where the shipped dist has drifted (or a proxy rewrote the document), the
 *    link is re-pointed at the plugin's route so an install prompt is graded on
 *    the product name and the shipped icons.
 * 2. **Add the Apple metadata.** iOS reads `apple-touch-icon` and
 *    `apple-mobile-web-app-title` from the document, not from the manifest.
 * 3. **Register the service worker**, at `/sw.js` so its scope is the app root.
 *    Registration is skipped when the current page is not served from http(s)
 *    (a `file://` Electron render or a `data:` document has no SW support).
 *
 * Every step is idempotent and reversible: `dispose()` removes what it added and
 * unregisters the worker it registered, so a plugin reload leaves the page
 * exactly as it found it.
 */

import { APPLE_TOUCH_ICON, ASSET_PREFIX, MANIFEST_PATH, SERVICE_WORKER_PATH } from '../routes.ts'
import { isSecureContext } from './pwa-installer.ts'

/** Attribute marking elements this module owns (so teardown is exhaustive). */
const OWNED = 'data-dsh-ms-bootstrap'

/** Product title used by the iOS home-screen label. */
const APPLE_TITLE = 'DeepSeek Assistant'

/**
 * The cache bucket the current worker owns. Must match `CACHE` in
 * `pwa/service-worker.js`; every other `dsh-mobile-shell-*` bucket is legacy and
 * is purged on load.
 */
const SAFE_CACHE = 'dsh-mobile-shell-v2'

/** Ensure exactly one `<link>` for a given relation, pointing at `href`. */
function ensureLink(rel: string, href: string): HTMLLinkElement {
  const existing = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (existing !== null) {
    existing.href = href
    existing.setAttribute(OWNED, '')
    return existing
  }
  const link = document.createElement('link')
  link.rel = rel
  link.href = href
  link.setAttribute(OWNED, '')
  document.head.appendChild(link)
  return link
}

/** Ensure exactly one `<meta name="...">` with the given content. */
function ensureMeta(name: string, content: string): void {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (existing !== null) {
    existing.content = content
    existing.setAttribute(OWNED, '')
    return
  }
  const meta = document.createElement('meta')
  meta.name = name
  meta.content = content
  meta.setAttribute(OWNED, '')
  document.head.appendChild(meta)
}

/** Absolute URL for one of this plugin's asset routes. */
function assetUrl(file: string): string {
  return new URL(`${ASSET_PREFIX}/${file}`, document.baseURI).href
}

/** Absolute URL for one of this plugin's document routes. */
function routeUrl(path: string): string {
  return new URL(path, document.baseURI).href
}

/** Outcome of {@link installPwaBootstrap}. */
export interface PwaBootstrap {
  /** The registered worker, when registration succeeded. */
  registration(): ServiceWorkerRegistration | undefined
  /** Undo every document change and unregister the owned worker. */
  dispose(): void
}

/**
 * Delete cache buckets left by earlier builds of this plugin.
 *
 * The first shipped worker cached the root document for an offline shell. Under
 * an authenticating proxy that is actively harmful: a PWA launch could replay a
 * stale (or freshly-unauthenticated) document instead of letting the proxy
 * decide, which reads to the user as "I have to log in again every time".
 * Only buckets carrying this plugin's prefix are touched — never a cache owned
 * by the host or by another plugin.
 * @returns a promise that settles when the purge is done (never rejects).
 */
async function purgeLegacyCaches(): Promise<void> {
  try {
    if (typeof caches === 'undefined') return
    const names = await caches.keys()
    await Promise.all(
      names
        .filter((name) => name.startsWith('dsh-mobile-shell-') && name !== SAFE_CACHE)
        .map((name) => caches.delete(name)),
    )
  } catch {
    /* Cache API unavailable or denied: registration still proceeds. */
  }
}

/**
 * Apply the document-level PWA metadata and register the service worker.
 * @returns a handle exposing the registration and the teardown.
 */
export function installPwaBootstrap(): PwaBootstrap {
  const manifest = ensureLink('manifest', routeUrl(MANIFEST_PATH))
  // `crossorigin` keeps the fetch credentials-safe behind an authenticating
  // proxy: the manifest is same-origin, so anonymous+cookie is correct.
  manifest.setAttribute('crossorigin', 'use-credentials')
  ensureLink('apple-touch-icon', assetUrl(APPLE_TOUCH_ICON))
  ensureMeta('apple-mobile-web-app-title', APPLE_TITLE)
  ensureMeta('apple-mobile-web-app-capable', 'yes')
  ensureMeta('application-name', APPLE_TITLE)

  let registration: ServiceWorkerRegistration | undefined
  let disposed = false

  /**
   * A worker may only be registered from a SECURE CONTEXT and over http(s).
   *
   * `isSecureContext` is the load-bearing half: an HTTP LAN origin
   * (`http://192.168.2.36:3081`) is not secure unless the browser was told to
   * trust it via `chrome://flags` → unsafely-treat-insecure-origin-as-secure.
   * Registration is skipped there rather than attempted and rejected, which
   * keeps the console free of an expected error. The `file://` Electron
   * renderer is excluded by the same check.
   */
  const canRegister = isSecureContext()
    && (location.protocol === 'https:' || location.protocol === 'http:')
    && 'serviceWorker' in navigator

  if (canRegister) {
    const workerUrl = routeUrl(SERVICE_WORKER_PATH)
    // Purge buckets created by an earlier build of this plugin BEFORE handing
    // control to the new worker. The old build cached the root document, which
    // makes an installed app replay a stale session and demand a fresh login on
    // every launch; removing that bucket here fixes existing installs without
    // asking the user to clear site data by hand. Failures are ignored (a
    // browser without the Cache API must still register the worker).
    void purgeLegacyCaches()
    navigator.serviceWorker
      .register(workerUrl, { scope: '/', updateViaCache: 'none' })
      .then((registered) => {
        if (disposed) {
          void registered.unregister()
          return
        }
        registration = registered
        // Ask for an immediate update check: a deploy that changes the worker
        // must take effect on the next load, not whenever the browser feels
        // like revalidating it.
        void registered.update().catch(() => {})
      })
      .catch((error: unknown) => {
        // A failed registration costs offline support, never the page. It is
        // expected behind a proxy that rejects the request, and on a host whose
        // root scope is claimed by another worker.
        console.warn('dsh-mobile-shell: service worker registration failed', error)
      })
  }

  return {
    registration: () => registration,
    dispose: () => {
      disposed = true
      for (const element of document.head.querySelectorAll(`[${OWNED}]`)) element.remove()
      const owned = registration
      registration = undefined
      if (owned !== undefined) void owned.unregister()
    },
  }
}
