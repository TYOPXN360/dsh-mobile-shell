/**
 * Host-half wiring tests.
 *
 * `apply` is the seam the DSH loader calls: it must register the manifest,
 * icons, worker, and — on hosts that expose the seat — the index transform that
 * puts `viewport-fit=cover` into the HTML before the phone parses it. These
 * tests use a recording context so a missing registration fails here instead of
 * on a phone.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { apply } from '../lib/index.js'

/**
 * Build a context that records routes and index transforms, and runs every
 * effect immediately (the tests never dispose the plugin).
 * @param {object} [options] - whether the fake server exposes tapIndex.
 * @returns the recording context and its tables.
 */
function recordingContext({ tapIndex = true } = {}) {
  const routes = []
  const taps = []
  const effects = []

  const context = {
    routes,
    taps,
    effect(install) {
      const dispose = install()
      if (typeof dispose === 'function') effects.push(dispose)
      return dispose
    },
    get() {
      return undefined
    },
    inject(_services, run) {
      const scoped = {
        ...context,
        webServer: {
          register(route) {
            routes.push(route)
            return () => {}
          },
          ...(tapIndex ? {
            tapIndex(transform) {
              taps.push(transform)
              return () => {}
            },
          } : {}),
        },
      }
      run(scoped)
    },
    logger: { warn() {} },
  }

  return { context, routes, taps, effects }
}

test('the host registers the manifest, icons, worker, and index transform', () => {
  const { context, routes, taps } = recordingContext()
  apply(context)

  const paths = routes.map((route) => route.path)
  assert.ok(paths.includes('/manifest.webmanifest'))
  assert.ok(paths.includes('/sw.js'))
  assert.ok(paths.includes('/_dsh_mobile_shell/icon-192.png'))
  assert.ok(paths.includes('/_dsh_mobile_shell/apple-touch-icon.png'))

  assert.equal(taps.length, 1, 'the immersive index transform must be registered')
  const out = taps[0]('<html><head><meta name="viewport" content="width=device-width"></head></html>')
  assert.match(out, /viewport-fit=cover/)
  assert.match(out, /apple-mobile-web-app-status-bar-style/)
})

test('an older host without the index seat still applies cleanly', () => {
  const { context, routes, taps } = recordingContext({ tapIndex: false })
  apply(context)

  assert.equal(taps.length, 0)
  assert.ok(routes.some((route) => route.path === '/manifest.webmanifest'))
})
