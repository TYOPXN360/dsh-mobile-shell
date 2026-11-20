/**
 * dsh-mobile-shell — browser half.
 *
 * One plugin, one lifecycle, several mobile enhancements:
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
import { MobileRow } from './mobile-row.tsx'
import { PwaRow } from './pwa-row.tsx'
import { SectionDivider } from './section-divider.tsx'
import { SmoothScrollRow } from './smooth-scroll-row.tsx'
import { DrawerController, NARROW_TOUCH_QUERY } from './drawer.ts'
import { MobileController } from './mobile.ts'
import { installBackoff, type BackoffController } from './backoff.ts'
import { installFrameBridge } from './frame-bridge.ts'
import { installSwipeGesture } from './swipe.ts'
import { installCockpitRelay } from './cockpit-relay.ts'
import { installPwaBootstrap } from './pwa-bootstrap.ts'
import { installImmersive } from './immersive.ts'
import { PwaInstaller } from './pwa-installer.ts'
import { SmoothScrollController } from './smooth-scroll.ts'
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
 * section renders ascending, so values above the ceiling place this plugin's
 * rows after the shipped preferences without depending on which other plugins
 * are installed. The divider starts the group; the three feature rows follow.
 */
const SECTION_DIVIDER_ORDER = 998

/** The mobile-adaptation switch. */
const MOBILE_ROW_ORDER = 999

/** The PWA install row; the anchor the other rows are described against. */
const PWA_ROW_ORDER = 1000

/** Directly below the PWA row; the section stacks ascending. */
const SMOOTH_SCROLL_ROW_ORDER = PWA_ROW_ORDER + 1

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
 *
 * The host may also own a narrow-screen drawer of its own (DSH 0.2.2+, below
 * 768px) or a third-party mobile shell may have claimed the top-left control.
 * `backoff` reports that regime, but it only governs the BUTTON and the overlay
 * GEOMETRY: the right-swipe gesture is this plugin's own contribution and the
 * host has none, so it stays armed and drives the host's own sidebar flag.
 * That is what lets a phone keep "swipe right anywhere to open" even while the
 * host supplies the drawer, its mask, and the top-left opener.
 * @param ctx - client root context.
 * @param backoff - the top-left ownership detector.
 * @param mobile - the reader's mobile-adaptation switch.
 * @returns the drawer controller.
 */
function installDrawer(
  ctx: ClientContext,
  backoff: BackoffController,
  mobile: MobileController,
): DrawerController {
  const drawer = new DrawerController()
  const narrow = window.matchMedia(NARROW_TOUCH_QUERY)

  ctx.effect(() => {
    /**
     * Push the drawer's state into the shell. The shell's narrow-mode toggle
     * flips its internal expansion flag, which is what mounts the real sidebar
     * subtree; in the host's native drawer mode the same call opens the host's
     * drawer. This must run even while backing off: a swipe is still allowed
     * to open the host's drawer.
     */
    const syncShell = (): void => {
      // The switch is off: the host's native narrow layout is in charge, so the
      // plugin must not move the shell's sidebar flag at all.
      if (!mobile.snapshot().enabled) return
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
      // Mirroring is part of the adaptation: with the switch off the drawer is
      // dormant, so a host-initiated collapse must not wake it.
      if (!mobile.snapshot().enabled) return
      // Always mirror the host's flag, even while backing off: the user may
      // have opened the host's drawer with its own opener, or closed it with
      // the host's mask. `reset` never drives the shell back, so this cannot
      // loop.
      if (collapsed && drawer.isOpen) drawer.closeDrawer('reset')
      if (!collapsed && !drawer.isOpen) drawer.openDrawer('reset')
    })

    const unsubscribeBackoff = backoff.subscribe((state) => {
      if (state.active) {
        // The host owns the button and the drawer geometry now. Keep the
        // gesture state honest: if the host is collapsed, our drawer is closed
        // too. If the host is open, leave it open — a swipe may have just
        // opened it.
        if (frame.shellCollapsed() && drawer.isOpen) drawer.closeDrawer('reset')
        return
      }
      // The competitor vanished (e.g. 700→800px). If the host's sidebar is
      // still open, adopt it so the re-armed overlay can show it.
      if (mobile.snapshot().enabled && narrow.matches && !frame.shellCollapsed() && !drawer.isOpen) {
        drawer.openDrawer('reset')
      }
    })

    // Switching the adaptation off must leave no fixed overlay behind and no
    // stale "open" state. Switching it back on adopts an already-open host
    // sidebar, exactly like leaving backoff.
    const unsubscribeMobile = mobile.subscribe((state) => {
      if (!state.enabled) {
        if (drawer.isOpen) drawer.closeDrawer('reset')
        return
      }
      if (narrow.matches && !frame.shellCollapsed() && !drawer.isOpen) {
        drawer.openDrawer('reset')
      }
    })

    const removeGesture = installSwipeGesture({
      onOpen: () => drawer.openDrawer('gesture'),
      onClose: () => drawer.closeDrawer('gesture'),
      isOpen: () => drawer.isOpen,
      // The swipe is never disarmed by backoff: it is the one interaction the
      // host does not provide. The reader's switch still owns it.
      isActive: () => narrow.matches && mobile.snapshot().enabled,
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
      unsubscribeMobile()
      unsubscribeBackoff()
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
 * @param mobile - the reader's mobile-adaptation switch.
 */
function installCockpit(
  ctx: ClientContext,
  drawer: DrawerController,
  mobile: MobileController,
): void {
  ctx.effect(() => {
    let relay: ReturnType<typeof installCockpitRelay> | null = null

    /**
     * The relay only exists while the adaptation does: with the switch off the
     * console keeps its own floating launcher, and injecting a second entry
     * into the host's sidebar would duplicate it.
     */
    const sync = (): void => {
      if (mobile.snapshot().enabled) {
        if (relay === null) {
          relay = installCockpitRelay({
            onActivate: () => drawer.closeDrawer('backdrop'),
          })
        }
        return
      }
      relay?.dispose()
      relay = null
    }

    sync()
    const unsubscribe = mobile.subscribe(sync)

    return () => {
      unsubscribe()
      relay?.dispose()
      relay = null
    }
  }, 'dsh-mobile-shell: cockpit relay')
}

/**
 * Register the settings/header seats and start the page-load services.
 * @param ctx - client root context.
 * @param drawer - the drawer controller the header button drives.
 * @param mobile - the reader's mobile-adaptation switch.
 */
function installSurfaces(
  ctx: ClientContext,
  drawer: DrawerController,
  mobile: MobileController,
): void {
  // The install controller must exist for as long as the plugin does: the
  // browser's install event arrives at page load, long before Settings opens.
  const installer = new PwaInstaller()
  ctx.effect(() => {
    installer.start()
    return () => installer.dispose()
  }, 'dsh-mobile-shell: pwa installer')

  // Smooth tail motion runs from page load too: opening Settings to switch it
  // on must not be a precondition for the next message to animate.
  const smoothScroll = new SmoothScrollController()
  ctx.effect(() => {
    smoothScroll.start()
    return () => smoothScroll.dispose()
  }, 'dsh-mobile-shell: smooth scroll')

  // Edge-to-edge document metadata: viewport-fit=cover, the transparent
  // status-bar colour, and the standalone flag the stylesheet keys on. This
  // runs before the bootstrap so the phone lays the page out with the safe-area
  // insets already unlocked.
  ctx.effect(() => {
    const immersive = installImmersive()
    return () => immersive.dispose()
  }, 'dsh-mobile-shell: immersive pwa chrome')

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

  // One official-token divider starts this plugin's group, so the three rows
  // below read as their own region rather than trailing the version row.
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'dsh-mobile-shell-section',
    order: SECTION_DIVIDER_ORDER,
  }, SectionDivider))

  // The mobile-adaptation switch: the drawer, the gesture and the relay.
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'dsh-mobile-shell-mobile',
    order: MOBILE_ROW_ORDER,
    locale: NS,
    inject: () => ({ mobile }),
  }, MobileRow))

  // The install row, below the adaptation switch.
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'dsh-mobile-shell-pwa',
    order: PWA_ROW_ORDER,
    locale: NS,
    inject: () => ({ installer }),
  }, PwaRow))

  // The smooth-scroll switch, directly below the install row.
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'dsh-mobile-shell-smooth-scroll',
    order: SMOOTH_SCROLL_ROW_ORDER,
    locale: NS,
    inject: () => ({ smoothScroll }),
  }, SmoothScrollRow))
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

  // The adaptation switch must publish its marker before the drawer is wired,
  // so a disabled page never paints the overlay for a frame.
  const mobile = new MobileController()
  ctx.effect(() => {
    mobile.start()
    return () => mobile.dispose()
  }, 'dsh-mobile-shell: mobile preference')

  // Who owns the phone's top-left expand affordance? Decided before the drawer
  // is wired, so a page opened at phone width starts dormant instead of
  // flashing a second panel icon.
  const backoff = installBackoff(document)
  ctx.effect(() => () => backoff.dispose(), 'dsh-mobile-shell: top-left backoff')

  const drawer = installDrawer(ctx, backoff, mobile)
  installCockpit(ctx, drawer, mobile)
  installSurfaces(ctx, drawer, mobile)
}
