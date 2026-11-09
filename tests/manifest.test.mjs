/**
 * Manifest and routing contract tests.
 *
 * These assert the handful of facts an install prompt is actually graded on, so
 * a refactor that keeps TypeScript happy but breaks installability fails here
 * instead of on a user's phone.
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { SHIPPED_ICONS, buildManifest } from '../lib/pwa/manifest.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('manifest names the product and the shipped icons', async () => {
  const { manifestFor } = await import('../lib/index.js')
  const manifest = manifestFor()

  assert.equal(manifest.name, 'DeepSeek Assistant')
  assert.equal(manifest.short_name, 'DSH')
  assert.equal(manifest.display, 'standalone')
  // Absolute scope: a manifest served from a nested route must not produce a
  // relative start_url, or the installed app launches into that route.
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.scope, '/')
  assert.ok(String(manifest.id).length > 0, 'manifest needs a stable id')

  const icons = manifest.icons
  assert.ok(Array.isArray(icons) && icons.length >= 2)
  const sizes = icons.map((icon) => icon.sizes)
  assert.ok(sizes.includes('192x192'), 'Chromium requires a 192px icon')
  assert.ok(sizes.includes('512x512'), 'Chromium requires a 512px icon')
  assert.ok(
    icons.some((icon) => icon.purpose === 'maskable'),
    'Android crops the launcher icon without a maskable entry',
  )
  // Icons must point at the plugin's own routes, not the host's internal dist.
  for (const icon of icons) {
    assert.ok(String(icon.src).startsWith('/_dsh_mobile_shell/'), `unexpected icon src: ${icon.src}`)
  }
})

test('manifest is byte-stable across calls', async () => {
  const { manifestFor } = await import('../lib/index.js')
  assert.equal(JSON.stringify(manifestFor()), JSON.stringify(manifestFor()))
})

test('buildManifest keeps declared key order and drops absent optionals', () => {
  const document = buildManifest({
    id: '/',
    name: 'N',
    shortName: 'S',
    startUrl: '/',
    scope: '/',
    display: 'standalone',
    backgroundColor: '#000',
    themeColor: '#fff',
    icons: [{ src: '/i.png', sizes: '192x192', type: 'image/png' }],
  })
  assert.deepEqual(Object.keys(document), [
    'id',
    'name',
    'short_name',
    'start_url',
    'scope',
    'display',
    'background_color',
    'theme_color',
    'icons',
  ])
})

test('every advertised icon exists in assets/ with a non-trivial size', async () => {
  for (const icon of SHIPPED_ICONS) {
    const body = await readFile(join(root, 'assets', icon.file))
    assert.ok(body.byteLength > 1024, `${icon.file} looks like a placeholder`)
    // PNG magic: the manifest claims image/png and browsers reject otherwise.
    assert.deepEqual([...body.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], `${icon.file} is not a PNG`)
  }
})

test('service worker parses and never touches the network for non-GET', async () => {
  const source = await readFile(join(root, 'src', 'pwa', 'service-worker.js'), 'utf8')
  // It must be a classic script (no module syntax) served at the app root.
  assert.ok(!/^\s*(?:import|export)\s/m.test(source), 'service worker must stay a classic script')
  assert.match(source, /addEventListener\('fetch'/)
  assert.match(source, /request\.method !== 'GET'/)
})

test('the worker never caches a navigation or the login gate', async () => {
  const source = await readFile(join(root, 'src', 'pwa', 'service-worker.js'), 'utf8')
  // THE bug this guards: caching "/" makes an installed app replay a stale
  // session behind an authenticating proxy, which users experience as having to
  // log in on every launch.
  assert.match(
    source,
    /request\.mode === 'navigate'\)\s*return/,
    'navigations must fall through to the network untouched',
  )
  assert.match(source, /AUTH_PREFIX/, 'the login gate must be excluded')
  assert.match(source, /_dsh_reverse_proxy\//, 'the gate prefix must name the real path')

  // And no code path may put a document into the cache.
  assert.ok(
    !/caches\.open\(CACHE\)[\s\S]{0,200}?\.put\(\s*new Request\(\s*(?:SHELL_URL|'\/')/.test(source),
    'the root document must never be written to the cache',
  )
})

test('the worker purges legacy shell-caching buckets on activate', async () => {
  const source = await readFile(join(root, 'src', 'pwa', 'service-worker.js'), 'utf8')
  // An install from the previous build keeps its poisoned bucket until this
  // runs, so the cleanup is part of the fix, not an optimization.
  assert.match(source, /caches\.keys\(\)/)
  assert.match(source, /startsWith\(CACHE_PREFIX\)/)
  assert.match(source, /caches\.delete\(name\)/)
})
