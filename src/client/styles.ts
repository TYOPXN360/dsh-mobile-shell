/**
 * The plugin's entire stylesheet, injected as one `<style>` tag.
 *
 * Every rule is fenced by {@link NARROW_TOUCH_QUERY}, the exact same predicate
 * the JavaScript uses to arm itself, so a desktop window (or a mouse-driven
 * window at any width, or a narrow non-touch window) matches nothing here and
 * keeps the shell's layout byte-for-byte.
 *
 * Three surfaces:
 * 1. the drawer — the shipped sidebar turned into an overlay that covers the
 *    conversation instead of shrinking it;
 * 2. the backdrop — tap-outside-to-close, living in the shell's overlay layer;
 * 3. the settings row — using the same row metrics as the shipped General rows
 *    (14px title, 12px description, 16px vertical rhythm, hairline separator).
 */

import { RELAY_ATTRIBUTE } from './cockpit-relay.ts'
import { DRAWER_ATTRIBUTE, NARROW_TOUCH_QUERY } from './drawer.ts'
import { FRAME_ATTRIBUTE, FRAME_RIGHT_VAR } from './frame-bridge.ts'

/**
 * Width of the drawer.
 *
 * `max-content` with a viewport cap, NOT a fixed pixel value. The shell's own
 * sidebar root has its own width (it is a 280px flex column, and a host build may
 * change it), so giving the overlay a DIFFERENT fixed width leaves a blank strip
 * on the right where the container is wider than its content. Sizing the
 * container to its content and capping it at the viewport keeps the panel flush
 * with the drawer edge on every host build.
 */
const DRAWER_WIDTH = 'min(86vw, max-content)'

/** The scrim colour, tuned for both shipped palettes via a token with a fallback. */
const SCRIM = 'var(--dsw-alias-bg-mask, rgb(0 0 0 / 45%))'

/**
 * Everything the plugin renders, as one stylesheet string.
 *
 * Kept as a plain template literal (no CSS-in-JS runtime, no build step) so the
 * bundle stays a single file the host loader can hand to the browser.
 */
export const SHELL_CSS = `
/* ============================================================
   1. Narrow-screen drawer: the sidebar becomes an overlay.
   ============================================================ */
@media ${NARROW_TOUCH_QUERY} {
  /* The rail column is removed from the grid, so the conversation keeps the
     full frame width whether the drawer is open or closed. The right-hand
     track is read back from the custom property the bridge publishes, so a
     touch tablet with the right panel open keeps that panel's column. */
  [${FRAME_ATTRIBUTE}="frame"] {
    grid-template-columns: 0 minmax(0, 1fr) var(${FRAME_RIGHT_VAR}, minmax(0, 0px)) !important;
    transition: none !important;
  }

  /* CRITICAL: taking the sidebar column out of flow (position: fixed) removes
     it from grid auto-placement, which would shift the centre into column 1 —
     the ZERO-width track — and blank the whole page. Every remaining column is
     therefore pinned to its own track explicitly. */
  [${FRAME_ATTRIBUTE}="frame"] > [class*="centerCol"] {
    grid-column: 2;
    grid-row: 1;
  }
  [${FRAME_ATTRIBUTE}="frame"] > [class*="rightbarCol"] {
    grid-column: 3;
    grid-row: 1;
  }
  [${FRAME_ATTRIBUTE}="frame"] > [data-shell-bottom] {
    grid-column: 1 / -1;
  }

  /* While closed, the shell's rail is not drawn and not hit-testable. The
     column itself stays in the DOM (the shell owns it), which is what lets the
     drawer open without remounting the sidebar subtree. */
  [${FRAME_ATTRIBUTE}="frame"] > [class*="sidebarCol"] {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 30;
    width: ${DRAWER_WIDTH};
    max-width: 100vw;
    /* Sized to the shell's own sidebar root; see DRAWER_WIDTH. */
    box-sizing: border-box;
    /* The shell's own panel inside owns the scroller; a second one here would
       fight it and clip the footer. */
    overflow: hidden;
    overscroll-behavior: contain;
    background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-base));
    border-right: 0.5px solid var(--dsw-alias-border-l3, rgb(255 255 255 / 12%));
    box-shadow: 0 12px 40px rgb(0 0 0 / 28%);
    transform: translateX(-101%);
    visibility: hidden;
    transition: transform var(--ds-transition-duration-slow, 220ms) var(--ds-ease-in-out, ease),
                visibility 0s linear var(--ds-transition-duration-slow, 220ms);
  }

  /* Open: slide in, take pointer events, and become the accessibility-visible
     surface. Visibility is switched without delay so the panel is reachable
     from the first frame of the animation. */
  html[${DRAWER_ATTRIBUTE}="open"] [${FRAME_ATTRIBUTE}="frame"] > [class*="sidebarCol"] {
    transform: translateX(0);
    visibility: visible;
    transition: transform var(--ds-transition-duration-slow, 220ms) var(--ds-ease-in-out, ease),
                visibility 0s linear 0s;
  }

  /* The drawer is an overlay: it must not inherit the shell's own scroll
     container geometry, which would clip the footer on short screens. */
  [${FRAME_ATTRIBUTE}="frame"] > [class*="sidebarCol"] > * {
    height: 100%;
  }

  /* The frame's own resize handle belongs to the desktop column model. */
  [${FRAME_ATTRIBUTE}="frame"] > [class*="handle"] {
    display: none !important;
  }

  /* The conversation column is the full frame now; the header's left padding
     is where the drawer button lands, so keep it in sync with the button. */
  [${FRAME_ATTRIBUTE}="frame"] [data-dsh-ms="header-leading"] {
    display: inline-flex;
    flex: none;
  }
}

/* ============================================================
   2. The drawer button (rendered at every width, shown only on narrow touch).
   ============================================================ */
[data-dsh-ms="drawer-button"] {
  display: none;
}
@media ${NARROW_TOUCH_QUERY} {
  [data-dsh-ms="drawer-button"] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    /* 36px visual box with a 44px hit area via the ::after expander, matching
       the touch-target rule the rest of the mobile chrome follows. */
    width: 30px;
    height: 30px;
    flex: none;
    margin-inline-end: 2px;
    padding: 0;
    border: none;
    border-radius: var(--dsw-radius-sm, 8px);
    background: transparent;
    color: var(--dsw-alias-label-secondary, inherit);
    cursor: pointer;
    position: relative;
    -webkit-tap-highlight-color: transparent;
  }
  [data-dsh-ms="drawer-button"]::after {
    content: "";
    position: absolute;
    inset: -7px;
  }
  [data-dsh-ms="drawer-button"]:active {
    background: var(--dsw-alias-interactive-bg-hover, rgb(255 255 255 / 10%));
  }
  /* Sticky :hover is a real problem on touch — only real pointers get it. */
  @media (hover: hover) {
    [data-dsh-ms="drawer-button"]:hover {
      background: var(--dsw-alias-interactive-bg-hover, rgb(255 255 255 / 10%));
    }
  }
  [data-dsh-ms="drawer-button"]:focus-visible {
    outline: 2px solid var(--dsw-alias-border-primary, currentColor);
    outline-offset: 2px;
  }
}

/* ============================================================
   3. Backdrop: tap outside the drawer to close it.
   ============================================================ */
[data-dsh-ms="backdrop"] {
  display: none;
}
@media ${NARROW_TOUCH_QUERY} {
  [data-dsh-ms="backdrop"] {
    position: fixed;
    inset: 0;
    z-index: 25;
    display: block;
    border: none;
    padding: 0;
    background: ${SCRIM};
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--ds-transition-duration-slow, 220ms) var(--ds-ease-in-out, ease);
    -webkit-tap-highlight-color: transparent;
  }
  html[${DRAWER_ATTRIBUTE}="open"] [data-dsh-ms="backdrop"] {
    opacity: 1;
    pointer-events: auto;
  }
}

/* ============================================================
   4. Settings row (General section, last item).
   ============================================================ */
[data-dsh-ms="pwa-row"] {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l3, rgb(255 255 255 / 12%));
}
[data-dsh-ms="pwa-row"]:last-child {
  border-bottom: none;
}
[data-dsh-ms="pwa-row-text"] {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
[data-dsh-ms="pwa-row-title"] {
  font-size: 14px;
  line-height: 22px;
  color: var(--dsw-alias-label-primary, #f9fafb);
}
[data-dsh-ms="pwa-row-desc"] {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary, #adb2b8);
}
[data-dsh-ms="pwa-row-desc"] a {
  color: inherit;
  text-decoration: underline;
}
[data-dsh-ms="pwa-button"] {
  appearance: none;
  flex: none;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--dsw-radius-sm, 8px);
  border: 1px solid var(--dsw-alias-border-l3, rgb(255 255 255 / 16%));
  background: var(--dsw-alias-interactive-bg-secondary, rgb(255 255 255 / 8%));
  color: var(--dsw-alias-label-primary, #f9fafb);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
}
[data-dsh-ms="pwa-button"]:active {
  background: var(--dsw-alias-interactive-bg-hover, rgb(255 255 255 / 14%));
}
[data-dsh-ms="pwa-button"]:disabled {
  opacity: 0.55;
  cursor: default;
}
@media (hover: hover) {
  [data-dsh-ms="pwa-button"]:hover:not(:disabled) {
    background: var(--dsw-alias-interactive-bg-hover, rgb(255 255 255 / 14%));
  }
}

/* ============================================================
   5. Body scroll lock while the drawer is open.
   ============================================================ */
@media ${NARROW_TOUCH_QUERY} {
  html[${DRAWER_ATTRIBUTE}="open"] body {
    overflow: hidden;
    touch-action: none;
  }
}


/* ============================================================
   7. Remote task console: hidden from the frame corner, mirrored in the drawer.
   ============================================================ */
@media ${NARROW_TOUCH_QUERY} {
  /* The console's own launcher floats over the conversation header on a phone.
     It is not ours to restyle into the header, so it is hidden and its shipped
     button is instead reached through the relay row in the drawer. The panel
     and its backdrop keep working exactly as shipped — only the corner entry
     disappears. */
  [data-remote-cockpit] > button {
    display: none !important;
  }
  [data-remote-cockpit] > [class*="backdrop"] {
    /* When the panel is opened from the drawer it is still the console's own
       backdrop; keep it above the drawer so a tap outside closes the console
       before it closes the drawer. */
    z-index: 40;
  }

  /* The relay row adopts the shipped row classes (glyph + title), so only the
     count badge needs styling: the shipped rows have no badge. */
  [${RELAY_ATTRIBUTE}] > [data-dsh-ms-cockpit-count] {
    flex: none;
    min-width: 18px;
    height: 18px;
    margin-inline-start: auto;
    padding: 0 5px;
    box-sizing: border-box;
    border-radius: 9px;
    background: var(--dsw-alias-interactive-bg-secondary, rgb(255 255 255 / 12%));
    color: var(--dsw-alias-label-secondary, #c9ced4);
    font-size: 11px;
    line-height: 18px;
    text-align: center;
  }
}

/* ============================================================
   8. Reduced motion: state changes stay instant, no slide.
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
  [${FRAME_ATTRIBUTE}="frame"] > [class*="sidebarCol"],
  [data-dsh-ms="backdrop"] {
    transition: none !important;
  }
}
`
