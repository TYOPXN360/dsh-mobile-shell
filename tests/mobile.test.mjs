/**
 * Mobile-adaptation preference tests.
 *
 * The drawer itself needs a browser, but the switch's contract is pure and is
 * what keeps the feature reversible:
 *
 * 1. the default is ON and only an explicit `off` disables it;
 * 2. the choice survives reloads and never throws in private mode;
 * 3. the `<html>` marker goes on when disabled and comes off again, because
 *    that marker is what stands every drawer rule down.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { loadModule } from './load-module.mjs'

/** In-memory localStorage stand-in. */
function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
  }
}

/** The only document surface {@link MobileController} touches. */
function fakeDocument() {
  const attributes = new Map()
  return {
    attributes,
    documentElement: {
      setAttribute: (name, value) => { attributes.set(name, value) },
      removeAttribute: name => { attributes.delete(name) },
    },
  }
}

test('the adaptation is on by default and only an explicit off disables it', async () => {
  const { MOBILE_STORAGE_KEY, readMobilePreference } = await loadModule('mobile')

  assert.equal(readMobilePreference(null), true)
  assert.equal(readMobilePreference(memoryStorage()), true)
  assert.equal(readMobilePreference(memoryStorage({ [MOBILE_STORAGE_KEY]: 'off' })), false)
  assert.equal(readMobilePreference(memoryStorage({ [MOBILE_STORAGE_KEY]: 'on' })), true)
})

test('the controller persists, notifies once per change, and unsubscribes', async () => {
  const { MobileController, MOBILE_STORAGE_KEY } = await loadModule('mobile')
  const storage = memoryStorage()
  const controller = new MobileController(storage)

  assert.deepEqual(controller.snapshot(), { enabled: true })

  const seen = []
  const unsubscribe = controller.subscribe(snapshot => seen.push(snapshot.enabled))

  controller.setEnabled(false)
  assert.deepEqual(controller.snapshot(), { enabled: false })
  assert.equal(storage.values.get(MOBILE_STORAGE_KEY), 'off')
  assert.deepEqual(seen, [false])

  // A redundant write must not notify (the switch has nothing to re-render).
  controller.setEnabled(false)
  assert.deepEqual(seen, [false])

  unsubscribe()
  controller.setEnabled(true)
  assert.equal(storage.values.get(MOBILE_STORAGE_KEY), 'on')
  assert.deepEqual(seen, [false], 'unsubscribed listeners must not fire')

  controller.dispose()
})

test('the html marker follows the switch and is removed on dispose', async () => {
  const { MobileController, MOBILE_ATTRIBUTE } = await loadModule('mobile')
  const doc = fakeDocument()
  const controller = new MobileController(memoryStorage())

  controller.start(doc)
  assert.equal(doc.attributes.has(MOBILE_ATTRIBUTE), false, 'enabled is the default, no marker needed')

  controller.setEnabled(false)
  assert.equal(doc.attributes.get(MOBILE_ATTRIBUTE), 'off')

  controller.setEnabled(true)
  assert.equal(doc.attributes.has(MOBILE_ATTRIBUTE), false)

  controller.setEnabled(false)
  controller.dispose()
  assert.equal(doc.attributes.has(MOBILE_ATTRIBUTE), false, 'dispose must not leave the page disabled')
})

test('a saved off state is published before the drawer is wired', async () => {
  const { MobileController, MOBILE_ATTRIBUTE, MOBILE_STORAGE_KEY } = await loadModule('mobile')
  const doc = fakeDocument()
  const controller = new MobileController(memoryStorage({ [MOBILE_STORAGE_KEY]: 'off' }))

  controller.start(doc)
  assert.equal(doc.attributes.get(MOBILE_ATTRIBUTE), 'off')
  controller.dispose()
})

test('denied storage falls back to the default and never throws', async () => {
  const { MobileController, readMobilePreference, writeMobilePreference } = await loadModule('mobile')
  const denied = {
    getItem() { throw new Error('denied') },
    setItem() { throw new Error('denied') },
  }

  assert.equal(readMobilePreference(denied), true)
  assert.doesNotThrow(() => writeMobilePreference(denied, false))
  assert.doesNotThrow(() => new MobileController(denied).setEnabled(false))
})
