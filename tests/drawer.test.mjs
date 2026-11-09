/**
 * Drawer state machine tests.
 *
 * The controller's only DOM surface is three attribute writes on
 * `document.documentElement`, so a two-method stub is enough to assert the full
 * behaviour: idempotent transitions, exactly-once notification, scroll-lock
 * release, listener isolation, and teardown hygiene.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { loadModule } from './load-module.mjs'

/** Minimal document stand-in that records attribute writes. */
function stubDocument() {
  const attributes = new Map()
  return {
    attributes,
    documentElement: {
      setAttribute: (name, value) => attributes.set(name, value),
      removeAttribute: (name) => attributes.delete(name),
      getAttribute: (name) => attributes.get(name) ?? null,
    },
  }
}

test('drawer publishes open/closed attributes and unlocks on close', async () => {
  const { DrawerController, DRAWER_ATTRIBUTE, DRAWER_LOCK_ATTRIBUTE } = await loadModule('drawer')
  const doc = stubDocument()

  // The controller reads `document` lazily, so installing the stub before the
  // first transition is enough.
  globalThis.document = doc

  const drawer = new DrawerController()
  const seen = []
  drawer.subscribe((change) => seen.push(change))

  assert.equal(drawer.isOpen, false)

  assert.equal(drawer.openDrawer('button'), true)
  assert.equal(drawer.isOpen, true)
  assert.equal(doc.attributes.get(DRAWER_ATTRIBUTE), 'open')
  assert.ok(doc.attributes.has(DRAWER_LOCK_ATTRIBUTE), 'open must lock the body')

  // Idempotence: a second open is a no-op AND notifies nobody.
  assert.equal(drawer.openDrawer('button'), false)
  assert.equal(seen.length, 1)

  assert.equal(drawer.closeDrawer('backdrop'), true)
  assert.equal(doc.attributes.get(DRAWER_ATTRIBUTE), 'closed')
  assert.ok(!doc.attributes.has(DRAWER_LOCK_ATTRIBUTE), 'close must release the lock')
  assert.deepEqual(seen, [
    { open: true, cause: 'button' },
    { open: false, cause: 'backdrop' },
  ])

  delete globalThis.document
})

test('a throwing listener cannot break the state machine', async () => {
  const { DrawerController } = await loadModule('drawer')
  globalThis.document = stubDocument()

  const drawer = new DrawerController()
  const reached = []
  drawer.subscribe(() => {
    throw new Error('listener exploded')
  })
  drawer.subscribe((change) => reached.push(change.open))

  assert.equal(drawer.openDrawer('gesture'), true)
  assert.equal(drawer.isOpen, true)
  assert.deepEqual(reached, [true], 'a sibling listener must still run')

  delete globalThis.document
})

test('dispose clears the published state and every attribute', async () => {
  const { DrawerController, DRAWER_ATTRIBUTE, DRAWER_LOCK_ATTRIBUTE } = await loadModule('drawer')
  const doc = stubDocument()
  globalThis.document = doc

  const drawer = new DrawerController()
  drawer.openDrawer('button')
  drawer.dispose()

  assert.equal(drawer.isOpen, false)
  assert.equal(doc.attributes.has(DRAWER_ATTRIBUTE), false)
  assert.equal(doc.attributes.has(DRAWER_LOCK_ATTRIBUTE), false)

  delete globalThis.document
})

test('toggle flips between the two states', async () => {
  const { DrawerController } = await loadModule('drawer')
  globalThis.document = stubDocument()
  const drawer = new DrawerController()

  drawer.toggle('button')
  assert.equal(drawer.isOpen, true)
  drawer.toggle('button')
  assert.equal(drawer.isOpen, false)

  delete globalThis.document
})

test('the narrow predicate requires BOTH a narrow width and a coarse pointer', async () => {
  const { NARROW_TOUCH_QUERY } = await loadModule('drawer')
  // This exact string is the fence around every style rule and every listener.
  // A pure width query would leak the drawer into mouse-driven windows.
  assert.equal(NARROW_TOUCH_QUERY, '(max-width: 1023px) and (pointer: coarse)')
})
