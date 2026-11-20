/**
 * Smooth-scroll preference and motion-math tests.
 *
 * The DOM engine needs a browser, but its two decisions are pure and are the
 * ones that silently misbehave when wrong:
 *
 * 1. which observed growth comes from a newly inserted block (and therefore
 *    deserves a visual lag), versus a soft wrap, a reader's own scroll, or a
 *    navigation jump;
 * 2. how fast that lag is released.
 *
 * Preference persistence is asserted too: the switch must survive reloads and
 * must never throw in private mode or under a denied storage policy.
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

test('the feature is on by default and only an explicit off disables it', async () => {
  const { SMOOTH_SCROLL_STORAGE_KEY, readSmoothScrollPreference } = await loadModule('smooth-scroll')

  assert.equal(readSmoothScrollPreference(null), true)
  assert.equal(readSmoothScrollPreference(memoryStorage()), true)
  assert.equal(readSmoothScrollPreference(memoryStorage({ [SMOOTH_SCROLL_STORAGE_KEY]: 'off' })), false)
  assert.equal(readSmoothScrollPreference(memoryStorage({ [SMOOTH_SCROLL_STORAGE_KEY]: 'on' })), true)
})

test('the controller persists, notifies once per change, and unsubscribes', async () => {
  const {
    SmoothScrollController, SMOOTH_SCROLL_STORAGE_KEY,
  } = await loadModule('smooth-scroll')
  const storage = memoryStorage()
  const controller = new SmoothScrollController(storage)

  assert.deepEqual(controller.snapshot(), { enabled: true })

  const seen = []
  const unsubscribe = controller.subscribe(snapshot => seen.push(snapshot.enabled))

  controller.setEnabled(false)
  assert.deepEqual(controller.snapshot(), { enabled: false })
  assert.equal(storage.values.get(SMOOTH_SCROLL_STORAGE_KEY), 'off')
  assert.deepEqual(seen, [false])

  // A redundant write must not notify (the switch has nothing to re-render).
  controller.setEnabled(false)
  assert.deepEqual(seen, [false])

  unsubscribe()
  controller.setEnabled(true)
  assert.equal(storage.values.get(SMOOTH_SCROLL_STORAGE_KEY), 'on')
  assert.deepEqual(seen, [false], 'unsubscribed listeners must not fire')

  controller.dispose()
})

test('denied storage falls back to the default and never throws', async () => {
  const {
    SmoothScrollController, readSmoothScrollPreference, writeSmoothScrollPreference,
  } = await loadModule('smooth-scroll')
  const denied = {
    getItem() { throw new Error('denied') },
    setItem() { throw new Error('denied') },
  }

  assert.equal(readSmoothScrollPreference(denied), true)
  assert.doesNotThrow(() => writeSmoothScrollPreference(denied, false))
  assert.doesNotThrow(() => new SmoothScrollController(denied).setEnabled(false))
})

test('only followed, bounded growth from a fresh block enters the pending pool', async () => {
  const { growthStep, BLOCK_ADD_WINDOW_MS } = await loadModule('smooth-scroll')

  assert.equal(growthStep(24, true), 24, 'a streamed line while following')
  assert.equal(growthStep(24, true, 0), 24, 'a just-inserted block')
  assert.equal(growthStep(24, true, BLOCK_ADD_WINDOW_MS), 24, 'the window boundary')
  assert.equal(growthStep(24, true, BLOCK_ADD_WINDOW_MS + 1), 0, 'a soft wrap advances instantly')
  assert.equal(growthStep(24, true, 0, true), 0, 'the block already used its one glide')
  assert.equal(growthStep(0.2, true), 0, 'rounding is not a line')
  assert.equal(growthStep(-8, true), 0, 'shrinking content is not a new line')
  assert.equal(growthStep(500, true), 0, 'session/navigation jumps stay instant')
  assert.equal(growthStep(24, false), 0, 'growth does not pull a reader who scrolled away')
})

test('scroll movement consumes pending growth without double counting', async () => {
  const { growthCompensation } = await loadModule('smooth-scroll')

  assert.equal(growthCompensation(24, 24, true), 24, 'the host followed in the same commit')
  assert.equal(growthCompensation(24, 40, true), 24, 'a later frame consumes only what moved')
  assert.equal(growthCompensation(12, 40, true), 12, 'never outrun the scrollport movement')
  assert.equal(growthCompensation(24, 0, true), 0, 'movement without recorded growth is a reader scroll')
  assert.equal(growthCompensation(24, 24, false), 0, 'a reader who scrolled away keeps their place')
  assert.equal(growthCompensation(0, 24, true), 0, 'no movement means the viewport did not follow')
  assert.equal(growthCompensation(500, 500, true), 0, 'navigation jumps stay instant')
  assert.equal(growthCompensation(0.2, 24, true), 0, 'rounding is not a line')
})

test('the visual lag halves every half-life and settles to zero', async () => {
  const { decayOffset, SMOOTH_SCROLL_HALF_LIFE_MS: halfLife } = await loadModule('smooth-scroll')

  assert.ok(Math.abs(decayOffset(100, halfLife) - 50) < 1e-9)
  assert.ok(Math.abs(decayOffset(100, halfLife * 2) - 25) < 1e-9)

  let offset = 120
  let frames = 0
  while (offset > 0 && frames < 100) {
    const next = decayOffset(offset, 16)
    assert.ok(next < offset, 'the offset must decrease monotonically')
    offset = next
    frames += 1
  }
  assert.equal(offset, 0, 'the loop must terminate')
  assert.ok(frames >= 8 && frames <= 30, `expected a ~250-400ms fade, got ${frames} frames`)

  assert.equal(decayOffset(0, 16), 0)
  assert.equal(decayOffset(0.2, 16), 0, 'sub-pixel lag is cleared')
})
