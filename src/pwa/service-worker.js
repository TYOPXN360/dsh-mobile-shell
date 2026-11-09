/**
 * Service worker — the offline cache that makes the PWA installable on the
 * platforms that insist on a fetch handler.
 *
 * Scope: served from the application root (`/sw.js`) so it can control the whole
 * app. It never touches API traffic and never intercepts anything but GET.
 *
 * ## The authentication rule (why this worker is deliberately timid)
 *
 * This app is commonly reached through an authenticating reverse proxy
 * (`dsh-full-remote`), which gates everything behind a device cookie and
 * redirects unauthenticated navigations to `/_dsh_reverse_proxy/login`. A
 * service worker sits BELOW that gate: it sees a fetch only as the page issues
 * it, and anything it answers from cache bypasses the gate entirely. Serving a
 * remembered document is therefore how "the PWA asks me to log in again every
 * launch" happens — the cached copy either replays a stale session or replays
 * the login redirect.
 *
 * The rule that prevents it: a navigation request is ALWAYS network-only, its
 * response is NEVER stored, and the login gate's own paths are never touched. A
 * "network-only navigation" is the whole fix: whatever the proxy decides, the
 * browser sees, every time.
 *
 * Only content-hashed build assets are cached. Their filename IS their version,
 * they contain no user data, and they cannot leak a session. The cost is that
 * the app needs the network to start — acceptable for a live agent console that
 * is useless offline anyway. The benefit is that this worker can never
 * interfere with authentication.
 *
 * This file is shipped as text (not compiled) because it must stay a classic
 * script at the application root.
 */

/** Cache bucket name; bumping the suffix retires every older entry on activate. */
const CACHE = 'dsh-mobile-shell-v2'

/** Build assets are immutable; the name carries the content hash. */
const HASHED_ASSET = /^\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(?:js|mjs|css|woff2?|ttf|otf|json|wasm)$/

/** The reverse proxy's gate prefix: login, wait, home, logout. Never cached. */
const AUTH_PREFIX = '/_dsh_reverse_proxy/'

/** Prefix identifying caches this plugin owns, for activation cleanup. */
const CACHE_PREFIX = 'dsh-mobile-shell-'

self.addEventListener('install', (event) => {
  // Deliberately no shell prefetch: caching the root document is exactly what
  // resurrects a stale session. Activation is all this worker needs to install.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    // Remove every bucket this plugin created that is not the current one, so a
    // user upgrading from the old shell-caching build gets the safe behaviour
    // immediately rather than after a manual cache clear.
    await Promise.all(
      names
        .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE)
        .map((name) => caches.delete(name)),
    )
    await self.clients.claim()
  })())
})

/**
 * Cache-first for content-hashed build assets only.
 * @param event - the fetch event.
 * @returns the cached response, or the network's.
 */
async function handleHashedAsset(event) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(event.request)
  if (cached) return cached
  const response = await fetch(event.request)
  // Only a plain same-origin 200 is storable: an opaque or redirected response
  // would put something unusable (or gate-related) into the cache.
  if (response.status === 200 && response.type === 'basic' && !response.redirected) {
    const copy = response.clone()
    event.waitUntil(cache.put(event.request, copy))
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // The login gate and every navigation are pure network. This worker's job
  // here is to stay out of the way of session establishment.
  if (url.pathname.startsWith(AUTH_PREFIX)) return
  if (request.mode === 'navigate') return

  if (HASHED_ASSET.test(url.pathname)) event.respondWith(handleHashedAsset(event))
})
