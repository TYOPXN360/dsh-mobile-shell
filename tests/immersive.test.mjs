/**
 * Immersive PWA document tests.
 *
 * The status bar itself belongs to Android/iOS, so the contract this plugin can
 * actually enforce is the document metadata around it: viewport-fit=cover, a
 * transparent theme colour in the installed app, the iOS translucent style, and
 * the `<html>` flag the safe-area CSS keys on. These tests pin all four,
 * including the teardown path (a plugin reload must not leave a host meta
 * permanently rewritten).
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { loadModule } from './load-module.mjs'

/** Build a tiny DOM with the one head query the module uses. */
function fakeDocument() {
  const head = {
    children: [],
    querySelector(selector) {
      const match = /^meta\[name="([^"]+)"\]$/.exec(selector)
      if (match === null) return null
      return head.children.find(
        (element) => element.tagName === 'META' && element.getAttribute('name') === match[1],
      ) ?? null
    },
    appendChild(element) {
      head.children.push(element)
      return element
    },
  }

  const documentElement = {
    attributes: new Map(),
    setAttribute(name, value) {
      this.attributes.set(name, value)
    },
    removeAttribute(name) {
      this.attributes.delete(name)
    },
    hasAttribute(name) {
      return this.attributes.has(name)
    },
  }

  return {
    head,
    documentElement,
    createElement(tagName) {
      return {
        tagName: tagName.toUpperCase(),
        attributes: new Map(),
        setAttribute(name, value) {
          this.attributes.set(name, value)
        },
        getAttribute(name) {
          return this.attributes.get(name) ?? null
        },
        removeAttribute(name) {
          this.attributes.delete(name)
        },
        remove() {
          const index = head.children.indexOf(this)
          if (index >= 0) head.children.splice(index, 1)
        },
      }
    },
  }
}

/** Build a window whose display mode is fixed for the test. */
function fakeWindow({ standalone = false } = {}) {
  const listeners = new Map()
  return {
    navigator: { standalone },
    matchMedia(query) {
      return {
        matches: standalone && query === '(display-mode: standalone)',
        addEventListener() {},
        removeEventListener() {},
      }
    },
    addEventListener(type, listener) {
      const list = listeners.get(type) ?? []
      list.push(listener)
      listeners.set(type, list)
    },
    removeEventListener(type, listener) {
      const list = listeners.get(type) ?? []
      const index = list.indexOf(listener)
      if (index >= 0) list.splice(index, 1)
    },
  }
}

/** Read one meta by name from the fake head. */
function meta(doc, name) {
  return doc.head.querySelector(`meta[name="${name}"]`)
}

test('viewportWithCover keeps the host directives and replaces a stale fit', async () => {
  const { viewportWithCover } = await loadModule('immersive')

  assert.equal(
    viewportWithCover('width=device-width, initial-scale=1'),
    'width=device-width, initial-scale=1, viewport-fit=cover',
  )
  assert.equal(
    viewportWithCover('width=device-width, viewport-fit=auto, initial-scale=1'),
    'width=device-width, initial-scale=1, viewport-fit=cover',
    'a second viewport-fit would let the stale value win',
  )
  assert.equal(
    viewportWithCover('width=device-width, viewport-fit=cover'),
    'width=device-width, viewport-fit=cover',
    'an already-correct declaration must stay byte-identical',
  )
  assert.equal(viewportWithCover(''), 'viewport-fit=cover')
})

test('an installed app gets the transparent chrome and the standalone flag', async () => {
  const {
    installImmersive,
    STANDALONE_ATTRIBUTE,
    IMMERSIVE_THEME_COLOR,
    APPLE_STATUS_BAR_STYLE,
  } = await loadModule('immersive')
  const doc = fakeDocument()
  const controller = installImmersive(doc, fakeWindow({ standalone: true }))

  assert.match(meta(doc, 'viewport').getAttribute('content'), /viewport-fit=cover/)
  assert.equal(meta(doc, 'theme-color').getAttribute('content'), IMMERSIVE_THEME_COLOR)
  assert.equal(
    meta(doc, 'apple-mobile-web-app-status-bar-style').getAttribute('content'),
    APPLE_STATUS_BAR_STYLE,
  )
  assert.equal(meta(doc, 'apple-mobile-web-app-capable').getAttribute('content'), 'yes')
  assert.ok(
    doc.documentElement.hasAttribute(STANDALONE_ATTRIBUTE),
    'the stylesheet needs the standalone flag to apply safe-area padding',
  )

  controller.dispose()
  assert.equal(meta(doc, 'viewport'), null)
  assert.equal(meta(doc, 'theme-color'), null)
  assert.equal(meta(doc, 'apple-mobile-web-app-status-bar-style'), null)
  assert.ok(!doc.documentElement.hasAttribute(STANDALONE_ATTRIBUTE))
})

test('a browser tab keeps a dark toolbar and never gets the safe-area flag', async () => {
  const { installImmersive, BROWSER_THEME_COLOR, STANDALONE_ATTRIBUTE } = await loadModule('immersive')
  const doc = fakeDocument()
  const controller = installImmersive(doc, fakeWindow())

  assert.equal(meta(doc, 'theme-color').getAttribute('content'), BROWSER_THEME_COLOR)
  assert.ok(!doc.documentElement.hasAttribute(STANDALONE_ATTRIBUTE))

  controller.dispose()
})

test('teardown restores host metadata instead of deleting it', async () => {
  const { installImmersive, STANDALONE_ATTRIBUTE } = await loadModule('immersive')
  const doc = fakeDocument()

  const viewport = doc.createElement('meta')
  viewport.setAttribute('name', 'viewport')
  viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=auto')
  doc.head.appendChild(viewport)

  const theme = doc.createElement('meta')
  theme.setAttribute('name', 'theme-color')
  theme.setAttribute('content', '#abcdef')
  doc.head.appendChild(theme)

  const controller = installImmersive(doc, fakeWindow({ standalone: true }))
  assert.equal(
    viewport.getAttribute('content'),
    'width=device-width, initial-scale=1, viewport-fit=cover',
  )
  assert.equal(theme.getAttribute('content'), 'transparent')

  controller.dispose()
  assert.equal(
    viewport.getAttribute('content'),
    'width=device-width, initial-scale=1, viewport-fit=auto',
  )
  assert.equal(theme.getAttribute('content'), '#abcdef')
  assert.equal(meta(doc, 'theme-color'), theme, 'the host element must survive')
  assert.ok(!doc.documentElement.hasAttribute(STANDALONE_ATTRIBUTE))
})
