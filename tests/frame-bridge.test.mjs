/**
 * Frame-bridge tests.
 *
 * The bridge does two things the stylesheet depends on: it marks the shell's
 * frame (whose class name is a build hash we cannot select on) and it publishes
 * the frame's right-hand track so the drawer's grid override keeps it. Both are
 * pure transformations plus a mutation observer, so the pure half is asserted
 * exhaustively here and the observer half with a stub.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { loadModule } from './load-module.mjs'

test('splitTracks splits on spaces OUTSIDE track functions only', async () => {
  const { splitTracks } = await loadModule('frame-bridge')
  // The real template: three tracks, two of which contain spaces internally.
  assert.deepEqual(
    splitTracks('56px minmax(0px, 1fr) minmax(0px, 300px)'),
    ['56px', 'minmax(0px, 1fr)', 'minmax(0px, 300px)'],
  )
  // A naive split(' ') would shred every minmax() in the template; a naive
  // split(',') would produce two tracks from the commas inside them.
  assert.deepEqual(splitTracks('  a   b  '), ['a', 'b'])
  assert.deepEqual(splitTracks(''), [])
})

test('rightTrackOf reads the third track of the real frame template', async () => {
  const { rightTrackOf } = await loadModule('frame-bridge')
  // The exact shape AppFrame writes as an inline style.
  assert.equal(rightTrackOf('280px minmax(0px, 1fr) minmax(0px, 512px)'), 'minmax(0px, 512px)')
  assert.equal(rightTrackOf('56px minmax(0px, 1fr) minmax(0px, 0px)'), 'minmax(0px, 0px)')
})

test('rightTrackOf degrades to "no right panel" rather than throwing', async () => {
  const { rightTrackOf } = await loadModule('frame-bridge')
  // A future shell that writes two tracks must not break the override.
  assert.equal(rightTrackOf('0 minmax(0, 1fr)'), 'minmax(0px, 0px)')
  assert.equal(rightTrackOf(''), 'minmax(0px, 0px)')
})

test('rightTrackOf tolerates nested repeat() and stray whitespace', async () => {
  const { rightTrackOf } = await loadModule('frame-bridge')
  assert.equal(rightTrackOf('  repeat(2, minmax(0px, 1fr))   minmax(0px, 1fr)   420px '), '420px')
})

/** Build a fake frame element with the attributes the bridge reads/writes. */
function stubFrame({ collapsed = true, template = '56px minmax(0px, 1fr) minmax(0px, 0px)' } = {}) {
  const attributes = new Map()
  const properties = new Map()
  if (collapsed) attributes.set('data-sidebar-collapsed', '')
  const frame = {
    isConnected: true,
    style: {
      gridTemplateColumns: template,
      getPropertyValue: (name) => properties.get(name) ?? '',
      setProperty: (name, value) => properties.set(name, value),
    },
    hasAttribute: (name) => attributes.has(name),
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
    attributes,
    properties,
  }
  return frame
}

/** Install the globals the bridge touches. */
function stubDocument(frame) {
  globalThis.document = {
    documentElement: {},
    querySelector: (selector) => (selector === '[data-shell-overlay]' ? { parentElement: frame } : null),
  }
  globalThis.MutationObserver = class {
    observe() {}
    disconnect() {}
  }
}

test('installFrameBridge marks the frame and publishes the right track', async () => {
  const { installFrameBridge, FRAME_ATTRIBUTE, FRAME_RIGHT_VAR } = await loadModule('frame-bridge')
  const frame = stubFrame({ template: '280px minmax(0px, 1fr) minmax(0px, 300px)' })
  stubDocument(frame)

  const changes = []
  const bridge = installFrameBridge((collapsed) => changes.push(collapsed))

  assert.equal(frame.attributes.get(FRAME_ATTRIBUTE), 'frame')
  assert.equal(frame.properties.get(FRAME_RIGHT_VAR), 'minmax(0px, 300px)')
  assert.equal(bridge.frame(), frame)
  assert.equal(bridge.shellCollapsed(), true)
  // The initial state is reported once, so the drawer can adopt it.
  assert.deepEqual(changes, [true])

  bridge.dispose()
  assert.equal(frame.attributes.has(FRAME_ATTRIBUTE), false)
})

test('the bridge reports shell-driven collapse changes without looping', async () => {
  const { installFrameBridge, FRAME_ATTRIBUTE } = await loadModule('frame-bridge')
  const frame = stubFrame({ collapsed: true })
  stubDocument(frame)

  const changes = []
  const bridge = installFrameBridge((collapsed) => changes.push(collapsed))
  assert.deepEqual(changes, [true])

  // The shell expanded the sidebar on its own.
  frame.attributes.delete('data-sidebar-collapsed')
  bridge.dispose()

  // A fresh install over the same element must observe the new state.
  const frame2 = stubFrame({ collapsed: false })
  stubDocument(frame2)
  const changes2 = []
  const bridge2 = installFrameBridge((collapsed) => changes2.push(collapsed))
  assert.deepEqual(changes2, [false])
  assert.equal(frame2.attributes.get(FRAME_ATTRIBUTE), 'frame')
  bridge2.dispose()
})

test('dispose leaves no marker behind for the next build to inherit', async () => {
  const { installFrameBridge, FRAME_ATTRIBUTE } = await loadModule('frame-bridge')
  const frame = stubFrame()
  stubDocument(frame)
  const bridge = installFrameBridge(() => {})
  assert.equal(frame.attributes.has(FRAME_ATTRIBUTE), true)
  bridge.dispose()
  assert.equal(frame.attributes.has(FRAME_ATTRIBUTE), false)
  assert.equal(bridge.frame(), null, 'the disposed bridge must not keep handing out a stale node')
})
