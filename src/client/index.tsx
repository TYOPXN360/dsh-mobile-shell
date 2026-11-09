/**
 * dsh-mobile-shell — browser half.
 *
 * One plugin, two features, one lifecycle:
 *
 * A. **Narrow-screen sidebar drawer.** On a phone-sized touch viewport the
 *    shell's sidebar rail is hidden and the conversation uses the full width.
 *    A control before the session title opens the real sidebar as an overlay;
 *    a rightward swipe on the conversation opens it too; a tap on the
 *    uncovered area closes it. Every rule is fenced by one media query
 *    (`NARROW_TOUCH_QUERY`) so a desktop window — at any width — is untouched.
 *
 * B. **Installable PWA.** The host half serves the manifest, the shipped icons
 *    and a root-scoped service worker; this half links the metadata, registers
 *    the worker at page load, and contributes the "添加为 PWA 应用" row at the
 *    bottom of General settings.
 *
 * The drawer never re-implements the shell's sidebar: it drives the shell's own
 * collapse flag (which mounts the real sidebar subtree) and then overrides only
 * the COLUMN GEOMETRY in CSS so the sidebar covers the conversation instead of
 * shrinking it. That is the whole trick, and it is why a host upgrade that
 * changes the sidebar's internals keeps working.
 */
import type { ClientContext } from './host-types.ts'
import { DrawerButton } from './drawer-button.tsx'
import { DrawerBackdrop } from './drawer-backdrop.tsx'
import { PwaRow } from './pwa-row.tsx'
import { DrawerController, NARROW_TOUCH_QUERY } from './drawer.ts'
import { installFrameBridge } from './frame-bridge.ts'
import { installSwipeGesture } from './swipe.ts'
import { installCockpitRelay } from './cockpit-relay.ts'
import { installPwaBootstrap } from './pwa-bootstrap.ts'
import { PwaInstaller } from './pwa-installer.ts'
import { SHELL_CSS } from './styles.ts'
import { NS, en, zh } from './i18n.ts'

/**
 * Required services. `slots` is the registration surface; `layout` is what
 * actually mounts the shell's sidebar subtree when the drawer opens; `locale`
 * supplies every string. No optional service is listed — a missing one would
 * silently disable half the plugin.
 */
export const inject = ['slots', 'layout', 'locale']

/**
 * Settings row order. Every shipped General item sits at 100 or below, and the
 * section renders ascending, so a value above the ceiling is what puts this row
 * last without depending on which other plugins are installed.
 */
const GENERAL_ROW_ORDER = 1000

/** Install the stylesheet, and keep it last in `<head>` so its overrides win. */
function installStyles(ctx: ClientContext): void {
  ctx.effect(() => {
    // A hot reload replaces the bundle but not the document: clear a stale copy
    // of our own sheet first, or the previous build's rules keep winning.
    for (const stale of document.querySelectorAll('style[data-plugin-css="dsh-mobile-shell/shell.css"]')) {
      stale.remove()
    }
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-mobile-shell'
    tag.dataset.pluginCss = 'dsh-mobile-shell/shell.css'
    tag.textContent = SHELL_CSS
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'dsh-mobile-shell: stylesheet')
}

/**
 * Wire the drawer: state machine, frame bridge, gesture, and the shell flag.
 *
 * The shell's flag and the drawer's own state are kept in sync in ONE
 * direction each, which is what prevents an infinite loop:
 * - drawer changes → drive `ctx.layout.toggleSidebar()` when it disagrees;
 * - shell changes (the shell collapsed on its own, e.g. the viewport crossed
 *   the breakpoint) → close the drawer silently.
 * @param ctx - client root context.
 * @returns the drawer controller.
 */
function installDrawer(ctx: ClientContext): DrawerController {
  const drawer = new DrawerController()
  const narrow = window.matchMedia(NARROW_TOUCH_QUERY)

  ctx.effect(() => {
    /**
     * Push the drawer's state into the shell. The shell's narrow-mode toggle
     * flips its internal expansion flag, which is what mounts the real sidebar
     * subtree; the CSS then re-anchors that subtree as an overlay.
     */
    const syncShell = (): void => {
      const frame = document.querySelector('[data-dsh-mobile-shell="frame"]')
      const shellOpen = frame !== null && !frame.hasAttribute('data-sidebar-collapsed')
      if (drawer.isOpen !== shellOpen) ctx.layout.toggleSidebar()
    }

    const unsubscribe = drawer.subscribe((change) => {
      // Only a user-driven open has to move the shell; a shell-driven collapse
      // arrives here already consistent.
      if (change.cause !== 'reset') syncShell()
    })

    // A viewport that stops matching the predicate (rotation to desktop width,
    // a mouse attached) must not leave a fixed overlay on the page.
    const onQueryChange = (): void => {
      if (!narrow.matches) drawer.closeDrawer('reset')
    }
    narrow.addEventListener('change', onQueryChange)

    const frame = installFrameBridge((collapsed) => {
      // The shell collapsed on its own: reflect it, but do not bounce back.
      if (collapsed && drawer.isOpen) drawer.closeDrawer('reset')
      // The shell expanded on its own (rare): adopt it so the two agree.
      if (!collapsed && !drawer.isOpen && narrow.matches) drawer.openDrawer('reset')
    })

    const removeGesture = installSwipeGesture({
      onOpen: () => drawer.openDrawer('gesture'),
      onClose: () => drawer.closeDrawer('gesture'),
      isOpen: () => drawer.isOpen,
      isActive: () => narrow.matches,
    })

    // Escape closes the drawer, matching every other dismissible layer.
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && drawer.isOpen) {
        event.stopPropagation()
        drawer.closeDrawer('escape')
      }
    }
    document.addEventListener('keydown', onKeyDown, { capture: true })

    return () => {
      narrow.removeEventListener('change', onQueryChange)
      document.removeEventListener('keydown', onKeyDown, { capture: true })
      removeGesture()
      unsubscribe()
      frame.dispose()
      drawer.dispose()
    }
  }, 'dsh-mobile-shell: drawer')

  return drawer
}

/**
 * Move the remote task console into the drawer.
 *
 * On a phone the console's floating launcher is anchored to the frame's
 * top-right corner, where it sits on top of the conversation header. The drawer
 * is the phone's navigation surface, so the console belongs beside 插件 /
 * 自动化任务 / 更多 instead. The relay clicks the SHIPPED launcher, so the other
 * plugin keeps full ownership of its panel; nothing in its code changes.
 * Activating the row closes the drawer: the console panel lives in the frame
 * overlay ABOVE the drawer, so yielding the navigation layer is what reveals the
 * panel the user just asked for.
 * @param ctx - client root context.
 * @param drawer - the drawer controller, closed on activation.
 */
function installCockpit(ctx: ClientContext, drawer: DrawerController): void {
  ctx.effect(() => {
    const relay = installCockpitRelay({
      onActivate: () => drawer.closeDrawer('backdrop'),
    })
    return () => relay.dispose()
  }, 'dsh-mobile-shell: cockpit relay')
}

/**
 * Register the two settings/header seats and start the PWA bootstrap.
 * @param ctx - client root context.
 * @param drawer - the drawer controller the header button drives.
 */
function installSurfaces(ctx: ClientContext, drawer: DrawerController): void {
  // The install controller must exist for as long as the plugin does: the
  // browser's install event arrives at page load, long before Settings opens.
  const installer = new PwaInstaller()
  ctx.effect(() => {
    installer.start()
    return () => installer.dispose()
  }, 'dsh-mobile-shell: pwa installer')

  // Document metadata plus the service worker: page-load work, not panel work.
  ctx.effect(() => {
    const bootstrap = installPwaBootstrap()
    return () => bootstrap.dispose()
  }, 'dsh-mobile-shell: pwa bootstrap')

  // The drawer button, before the session title.
  ctx.slots.inject('conversation.header.leading', () => ctx.slots.register({
    name: 'conversation.header.leading',
    locale: NS,
    inject: () => ({ drawer }),
  }, DrawerButton))

  // The tap-outside surface, inside the shell's frame-wide overlay layer.
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'dsh-mobile-shell-backdrop',
    order: 5,
    inject: () => ({ drawer }),
  }, DrawerBackdrop))

  // The install row, at the bottom of General settings.
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'dsh-mobile-shell-pwa',
    order: GENERAL_ROW_ORDER,
    locale: NS,
    inject: () => ({ installer }),
  }, PwaRow))
}

/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    'dsh-mobile-shell: dictionaries',
  )

  installStyles(ctx)
  const drawer = installDrawer(ctx)
  installCockpit(ctx, drawer)
  installSurfaces(ctx, drawer)
}
