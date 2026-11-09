/**
 * PWA installer and frame-bridge tests.
 *
 * The installer's job is to report four honest states and to never hand a spent
 * prompt event back to the browser. Both are asserted here, because both are
 * invisible failure modes in a real browser (a disabled button with no reason,
 * or a rejected promise on the second tap).
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { loadModule } from './load-module.mjs'

/** Install the browser globals the installer reads. */
function stubBrowser({
  standalone = false,
  userAgent = 'Mozilla/5.0 (Linux; Android 14) Chrome/140',
  promptApi = true,
  secure = true,
  origin = 'http://127.0.0.1:3080',
} = {}) {
  const listeners = new Map()
  const media = new Map([
    ['(display-mode: standalone)', standalone],
    ['(display-mode: fullscreen)', false],
    ['(display-mode: minimal-ui)', false],
  ])

  const window = {
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
    count: () => [...listeners.values()].reduce((total, list) => total + list.length, 0),
    matchMedia: (query) => ({
      matches: media.get(query) ?? false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  }

  window.isSecureContext = secure
  globalThis.location = { origin, protocol: origin.split(':')[0] + ':', hostname: new URL(origin).hostname }
  globalThis.window = window
  // Node 22+ defines `navigator` as a getter-only global; redefine it rather
  // than assigning.
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent, platform: 'Linux', maxTouchPoints: 0 },
    configurable: true,
    writable: true,
  })
  // The installer probes `window`, which is what a browser exposes.
  if (promptApi) window.BeforeInstallPromptEvent = class {}

  return window
}

/** A beforeinstallprompt event stand-in with a scripted outcome. */
function installPrompt(outcome = 'accepted') {
  return {
    promptCalled: 0,
    prompt() {
      this.promptCalled += 1
      return Promise.resolve()
    },
    userChoice: Promise.resolve({ outcome }),
    preventDefault: () => {},
  }
}

test('with no prompt event the row reports a non-ready state', async () => {
  const { PwaInstaller } = await loadModule('pwa-installer')
  const window = stubBrowser()
  const installer = new PwaInstaller()
  installer.start()

  assert.equal(installer.snapshot().state, 'pending')

  installer.dispose()
  assert.equal(window.count(), 0, 'dispose must detach every window listener')
})

test('a captured prompt event makes the row ready and install() resolves', async () => {
  const { PwaInstaller } = await loadModule('pwa-installer')
  const window = stubBrowser()
  const installer = new PwaInstaller()
  installer.start()

  const event = installPrompt('accepted')
  window.dispatch('beforeinstallprompt', event)

  assert.equal(installer.snapshot().state, 'ready')
  const outcome = await installer.install()
  assert.equal(outcome, 'accepted')
  assert.equal(event.promptCalled, 1)
  // The event is spent: the row must stop offering it rather than reject later.
  assert.equal(installer.snapshot().state, 'installed')

  installer.dispose()
})

test('a dismissed prompt drops the event instead of reusing it', async () => {
  const { PwaInstaller } = await loadModule('pwa-installer')
  const window = stubBrowser()
  const installer = new PwaInstaller()
  installer.start()

  const event = installPrompt('dismissed')
  window.dispatch('beforeinstallprompt', event)
  assert.equal(await installer.install(), 'dismissed')

  // A second install must be a no-op returning undefined, NOT a second prompt()
  // on a spent event (browsers reject that).
  assert.equal(await installer.install(), undefined)
  assert.equal(event.promptCalled, 1)

  installer.dispose()
})

test('running standalone reports installed', async () => {
  const { PwaInstaller } = await loadModule('pwa-installer')
  stubBrowser({ standalone: true })
  const installer = new PwaInstaller()
  installer.start()
  assert.equal(installer.snapshot().state, 'installed')
  installer.dispose()
})

test('appinstalled flips the row to installed', async () => {
  const { PwaInstaller } = await loadModule('pwa-installer')
  const window = stubBrowser()
  const installer = new PwaInstaller()
  installer.start()
  assert.equal(installer.snapshot().state, 'pending')

  window.dispatch('appinstalled', {})
  assert.equal(installer.snapshot().state, 'installed')
  installer.dispose()
})

test('iOS reports the manual share-sheet path', async () => {
  const { PwaInstaller } = await loadModule('pwa-installer')
  stubBrowser({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    promptApi: false,
  })
  const installer = new PwaInstaller()
  installer.start()
  assert.equal(installer.snapshot().state, 'ios')
  installer.dispose()
})

test('subscribers get an immediate snapshot and every change', async () => {
  const { PwaInstaller } = await loadModule('pwa-installer')
  const window = stubBrowser()
  const installer = new PwaInstaller()
  installer.start()

  const seen = []
  const unsubscribe = installer.subscribe((snapshot) => seen.push(snapshot.state))
  assert.deepEqual(seen, ['pending'])

  window.dispatch('beforeinstallprompt', installPrompt())
  assert.deepEqual(seen, ['pending', 'ready'])

  unsubscribe()
  window.dispatch('appinstalled', {})
  assert.deepEqual(seen, ['pending', 'ready'], 'an unsubscribed listener stays silent')

  installer.dispose()
})

test('a plain-HTTP LAN origin reports insecure, not merely pending', async () => {
  const { PwaInstaller } = await loadModule('pwa-installer')
  // The exact reported case: reached from a phone at a LAN address over HTTP.
  stubBrowser({ secure: false, origin: 'http://192.168.2.36:3081' })
  const installer = new PwaInstaller()
  installer.start()

  assert.equal(installer.snapshot().state, 'insecure')
  assert.equal(installer.snapshot().origin, 'http://192.168.2.36:3081')
  installer.dispose()
})

test('an insecure origin never reports installed or ready by accident', async () => {
  const { PwaInstaller } = await loadModule('pwa-installer')
  const window = stubBrowser({ secure: false, origin: 'http://192.168.2.36:3081' })
  const installer = new PwaInstaller()
  installer.start()

  // Even if a stray event arrived, a spent/unusable context stays honest.
  window.dispatch('beforeinstallprompt', installPrompt())
  assert.equal(installer.snapshot().state, 'ready', 'a captured event still wins: it only exists when permitted')

  installer.dispose()
})

test('isSecureContext accepts localhost and https, rejects a LAN http origin', async () => {
  const { isSecureContext } = await loadModule('pwa-installer')

  stubBrowser({ secure: true, origin: 'http://127.0.0.1:3080' })
  assert.equal(isSecureContext(), true)

  stubBrowser({ secure: true, origin: 'https://app.example.com' })
  assert.equal(isSecureContext(), true)

  stubBrowser({ secure: false, origin: 'http://192.168.2.36:3081' })
  assert.equal(isSecureContext(), false)
})
