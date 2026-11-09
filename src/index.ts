/**
 * dsh-mobile-shell — host half.
 *
 * Serves the three things a browser needs before it will offer "install this
 * app", and nothing else. The mobile drawer itself is entirely a browser-side
 * concern (see `client/`), so this half has no layout knowledge at all:
 *
 * - `GET /manifest.webmanifest` — the web app manifest. Claimed as an EXACT
 *   route so it wins over the frontend's static fallback: the manifest must
 *   name the product and the shipped icons even on a build whose own dist has
 *   drifted, and an install prompt is graded on exactly those fields.
 * - `GET /_dsh_mobile_shell/icon-*.png`, `apple-touch-icon.png` — byte-for-byte
 *   copies of the icons the DSH UI already ships, so the installed app is
 *   visually the shipped app rather than a second brand.
 * - `GET /sw.js` — the service worker. It must live at the application root
 *   (`/sw.js`, not under a plugin prefix) or its default scope cannot cover
 *   the app shell.
 *
 * Nothing here authenticates: these routes are reached through whatever gate
 * fronts the Web server (loopback, a trusted host, or a token proxy), and they
 * expose no state. The manifest carries no user data and the worker caches only
 * content-hashed build assets plus one same-origin shell document.
 */
import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  APPLE_TOUCH_ICON,
  SHIPPED_ICONS,
  buildManifest,
  type ManifestInput,
} from './pwa/manifest.js'
import { ASSET_PREFIX, MANIFEST_PATH, SERVICE_WORKER_PATH } from './routes.js'

/** Minimal structural slice of the host cordis Context this plugin reads. */
export interface HostContext {
  /** Register one disposable installer; its return value disposes on unload. */
  effect(install: () => unknown, label?: string): unknown
  /** Read one optional service by name (undefined when the host omits it). */
  get(service: string): unknown
  /** Run apply once the named services exist (cordis fiber inject). */
  inject(services: readonly string[], apply: (scoped: ScopedContext) => void): void
  /** Host logger service face (warn-level is all this plugin uses). */
  logger: { warn(message: string): void }
}

/** The web route registry surface this plugin uses. */
export interface WebServerFace {
  register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
  }): unknown
}

/** Context shape inside the `webServer` inject scope. */
export interface ScopedContext extends HostContext {
  webServer: WebServerFace
}

/** Application name on the install prompt and the launcher label. */
const PRODUCT_NAME = 'DeepSeek Assistant'

/**
 * Launcher short label. Android truncates around 12 characters, so the product
 * abbreviation the UI already uses ("DSH") is the honest choice over a clipped
 * "DeepSeek Assi…".
 */
const SHORT_NAME = 'DSH'

/** Content types, named rather than keyed so a lookup can never be undefined. */
const MANIFEST_TYPE = 'application/manifest+json; charset=utf-8'
const SCRIPT_TYPE = 'application/javascript; charset=utf-8'
const PNG_TYPE = 'image/png'
const SVG_TYPE = 'image/svg+xml'

/** MIME type for one shipped asset, by extension. */
function assetType(file: string): string {
  if (file.endsWith('.png')) return PNG_TYPE
  if (file.endsWith('.svg')) return SVG_TYPE
  return 'application/octet-stream'
}

/**
 * Resolve the plugin's own `assets/` directory.
 *
 * `build-host.mjs` copies the icon set into `lib/assets/`, and `lib/` is where
 * this file lives at runtime, so an installed tarball resolves its icons
 * without needing a path that climbs out of the package. The fallback keeps a
 * source checkout working before the first build.
 */
function assetsDirectory(): string {
  const compiled = dirname(fileURLToPath(import.meta.url))
  return join(compiled, 'assets')
}

/** Write one response with a fixed content type and cache policy. */
function send(
  res: ServerResponse,
  status: number,
  contentType: string,
  body: string | Buffer,
  cacheControl: string,
): void {
  const payload = typeof body === 'string' ? Buffer.from(body, 'utf8') : body
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': payload.byteLength,
    'Cache-Control': cacheControl,
  })
  res.end(payload)
}

/** Reject anything but a read; the manifest and icons are immutable documents. */
function methodNotAllowed(res: ServerResponse): void {
  res.writeHead(405, { Allow: 'GET, HEAD' })
  res.end()
}

/**
 * Whether the request asked for a body-less read. HEAD must not receive a body,
 * but its headers are the GET headers so caches and install prompts agree.
 */
function isHead(req: IncomingMessage): boolean {
  return req.method === 'HEAD'
}

/**
 * Serve one file from `assets/`, or 404 when the name is not one this plugin
 * ships. The name is checked against the shipped set rather than sanitized:
 * a path-traversal attempt simply misses the set and never reaches the disk.
 * @param res - response owner.
 * @param file - bare file name from the plugin's asset list.
 * @param cacheControl - cache policy for this response.
 */
async function serveAsset(
  res: ServerResponse,
  file: string,
  cacheControl: string,
): Promise<void> {
  const shipped = new Set<string>([
    ...SHIPPED_ICONS.map((icon) => icon.file),
    APPLE_TOUCH_ICON,
  ])
  if (!shipped.has(file)) {
    res.writeHead(404)
    res.end()
    return
  }
  try {
    const body = await readFile(join(assetsDirectory(), file))
    send(res, 200, assetType(file), body, cacheControl)
  } catch (error) {
    res.writeHead(404)
    res.end()
    throw error
  }
}

/**
 * Build the manifest document for one request.
 *
 * `start_url` and `scope` are absolute, and both are `/`: a phone that installs
 * the app through a reverse proxy on some other port or host must still land on
 * that surface's own root, and a relative value would resolve against the
 * manifest URL rather than the application root.
 * @returns the serializable manifest.
 */
export function manifestFor(): ReturnType<typeof buildManifest> {
  const input: ManifestInput = {
    id: '/',
    name: PRODUCT_NAME,
    shortName: SHORT_NAME,
    description: 'DeepSeek Assistant Web UI',
    lang: 'zh-CN',
    dir: 'ltr',
    startUrl: '/',
    scope: '/',
    display: 'standalone',
    displayOverride: ['standalone', 'minimal-ui'],
    orientation: 'any',
    backgroundColor: '#111213',
    themeColor: '#111213',
    categories: ['productivity', 'developer'],
    icons: SHIPPED_ICONS.map((icon) => ({
      src: `${ASSET_PREFIX}/${icon.file}`,
      sizes: icon.sizes,
      type: icon.type,
      purpose: icon.purpose,
    })),
  }
  return buildManifest(input)
}

/**
 * Plugin name, per the official minimal plugin shape (name + apply). The patch
 * row in cordis.patch.yml carries the same id.
 */
export const name = 'dsh-mobile-shell'

/**
 * Register the PWA routes.
 *
 * Every route is registered inside the `webServer` inject scope and disposed
 * with the plugin fiber, so a reload leaves no stale handler behind.
 * @param ctx - host root context.
 */
export function apply(ctx: HostContext): void {
  ctx.inject(['webServer'], (scoped) => {
    const { webServer } = scoped

    // The manifest is recomputed per request (it is pure and cheap) so a
    // future config surface needs no cache invalidation.
    scoped.effect(() => webServer.register({
      kind: 'exact',
      path: MANIFEST_PATH,
      handler: (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          methodNotAllowed(res)
          return
        }
        const body = JSON.stringify(manifestFor())
        if (isHead(req)) {
          res.writeHead(200, {
            'Content-Type': MANIFEST_TYPE,
            'Content-Length': Buffer.byteLength(body),
            'Cache-Control': 'no-cache',
          })
          res.end()
          return
        }
        send(res, 200, MANIFEST_TYPE, body, 'no-cache')
      },
    }), 'dsh-mobile-shell: manifest route')

    // Icons: one exact route per shipped file keeps the URL space closed.
    for (const file of [...SHIPPED_ICONS.map((icon) => icon.file), APPLE_TOUCH_ICON]) {
      scoped.effect(() => webServer.register({
        kind: 'exact',
        path: `${ASSET_PREFIX}/${file}`,
        handler: async (req, res) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            methodNotAllowed(res)
            return
          }
          // Icons never change, and the name is not content-hashed: a day of
          // caching is long enough to matter and short enough to self-heal.
          await serveAsset(res, file, 'public, max-age=86400')
        },
      }), `dsh-mobile-shell: icon ${file}`)
    }

    // The service worker must never be cached by the HTTP cache: a stale copy
    // would pin an old cache strategy for the lifetime of the response.
    scoped.effect(() => webServer.register({
      kind: 'exact',
      path: SERVICE_WORKER_PATH,
      handler: async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          methodNotAllowed(res)
          return
        }
        try {
          const body = await readFile(join(dirname(fileURLToPath(import.meta.url)), 'pwa', 'service-worker.js'))
          if (isHead(req)) {
            res.writeHead(200, {
              'Content-Type': SCRIPT_TYPE,
              'Content-Length': body.byteLength,
              'Cache-Control': 'no-cache',
              'Service-Worker-Allowed': '/',
            })
            res.end()
            return
          }
          res.writeHead(200, {
            'Content-Type': SCRIPT_TYPE,
            'Content-Length': body.byteLength,
            'Cache-Control': 'no-cache',
            // The worker is served at the root already; the header documents the
            // intent and survives a future change to the route's depth.
            'Service-Worker-Allowed': '/',
          })
          res.end(body)
        } catch (error) {
          ctx.logger.warn(`dsh-mobile-shell: service worker unavailable: ${String(error)}`)
          res.writeHead(404)
          res.end()
        }
      },
    }), 'dsh-mobile-shell: service worker route')
  })
}
