/**
 * Served-index transform tests.
 *
 * The viewport and Apple tags must already be in the document the phone parses;
 * a DOM mutation after boot is too late for the first layout and for WebKit's
 * status-bar decision. These tests pin the transform's three tags and its
 * idempotence, because the host calls it on every index response.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { injectImmersiveIndex } from '../lib/pwa/index-html.js'

/** The shipped host head, reduced to the tags this transform may touch. */
const HOST_LIKE = '<!doctype html><html><head><meta charset="utf-8" />'
  + '<meta name="viewport" content="width=device-width, initial-scale=1" />'
  + '<link rel="manifest" href="./manifest.webmanifest" /></head><body><div id="root"></div></body></html>'

/** Extract one meta tag's content from a document. */
function contentOf(html, name) {
  const tag = new RegExp(`<meta\\b[^>]*name=["']${name}["'][^>]*>`, 'i').exec(html)
  assert.ok(tag !== null, `missing meta ${name}`)
  const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag[0])
  assert.ok(content !== null, `meta ${name} has no content`)
  return content[1]
}

test('the served index carries viewport-fit=cover and the Apple status bar style', () => {
  const out = injectImmersiveIndex(HOST_LIKE)

  assert.equal(
    contentOf(out, 'viewport'),
    'width=device-width, initial-scale=1, viewport-fit=cover',
  )
  assert.equal(contentOf(out, 'apple-mobile-web-app-status-bar-style'), 'black-translucent')
  assert.equal(contentOf(out, 'apple-mobile-web-app-capable'), 'yes')
  assert.ok(
    out.indexOf('<meta charset') < out.indexOf('apple-mobile-web-app-status-bar-style'),
    'the charset declaration must stay first',
  )
  // Everything else is untouched.
  assert.ok(out.includes('<link rel="manifest" href="./manifest.webmanifest" />'))
  assert.ok(out.includes('<div id="root"></div>'))
})

test('an existing viewport-fit is replaced, not duplicated', () => {
  const out = injectImmersiveIndex(
    '<head><meta name="viewport" content="width=device-width, viewport-fit=auto, initial-scale=1"></head>',
  )

  assert.equal(
    contentOf(out, 'viewport'),
    'width=device-width, initial-scale=1, viewport-fit=cover',
  )
  assert.equal(
    (out.match(/viewport-fit=/g) ?? []).length,
    1,
    'a second viewport-fit would let the stale value win',
  )
})

test('a document without a viewport gets the full baseline', () => {
  const out = injectImmersiveIndex('<html><head><title>x</title></head><body></body></html>')

  assert.equal(
    contentOf(out, 'viewport'),
    'width=device-width, initial-scale=1, viewport-fit=cover',
  )
  assert.equal(contentOf(out, 'apple-mobile-web-app-status-bar-style'), 'black-translucent')
  assert.equal(contentOf(out, 'apple-mobile-web-app-capable'), 'yes')
})

test('other attributes and the Apple meta are preserved/updated in place', () => {
  const out = injectImmersiveIndex(
    '<head><meta id="vp" name="viewport" content="width=device-width" />'
    + '<meta name="apple-mobile-web-app-status-bar-style" content="default" />'
    + '<meta name="apple-mobile-web-app-capable" content="no" /></head>',
  )

  assert.match(out, /<meta id="vp" name="viewport" content="width=device-width, viewport-fit=cover" \/>/)
  assert.equal(contentOf(out, 'apple-mobile-web-app-status-bar-style'), 'black-translucent')
  assert.equal(contentOf(out, 'apple-mobile-web-app-capable'), 'yes')
  assert.equal(
    (out.match(/apple-mobile-web-app-status-bar-style/g) ?? []).length,
    1,
    'an existing Apple meta must not be duplicated',
  )
})

test('the transform is idempotent', () => {
  const once = injectImmersiveIndex(HOST_LIKE)
  const twice = injectImmersiveIndex(once)

  assert.equal(twice, once)
  assert.equal((twice.match(/apple-mobile-web-app-status-bar-style/g) ?? []).length, 1)
})
