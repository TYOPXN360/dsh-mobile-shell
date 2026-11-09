/**
 * Shared route constants.
 *
 * Both halves of the plugin agree on these paths: the host half registers them
 * and the browser half links to them. Keeping them in one module means a route
 * rename cannot silently break the manifest link or the worker registration —
 * the two failure modes that are invisible until someone tries to install the
 * app.
 */

/** Root path the plugin's own assets (manifest, icons) are served under. */
export const ASSET_PREFIX = '/_dsh_mobile_shell'

/** Where the web app manifest is served. */
export const MANIFEST_PATH = '/manifest.webmanifest'

/**
 * Where the service worker is served. It must be the application root, or its
 * default scope cannot cover the app shell (and iOS refuses non-root workers).
 */
export const SERVICE_WORKER_PATH = '/sw.js'

/** Apple's touch icon file name under {@link ASSET_PREFIX}. */
export const APPLE_TOUCH_ICON = 'apple-touch-icon.png'
