/**
 * Top-left backoff tests.
 *
 * The detector is the contract that keeps this plugin from stacking a second
 * panel icon on top of the host's mobile drawer opener (or a third-party shell
 * toggle). It is deliberately DOM-light: four structural probes plus a
 * visibility check. The tests cover each probe, the visibility rule, the
 * priority order, and the document attribute the stylesheet and drawer
 * lifecycle both read.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { loadModule } from './load-module.mjs'

/** A structural element with the two methods the detector touches. */
function fakeElement({ visible = true, own = false } = {}) {
  const element = {
    isConnected: true,
    getClientRects: () => (visible ? [{ width: 28, height: 28 }] : []),
    closest: (selector) => (own && selector === '[data-dsh-ms]' ? element : null),
  }
  return element
}

/** A document-like host backed by a selector → matches map. */
function fakeDocument(matches = {}) {
  const attributes = new Map()
  const documentElement = {
    attributes,
    setAttribute: (name, value) => {
      attributes.set(name, value)
    },
    removeAttribute: (name) => {
      attributes.delete(name)
    },
    getAttribute: (name) => attributes.get(name) ?? null,
  }
  return {
    documentElement,
    querySelector: (selector) => matches[selector]?.[0] ?? null,
    querySelectorAll: (selector) => matches[selector] ?? [],
  }
}

test('the host drawer mode wins over every other signal', async () => {
  const { detectBackoff, NATIVE_DRAWER_SELECTOR } = await loadModule('backoff')
  const doc = fakeDocument({
    [NATIVE_DRAWER_SELECTOR]: [fakeElement()],
  })

  assert.deepEqual(detectBackoff(doc), { active: true, reason: 'native-drawer' })
})

test('a visible host opener yields even without the frame attribute', async () => {
  const { detectBackoff, HOST_LEADING_SELECTOR, HOST_OPENER_SELECTOR } = await loadModule('backoff')
  const doc = fakeDocument({
    [`${HOST_LEADING_SELECTOR} ${HOST_OPENER_SELECTOR}`]: [fakeElement()],
  })

  assert.deepEqual(detectBackoff(doc), { active: true, reason: 'native-drawer' })
})

test('a third-party mobile toggle yields as foreign', async () => {
  const { detectBackoff, FOREIGN_TOGGLE_SELECTOR } = await loadModule('backoff')
  const doc = fakeDocument({
    [FOREIGN_TOGGLE_SELECTOR]: [fakeElement()],
  })

  assert.deepEqual(detectBackoff(doc), { active: true, reason: 'foreign-toggle' })
})

test('any visible control in the host leading seat yields as foreign', async () => {
  const { detectBackoff, HOST_LEADING_CONTROL_SELECTOR } = await loadModule('backoff')
  const doc = fakeDocument({
    [HOST_LEADING_CONTROL_SELECTOR]: [fakeElement()],
  })

  assert.deepEqual(detectBackoff(doc), { active: true, reason: 'foreign-toggle' })
})

test('a hidden competitor does not trigger the backoff', async () => {
  const { detectBackoff, FOREIGN_TOGGLE_SELECTOR } = await loadModule('backoff')
  const doc = fakeDocument({
    [FOREIGN_TOGGLE_SELECTOR]: [fakeElement({ visible: false })],
  })

  assert.deepEqual(detectBackoff(doc), { active: false, reason: null })
})

test('this plugin never mistakes its own button for a competitor', async () => {
  const { detectBackoff, FOREIGN_TOGGLE_SELECTOR } = await loadModule('backoff')
  const doc = fakeDocument({
    [FOREIGN_TOGGLE_SELECTOR]: [fakeElement({ own: true })],
  })

  assert.deepEqual(detectBackoff(doc), { active: false, reason: null })
})

test('an empty page is not backing off', async () => {
  const { detectBackoff } = await loadModule('backoff')
  assert.deepEqual(detectBackoff(fakeDocument()), { active: false, reason: null })
})

test('install publishes the attribute, notifies once, and restores on exit', async () => {
  const {
    installBackoff,
    BACKOFF_ATTRIBUTE,
    NATIVE_DRAWER_SELECTOR,
  } = await loadModule('backoff')
  const matches = {}
  const doc = fakeDocument(matches)
  const controller = installBackoff(doc)

  assert.equal(doc.documentElement.getAttribute(BACKOFF_ATTRIBUTE), null)

  const seen = []
  controller.subscribe((state) => seen.push(state))

  // The host mounts its drawer after the frame's first render.
  matches[NATIVE_DRAWER_SELECTOR] = [fakeElement()]
  controller.sync()

  assert.equal(doc.documentElement.getAttribute(BACKOFF_ATTRIBUTE), 'native-drawer')
  assert.deepEqual(seen, [{ active: true, reason: 'native-drawer' }])

  // A repeated recompute with the same verdict must not spam subscribers.
  controller.sync()
  assert.equal(seen.length, 1)

  // The host leaves drawer mode (rotation to 800px): the plugin re-arms.
  delete matches[NATIVE_DRAWER_SELECTOR]
  controller.sync()

  assert.equal(doc.documentElement.getAttribute(BACKOFF_ATTRIBUTE), null)
  assert.deepEqual(seen.at(-1), { active: false, reason: null })

  controller.dispose()
})

test('dispose removes the attribute and stops notifying', async () => {
  const {
    installBackoff,
    BACKOFF_ATTRIBUTE,
    FOREIGN_TOGGLE_SELECTOR,
  } = await loadModule('backoff')
  const matches = { [FOREIGN_TOGGLE_SELECTOR]: [fakeElement()] }
  const doc = fakeDocument(matches)
  const controller = installBackoff(doc)

  // Initial verdict is written synchronously, before any observer tick.
  assert.equal(doc.documentElement.getAttribute(BACKOFF_ATTRIBUTE), 'foreign-toggle')

  const seen = []
  controller.subscribe((state) => seen.push(state))
  delete matches[FOREIGN_TOGGLE_SELECTOR]
  controller.sync()
  assert.deepEqual(seen, [{ active: false, reason: null }])

  controller.dispose()
  assert.equal(doc.documentElement.getAttribute(BACKOFF_ATTRIBUTE), null)
  controller.sync()
  assert.equal(seen.length, 1, 'a disposed controller must ignore later syncs')
})
