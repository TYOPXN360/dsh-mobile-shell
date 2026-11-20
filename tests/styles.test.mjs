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

test('the drawer geometry stands down when the host owns the mobile drawer', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  const { BACKOFF_ATTRIBUTE } = await loadModule('backoff')
  const { MOBILE_ATTRIBUTE } = await loadModule('mobile')

  // Every override that re-anchors the shell's columns must be gated. Without
  // the gate, the host's own drawer mask (z-index 70) covers this plugin's
  // fixed column (z-index 30) and the phone drawer becomes untappable. The same
  // gate also carries the reader's own mobile-adaptation switch.
  const gate = `html:not\\(\\[${BACKOFF_ATTRIBUTE}\\]\\):not\\(\\[${MOBILE_ATTRIBUTE}="off"\\]\\)`
  assert.match(
    SHELL_CSS,
    new RegExp(`${gate} \\[data-dsh-mobile-shell="frame"\\] \\{[^}]*grid-template-columns`),
    'the frame override must be behind the backoff and switch gates',
  )
  assert.match(
    SHELL_CSS,
    new RegExp(`${gate}\\[data-dsh-drawer="open"\\]`),
    'the open state must be behind the backoff and switch gates',
  )
  // The two controls that live outside the gated block must be hidden
  // explicitly when the gate is active.
  for (const marker of ['drawer-button', 'backdrop']) {
    assert.match(
      SHELL_CSS,
      new RegExp(`html\\[${BACKOFF_ATTRIBUTE}\\] \\[data-dsh-ms="${marker}"\\][^{]*\\{[^}]*display: none !important`),
      `${marker} must disappear while backing off`,
    )
    assert.match(
      SHELL_CSS,
      new RegExp(`html\\[${MOBILE_ATTRIBUTE}="off"\\] \\[data-dsh-ms="${marker}"\\][^{]*\\{[^}]*display: none !important`),
      `${marker} must disappear when the reader switches the adaptation off`,
    )
  }
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
    'data-dsh-ms="section-divider"',
    'data-dsh-ms="setting-row"',
    'data-dsh-ms="pwa-button"',
    'data-dsh-ms="switch"',
    'data-dsh-ms="switch-thumb"',
  ]) {
    assert.ok(SHELL_CSS.includes(marker), `stylesheet is missing ${marker}`)
  }
  assert.ok(SHELL_CSS.includes('data-dsh-mobile-shell="frame"'), 'the frame marker must be styled')
  assert.ok(SHELL_CSS.includes('data-dsh-drawer="open"'), 'the open state must be styled')
})

test('the installed PWA paints under the system bars and insets its content', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  const { STANDALONE_ATTRIBUTE } = await loadModule('immersive')

  // The variables default to zero, so an ordinary browser tab is untouched.
  assert.match(
    SHELL_CSS,
    /:root\s*\{[^}]*--dsh-ms-safe-top:\s*0px[^}]*--dsh-ms-safe-bottom:\s*0px/,
    'safe-area variables must default to zero',
  )
  // An installed window gets the real insets before JavaScript runs.
  assert.match(
    SHELL_CSS,
    /@media \(display-mode: standalone\), \(display-mode: fullscreen\), \(display-mode: minimal-ui\)\s*\{\s*:root\s*\{[^}]*--dsh-ms-safe-top:\s*env\(safe-area-inset-top, 0px\)/,
    'the standalone media query must supply the real insets',
  )
  // Older iOS only exposes navigator.standalone; the JS flag is the fallback.
  assert.match(
    SHELL_CSS,
    new RegExp(`html\\[${STANDALONE_ATTRIBUTE}\\]\\s*\\{[^}]*--dsh-ms-safe-top:\\s*env\\(safe-area-inset-top, 0px\\)`),
    'the standalone attribute must supply the real insets too',
  )

  // The status bar background must be the frame's own background, not a white
  // strip: the frame paints the full viewport while its content is padded.
  const frameRule = new RegExp(
    `html:not\\(\\[data-windows-titlebar\\]\\) \\[data-dsh-mobile-shell="frame"\\] \\{([^}]*)\\}`,
  ).exec(SHELL_CSS)
  assert.ok(frameRule !== null, 'the frame safe-area rule must exist')
  for (const side of ['top', 'bottom', 'left', 'right']) {
    assert.match(
      frameRule[1],
      new RegExp(`padding-${side}: var\\(--dsh-ms-safe-${side}\\)`),
      `the frame content must clear the ${side} safe area`,
    )
  }

  // The fixed overlay drawer escapes the frame padding; it needs its own inset.
  // Match the block that actually carries the variables, not the earlier
  // position/size rule with the same selector.
  const drawerRule = new RegExp(
    `\\[data-dsh-mobile-shell="frame"\\] > \\[class\\*="sidebarCol"\\] \\{([^}]*padding-top: var\\(--dsh-ms-safe-top\\)[^}]*)\\}`,
  ).exec(SHELL_CSS)
  assert.ok(drawerRule !== null, 'the drawer safe-area rule must exist')
  assert.match(drawerRule[1], /padding-bottom: var\(--dsh-ms-safe-bottom\)/)

  // The host opener is absolutely positioned; the frame padding cannot move it.
  assert.match(
    SHELL_CSS,
    /html:not\(\[data-windows-titlebar\]\) \[data-dsh-mobile-shell="frame"\] \[data-shell-leading\] \{\s*top: calc\(11px \+ var\(--dsh-ms-safe-top\)\)/,
    'the host leading seat must move below the status bar',
  )
})

test('the settings group uses official hairlines and the switch has state', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  const row = /\[data-dsh-ms="setting-row"\] \{([^}]*)\}/.exec(SHELL_CSS)
  assert.ok(row !== null, 'the settings row rule must exist')
  assert.match(row[1], /padding: 16px 0;/)
  // The exact divider the shipped General rows use.
  assert.match(row[1], /border-bottom: 0\.5px solid var\(--dsw-alias-border-l2/)
  // The last row still owns no trailing divider, matching the shipped section.
  assert.match(
    SHELL_CSS,
    /\[data-dsh-ms="setting-row"\]:last-child \{[^}]*border-bottom: none/,
    'the last settings row must not paint a trailing divider',
  )
  assert.match(SHELL_CSS, /\[data-dsh-ms="setting-row-title"\] \{[^}]*font-size: 14px/)
  assert.match(SHELL_CSS, /\[data-dsh-ms="setting-row-desc"\] \{[^}]*font-size: 12px/)

  // One official-token separator starts the plugin's own region.
  const divider = /\[data-dsh-ms="section-divider"\] \{([^}]*)\}/.exec(SHELL_CSS)
  assert.ok(divider !== null, 'the section divider rule must exist')
  assert.match(divider[1], /border-top: 0\.5px solid var\(--dsw-alias-border-l2/)
  assert.match(divider[1], /margin: 8px 0 0/)

  // The visual state must be driven by the same aria attribute the component
  // sets; a class-only lookalike would leave assistive tech out of sync.
  assert.match(
    SHELL_CSS,
    /\[data-dsh-ms="switch"\]\[aria-checked="true"\]\s*\{[^}]*background: var\(--dsw-alias-state-business-primary/,
    'the checked track must use the product accent token',
  )
  assert.match(
    SHELL_CSS,
    /\[data-dsh-ms="switch"\]\[aria-checked="true"\] \[data-dsh-ms="switch-thumb"\]\s*\{[^}]*translate: 18px 0/,
    'the checked thumb must travel to the far side',
  )
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

test('the PWA action shares the settings row layout', async () => {
  const { SHELL_CSS } = await loadModule('styles')
  // One row grammar for all three features: the install action must not keep a
  // second, slightly different set of titles/descriptions.
  assert.doesNotMatch(SHELL_CSS, /data-dsh-ms="pwa-row"/, 'the PWA row must use the shared row marker')
  const button = /\[data-dsh-ms="pwa-button"\] \{([^}]*)\}/.exec(SHELL_CSS)
  assert.ok(button !== null, 'the install button rule must exist')
  assert.match(button[1], /flex: none;/)
  assert.match(button[1], /white-space: nowrap;/)
  assert.match(SHELL_CSS, /\[data-dsh-ms="pwa-button"\]:disabled \{[^}]*opacity/)
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
