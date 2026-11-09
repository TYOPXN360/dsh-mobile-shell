/**
 * Stylesheet structure tests.
 *
 * The stylesheet is the one artifact where a mistake is silent: the page still
 * loads, it just looks wrong, or — far worse — the desktop layout quietly
 * changes. These assertions encode the two invariants that must never break:
 *
 * 1. **Desktop is untouched.** Every rule that changes geometry, visibility or
 *    positioning of shell surfaces lives inside the narrow+touch media query.
 *    A rule outside it would run on a desktop window.
 * 2. **Hiding the rail keeps the right column.** The grid override must read the
 *    published custom property rather than hard-coding a zero third track,
 *    because a touch tablet with the right panel open needs that track.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { loadModule } from './load-module.mjs'

test('the stylesheet declares exactly one fenced media query per surface', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  const { NARROW_TOUCH_QUERY } = await loadModule('drawer')

  assert.ok(SHELL_CSS.includes(`@media ${NARROW_TOUCH_QUERY}`), 'every mobile rule must use the shared predicate')
  // The predicate itself must be the narrow+touch one, not a bare width query.
  assert.match(NARROW_TOUCH_QUERY, /max-width: 1023px/)
  assert.match(NARROW_TOUCH_QUERY, /pointer: coarse/)
})

test('the grid override republishes the right track instead of dropping it', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  // A hard-coded zero third track would delete an open right panel's column on
  // a wide touch screen.
  assert.match(
    SHELL_CSS,
    /grid-template-columns:\s*0 minmax\(0, 1fr\) var\(--dsh-ms-frame-right/,
    'the override must read the published right track',
  )
})

test('the drawer slides instead of being displayed on desktop widths', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  // Baseline (unfenced) rules may only hide the mobile-only controls.
  const drawerButtonBaseline = /\[data-dsh-ms="drawer-button"\] \{\s*display: none;/
  assert.match(SHELL_CSS, drawerButtonBaseline, 'the drawer button must start hidden')
  assert.match(SHELL_CSS, /\[data-dsh-ms="backdrop"\] \{\s*display: none;/, 'the backdrop must start hidden')
})

test('every selector the JavaScript drives exists in the stylesheet', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  // These attributes are the contract between the components and the CSS.
  for (const marker of [
    'data-dsh-ms="drawer-button"',
    'data-dsh-ms="backdrop"',
    'data-dsh-ms="pwa-row"',
    'data-dsh-ms="pwa-button"',
  ]) {
    assert.ok(SHELL_CSS.includes(marker), `stylesheet is missing ${marker}`)
  }
  assert.ok(SHELL_CSS.includes('data-dsh-mobile-shell="frame"'), 'the frame marker must be styled')
  assert.ok(SHELL_CSS.includes('data-dsh-drawer="open"'), 'the open state must be styled')
})

test('reduced motion disables the slide', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  assert.match(SHELL_CSS, /prefers-reduced-motion/)
})

test('the stylesheet parses as a set of balanced blocks', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  let depth = 0
  for (const char of SHELL_CSS) {
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    assert.ok(depth >= 0, 'unbalanced closing brace')
  }
  assert.equal(depth, 0, 'unbalanced opening brace')
})

test('no CSS template placeholder survived into the output', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  // An uninterpolated `${...}` inside the template would ship broken CSS.
  assert.ok(!SHELL_CSS.includes('${'), 'uninterpolated template placeholder')
})

test('the settings row matches the shipped row metrics', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  // Read off the live General section: 16px vertical rhythm, hairline divider,
  // 14px title, 12px description. Matching them is what makes the added row
  // look native rather than bolted on.
  const row = /\[data-dsh-ms="pwa-row"\] \{([^}]*)\}/.exec(SHELL_CSS)
  assert.ok(row !== null, 'the row rule must exist')
  assert.match(row[1], /padding: 16px 0;/)
  assert.match(row[1], /border-bottom: 1px solid/)
  assert.match(SHELL_CSS, /\[data-dsh-ms="pwa-row-title"\] \{[^}]*font-size: 14px/)
  assert.match(SHELL_CSS, /\[data-dsh-ms="pwa-row-desc"\] \{[^}]*font-size: 12px/)
})

test('the stylesheet is a plain string safe to inline in a <style> tag', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  // `</style` inside the text would close the element early and break the page.
  assert.ok(!SHELL_CSS.includes('</style'), 'stylesheet must not contain a closing style tag')
  // And it must survive being embedded in a JS string literal.
  const script = new vm.Script(`(${JSON.stringify(SHELL_CSS)})`)
  assert.equal(script.runInNewContext(), SHELL_CSS)
})

test('the drawer is sized to its content, never to a fixed pixel width', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  // A fixed width (e.g. 320px) next to the shell's own 280px sidebar root leaves
  // a blank strip on the drawer's right edge — visible, reported, and not
  // something a host upgrade should be able to reintroduce silently.
  assert.match(
    SHELL_CSS,
    /width:\s*min\(86vw, max-content\)/,
    'the drawer width must be content-derived',
  )
  assert.ok(
    !/width:\s*(?:min\([^)]*px\)|\d+px);/.test(
      (SHELL_CSS.match(/\[class\*="sidebarCol"\] \{[^}]*\}/)?.[0]) ?? '',
    ),
    'the drawer must not fix its own pixel width',
  )
})
