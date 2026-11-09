/**
 * Swipe gesture tests.
 *
 * The gesture is the part most likely to misfire on a real phone, so each
 * acceptance and each rejection rule is asserted directly. The harness is a
 * hand-rolled event emitter that mimics the three things the listener touches:
 * `document.addEventListener`, the event objects, and a couple of layout
 * globals. No browser is involved, which keeps these tests fast and exact.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { loadModule } from './load-module.mjs'

/**
 * Install a fake document that records listeners and dispatches by hand.
 * @returns the emitter plus a dispatch helper.
 */
function stubEnvironment({ width = 390 } = {}) {
  const listeners = new Map()
  const document = {
    documentElement: { matches: () => false },
    addEventListener: (type, handler) => {
      if (!listeners.has(type)) listeners.set(type, [])
      listeners.get(type).push(handler)
    },
    removeEventListener: (type, handler) => {
      const list = listeners.get(type)
      if (!list) return
      const at = list.indexOf(handler)
      if (at !== -1) list.splice(at, 1)
    },
    dispatch: (type, event) => {
      for (const handler of listeners.get(type) ?? []) handler(event)
    },
    /** Number of live listeners, for teardown assertions. */
    count: () => [...listeners.values()].reduce((total, list) => total + list.length, 0),
  }

  globalThis.document = document
  globalThis.window = { innerWidth: width }
  globalThis.getComputedStyle = () => ({ overflowX: 'visible' })
  // The handler narrows event.target with `instanceof Element`; a one-class stub
  // is enough and keeps the tests free of a DOM implementation.
  globalThis.Element = class Element {}

  return { document, width }
}

/** Build one pointer event with the fields the handler reads. */
function pointer(type, { x, y, pointerId = 1, primary = true, pointerType = 'touch', target = null } = {}) {
  return {
    type,
    clientX: x,
    clientY: y,
    pointerId,
    isPrimary: primary,
    pointerType,
    timeStamp: Date.now(),
    target,
    preventDefault: () => {},
    stopPropagation: () => {},
  }
}

/** Build a target stand-in that is an Element (the handler narrows on it). */
function elementTarget(closest) {
  const target = new (globalThis.Element ?? class {})()
  target.closest = closest
  target.matches = () => false
  target.parentElement = null
  return target
}

/** A target element stand-in that reports no matching ancestors. */
const plainTarget = () => elementTarget(() => null)

/** A target inside an interactive control. */
const buttonTarget = () => elementTarget((selector) => (selector.includes('button') ? { tagName: 'BUTTON' } : null))

test('a rightward swipe in the left zone opens the drawer', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment({ width: 390 })
  const seen = []
  const dispose = installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => false,
    isActive: () => true,
  })

  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 40, y: 400, target: plainTarget() }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 90, y: 402 }))

  assert.deepEqual(seen, ['open'], '44px+ horizontal travel must open')
  dispose()
  assert.equal(env.document.count(), 0, 'dispose must remove every listener')
})

test('a vertical scroll never opens the drawer', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment()
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => false,
    isActive: () => true,
  })

  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 40, y: 400, target: plainTarget() }))
  // Travelling mostly downward, with a small horizontal wobble.
  env.document.dispatch('pointermove', pointer('pointermove', { x: 48, y: 520 }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 60, y: 700 }))

  assert.deepEqual(seen, [], 'a mostly-vertical stroke must stay a scroll')
})

test('a diagonal stroke that is not clearly horizontal stays rejected', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment()
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => false,
    isActive: () => true,
  })

  // 1:1 diagonal: below the 1.4 axis ratio, so the axis is never claimed.
  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 40, y: 400, target: plainTarget() }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 140, y: 500 }))
  assert.deepEqual(seen, [])
})

test('a rightward swipe from the middle of the page opens the drawer', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  // The requirement is a GLOBAL swipe, so a stroke starting mid-page counts.
  const env = stubEnvironment({ width: 390 })
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => false,
    isActive: () => true,
  })

  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 200, y: 400, target: plainTarget() }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 300, y: 402 }))
  assert.deepEqual(seen, ['open'], 'global swipe: position is not a gate')
})

test('a narrowed start zone is still honoured when a caller sets one', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment({ width: 390 })
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => false,
    isActive: () => true,
    tuning: { startZoneRatio: 0.45 },
  })

  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 300, y: 400, target: plainTarget() }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 380, y: 402 }))
  assert.deepEqual(seen, [], 'an explicit narrow zone excludes the right half')
})

test('a stroke starting on an interactive control is ignored', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment()
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => false,
    isActive: () => true,
  })

  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 40, y: 400, target: buttonTarget() }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 200, y: 402 }))
  assert.deepEqual(seen, [], 'a sloppy drag on a button must not navigate')
})

test('a mouse drag is ignored even when narrow', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment()
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => false,
    isActive: () => true,
  })

  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 40, y: 400, pointerType: 'mouse', target: plainTarget() }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 300, y: 400, pointerType: 'mouse' }))
  assert.deepEqual(seen, [], 'mouse-driven windows keep the desktop layout')
})

test('a secondary finger does not start a stroke', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment()
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => false,
    isActive: () => true,
  })

  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 40, y: 400, primary: false, target: plainTarget() }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 300, y: 402, primary: false }))
  assert.deepEqual(seen, [], 'multi-touch is a pinch, not navigation')
})

test('an inactive predicate disarms the gesture entirely', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment()
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => false,
    // Desktop / wide viewport.
    isActive: () => false,
  })

  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 40, y: 400, target: plainTarget() }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 300, y: 402 }))
  assert.deepEqual(seen, [])
})

test('a leftward stroke closes an open drawer', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment()
  const seen = []
  let open = true
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => {
      seen.push('close')
      open = false
    },
    isOpen: () => open,
    isActive: () => true,
  })

  const drawerSurface = elementTarget((selector) => (selector === '[data-dsh-drawer-surface]' ? { id: 'drawer' } : null))
  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 300, y: 400, target: drawerSurface }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 200, y: 402 }))
  assert.deepEqual(seen, ['close'])
})

test('the close direction can be turned off', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment()
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => true,
    isActive: () => true,
    closeOnLeftSwipe: false,
  })

  const drawerSurface = elementTarget((selector) => (selector === '[data-dsh-drawer-surface]' ? { id: 'drawer' } : null))
  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 300, y: 400, target: drawerSurface }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 100, y: 402 }))
  assert.deepEqual(seen, [], 'close must stay opt-in')
})

test('a stroke starting inside the open drawer does not re-open it', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment()
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => true,
    isActive: () => true,
  })

  const drawerSurface = elementTarget((selector) => (selector === '[data-dsh-drawer-surface]' ? { id: 'drawer' } : null))
  // Rightward inside the drawer: not an opener, not a closer.
  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 100, y: 400, target: drawerSurface }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 300, y: 402 }))
  assert.deepEqual(seen, [])
})

test('the synthesized click after a claimed stroke is swallowed', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment()
  let prevented = false
  installSwipeGesture({
    onOpen: () => {},
    onClose: () => {},
    isOpen: () => false,
    isActive: () => true,
  })

  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 40, y: 400, target: plainTarget() }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 120, y: 402 }))

  env.document.dispatch('click', {
    preventDefault: () => {
      prevented = true
    },
    stopPropagation: () => {},
  })
  assert.ok(prevented, 'the trailing click would otherwise activate whatever sat under the finger')
})

test('a stroke starting inside horizontally scrollable content is ignored', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment()
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => false,
    isActive: () => true,
  })

  // A <pre> code block: horizontal overflow belongs to the content.
  const codeBlock = elementTarget((selector) => (selector.includes('pre') ? { tagName: 'PRE' } : null))
  codeBlock.matches = (selector) => selector.includes('pre')
  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 200, y: 400, target: codeBlock }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 320, y: 402 }))
  assert.deepEqual(seen, [], 'a sideways drag on code is a scroll, not navigation')
})

/** Build one touch event carrying a single point. */
function touchEvent(type, { x, y, cancelable = true, touches = 1 } = {}) {
  const point = { clientX: x, clientY: y }
  return {
    type,
    cancelable,
    touches: touches === 1 ? [point] : [point, { clientX: x + 40, clientY: y }],
    preventDefaultCalled: false,
    preventDefault() {
      this.preventDefaultCalled = true
    },
  }
}

test('touchmove prevents the scroll claim once the stroke is horizontal', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment({ width: 390 })
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => false,
    isActive: () => true,
  })

  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 200, y: 400, target: plainTarget() }))

  // Short horizontal move: locks the axis and must be held (preventDefault),
  // which is what keeps the browser from claiming the stroke as a scroll.
  const move = touchEvent('touchmove', { x: 230, y: 402 })
  env.document.dispatch('touchmove', move)
  assert.equal(move.preventDefaultCalled, true, 'a horizontal stroke must suppress scrolling')

  // Traveling far enough commits the open.
  const settle = touchEvent('touchmove', { x: 300, y: 403 })
  env.document.dispatch('touchmove', settle)
  assert.deepEqual(seen, ['open'])
})

test('touchmove never prevents a vertical stroke', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment({ width: 390 })
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => false,
    isActive: () => true,
  })

  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 200, y: 400, target: plainTarget() }))

  const move = touchEvent('touchmove', { x: 205, y: 470 })
  env.document.dispatch('touchmove', move)
  // Preventing here would break ordinary scrolling for the whole gesture.
  assert.equal(move.preventDefaultCalled, false, 'a vertical scroll must stay native')
  assert.deepEqual(seen, [])
})

test('a two-finger stroke is handed back to the browser', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment({ width: 390 })
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => false,
    isActive: () => true,
  })

  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 200, y: 400, target: plainTarget() }))
  const pinch = touchEvent('touchmove', { x: 260, y: 402, touches: 2 })
  env.document.dispatch('touchmove', pinch)
  assert.equal(pinch.preventDefaultCalled, false, 'a pinch must not be prevented')
  assert.deepEqual(seen, [], 'a pinch is not navigation')
})

test('a synthetic-only pointer stream still works (desktop emulation)', async () => {
  const { installSwipeGesture } = await loadModule('swipe')
  const env = stubEnvironment({ width: 390 })
  const seen = []
  installSwipeGesture({
    onOpen: () => seen.push('open'),
    onClose: () => seen.push('close'),
    isOpen: () => true,
    isActive: () => true,
  })

  // The close direction through pointer events alone.
  const drawerSurface = elementTarget((selector) => (selector === '[data-dsh-drawer-surface]' ? { id: 'drawer' } : null))
  env.document.dispatch('pointerdown', pointer('pointerdown', { x: 300, y: 400, target: drawerSurface }))
  env.document.dispatch('pointermove', pointer('pointermove', { x: 200, y: 402 }))
  assert.deepEqual(seen, ['close'])
})

test('decideAxis exposes the lock rules', async () => {
  const { decideAxis } = await loadModule('swipe')
  assert.equal(decideAxis(3, 3, 8, 1.4), 'pending', 'below the lock distance: no decision')
  assert.equal(decideAxis(40, 10, 8, 1.4), 'locked', 'clearly horizontal: swipe')
  assert.equal(decideAxis(10, 40, 8, 1.4), 'abandoned', 'clearly vertical: scroll')
  assert.equal(decideAxis(20, 20, 8, 1.4), 'abandoned', '45 degrees is a scroll, not a swipe')
})
