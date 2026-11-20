window.__ModuleLoader__.load({
	id: "dsh-mobile-shell",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		(function (module, exports, require) {
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/drawer-button.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
function PanelIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "18", height: "18", viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "1.75", y: "2.75", width: "12.5", height: "10.5", rx: "1.6", stroke: "currentColor", strokeWidth: "1.2" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6.25 2.9v10.2", stroke: "currentColor", strokeWidth: "1.2" })
  ] });
}
function DrawerButton({ t, drawer }) {
  const [open, setOpen] = (0, import_react.useState)(() => drawer.isOpen);
  (0, import_react.useEffect)(() => drawer.subscribe((change) => setOpen(change.open)), [drawer]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      type: "button",
      "data-dsh-ms": "drawer-button",
      "aria-label": open ? t("closeSidebar") : t("openSidebar"),
      "aria-expanded": open,
      title: open ? t("closeSidebar") : t("openSidebar"),
      onClick: () => {
        drawer.toggle("button");
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelIcon, {})
    }
  );
}

// src/client/drawer-backdrop.tsx
var import_react2 = require("react");
var import_jsx_runtime2 = require("react/jsx-runtime");
function DrawerBackdrop({ drawer }) {
  const [open, setOpen] = (0, import_react2.useState)(() => drawer.isOpen);
  (0, import_react2.useEffect)(() => drawer.subscribe((change) => setOpen(change.open)), [drawer]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "button",
    {
      type: "button",
      "data-dsh-ms": "backdrop",
      tabIndex: open ? 0 : -1,
      "aria-hidden": open ? void 0 : true,
      "aria-label": "\u5173\u95ED\u4FA7\u8FB9\u680F",
      onClick: () => {
        drawer.closeDrawer("backdrop");
      }
    }
  );
}

// src/client/mobile-row.tsx
var import_react3 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
function MobileRow({ t, mobile }) {
  const [snapshot, setSnapshot] = (0, import_react3.useState)(() => mobile.snapshot());
  (0, import_react3.useEffect)(() => mobile.subscribe(setSnapshot), [mobile]);
  const enabled = snapshot.enabled;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { "data-dsh-ms": "setting-row", "data-dsh-ms-setting": "mobile", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { "data-dsh-ms": "setting-row-text", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { "data-dsh-ms": "setting-row-title", children: t("mobileTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { "data-dsh-ms": "setting-row-desc", children: t("mobileDesc") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "button",
      {
        type: "button",
        role: "switch",
        "aria-checked": enabled,
        "aria-label": t("mobileTitle"),
        "data-dsh-ms": "switch",
        onClick: () => mobile.setEnabled(!enabled),
        children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { "data-dsh-ms": "switch-thumb", "aria-hidden": "true" })
      }
    )
  ] });
}

// src/client/pwa-row.tsx
var import_react4 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
function PwaRow({ t, installer }) {
  const [snapshot, setSnapshot] = (0, import_react4.useState)(() => installer.snapshot());
  (0, import_react4.useEffect)(() => installer.subscribe(setSnapshot), [installer]);
  const { state, busy } = snapshot;
  const label = (() => {
    if (state === "installed") return t("pwaInstalled");
    if (busy) return t("pwaInstalling");
    if (state === "ready") return t("pwaInstall");
    if (state === "insecure") return t("pwaUnavailable");
    return t("pwaNotReady");
  })();
  const hint = (() => {
    if (state === "ios") return t("pwaIosHint");
    if (state === "manual") return t("pwaManualHint");
    if (state === "insecure") return t("pwaInsecureHint").replaceAll("{origin}", snapshot.origin);
    return void 0;
  })();
  const disabled = state !== "ready" || busy;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { "data-dsh-ms": "setting-row", "data-dsh-ms-setting": "pwa", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { "data-dsh-ms": "setting-row-text", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { "data-dsh-ms": "setting-row-title", children: t("pwaTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { "data-dsh-ms": "setting-row-desc", children: hint ?? t("pwaDesc") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "button",
      {
        type: "button",
        "data-dsh-ms": "pwa-button",
        disabled,
        onClick: () => {
          void installer.install();
        },
        children: label
      }
    )
  ] });
}

// src/client/section-divider.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
function SectionDivider() {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { "data-dsh-ms": "section-divider", role: "separator", "aria-hidden": "true" });
}

// src/client/smooth-scroll-row.tsx
var import_react5 = require("react");
var import_jsx_runtime6 = require("react/jsx-runtime");
function SmoothScrollRow({ t, smoothScroll }) {
  const [snapshot, setSnapshot] = (0, import_react5.useState)(() => smoothScroll.snapshot());
  (0, import_react5.useEffect)(() => smoothScroll.subscribe(setSnapshot), [smoothScroll]);
  const enabled = snapshot.enabled;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { "data-dsh-ms": "setting-row", "data-dsh-ms-setting": "smooth-scroll", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { "data-dsh-ms": "setting-row-text", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { "data-dsh-ms": "setting-row-title", children: t("smoothTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { "data-dsh-ms": "setting-row-desc", children: t("smoothDesc") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      "button",
      {
        type: "button",
        role: "switch",
        "aria-checked": enabled,
        "aria-label": t("smoothTitle"),
        "data-dsh-ms": "switch",
        onClick: () => smoothScroll.setEnabled(!enabled),
        children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { "data-dsh-ms": "switch-thumb", "aria-hidden": "true" })
      }
    )
  ] });
}

// src/client/drawer.ts
var DRAWER_ATTRIBUTE = "data-dsh-drawer";
var DRAWER_LOCK_ATTRIBUTE = "data-dsh-drawer-lock";
var NARROW_TOUCH_QUERY = "(max-width: 1023px) and (pointer: coarse)";
var DrawerController = class {
  open = false;
  listeners = /* @__PURE__ */ new Set();
  /** True while the drawer is open. */
  get isOpen() {
    return this.open;
  }
  /** Subscribe to state changes; the returned function unsubscribes. */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /**
   * Open the drawer. Idempotent.
   * @param cause - what requested the change (for listeners and debugging).
   * @returns whether the state actually changed.
   */
  openDrawer(cause) {
    return this.set(true, cause);
  }
  /**
   * Close the drawer. Idempotent.
   * @param cause - what requested the change.
   * @returns whether the state actually changed.
   */
  closeDrawer(cause) {
    return this.set(false, cause);
  }
  /** Flip the drawer; used by the header button. */
  toggle(cause) {
    return this.set(!this.open, cause);
  }
  /**
   * Forget the current state without notifying (teardown). Removes every
   * attribute this controller owns so a reload starts from a clean document.
   */
  dispose() {
    this.open = false;
    this.listeners.clear();
    const root = document.documentElement;
    root.removeAttribute(DRAWER_ATTRIBUTE);
    root.removeAttribute(DRAWER_LOCK_ATTRIBUTE);
  }
  /**
   * Write the new state and publish it.
   * @param next - desired open state.
   * @param cause - what requested the change.
   * @returns whether the state changed.
   */
  set(next, cause) {
    if (this.open === next) return false;
    this.open = next;
    const root = document.documentElement;
    if (next) {
      root.setAttribute(DRAWER_ATTRIBUTE, "open");
      root.setAttribute(DRAWER_LOCK_ATTRIBUTE, "");
    } else {
      root.setAttribute(DRAWER_ATTRIBUTE, "closed");
      root.removeAttribute(DRAWER_LOCK_ATTRIBUTE);
    }
    for (const listener of this.listeners) {
      try {
        listener({ open: next, cause });
      } catch (error) {
        console.warn("dsh-mobile-shell: drawer listener failed", error);
      }
    }
    return true;
  }
};

// src/client/mobile.ts
var MOBILE_STORAGE_KEY = "dsh-mobile-shell:mobile";
var MOBILE_ATTRIBUTE = "data-dsh-ms-mobile";
var MOBILE_OFF = "off";
function readMobilePreference(storage) {
  try {
    return storage?.getItem(MOBILE_STORAGE_KEY) !== MOBILE_OFF;
  } catch {
    return true;
  }
}
function writeMobilePreference(storage, enabled) {
  try {
    storage?.setItem(MOBILE_STORAGE_KEY, enabled ? "on" : MOBILE_OFF);
  } catch {
  }
}
function defaultStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
var MobileController = class {
  /**
   * @param storage - preference storage; defaults to localStorage when present.
   */
  constructor(storage = defaultStorage()) {
    this.storage = storage;
    this.current = readMobilePreference(this.storage);
  }
  storage;
  listeners = /* @__PURE__ */ new Set();
  current;
  doc = null;
  /** @returns the current reader-visible state. */
  snapshot() {
    return { enabled: this.current };
  }
  /**
   * Listen for switch changes.
   * @param listener - called with a fresh snapshot after every change.
   * @returns teardown for this listener.
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /**
   * Publish the current state onto `<html>`. Safe to call more than once.
   * Called before the drawer is wired so a disabled page never paints the
   * overlay for a frame.
   * @param doc - document whose root is marked.
   */
  start(doc = document) {
    this.doc = doc;
    this.syncAttribute();
  }
  /** Remove the marker and drop every listener. */
  dispose() {
    this.doc?.documentElement.removeAttribute(MOBILE_ATTRIBUTE);
    this.doc = null;
    this.listeners.clear();
  }
  /**
   * Apply and persist a new preference.
   * @param enabled - whether the narrow-screen adaptation should run.
   */
  setEnabled(enabled) {
    if (this.current === enabled) return;
    this.current = enabled;
    writeMobilePreference(this.storage, enabled);
    this.syncAttribute();
    for (const listener of [...this.listeners]) listener(this.snapshot());
  }
  /** Write, or clear, the CSS marker that stands the drawer down. */
  syncAttribute() {
    if (this.doc === null) return;
    if (this.current) this.doc.documentElement.removeAttribute(MOBILE_ATTRIBUTE);
    else this.doc.documentElement.setAttribute(MOBILE_ATTRIBUTE, MOBILE_OFF);
  }
};

// src/client/backoff.ts
var BACKOFF_ATTRIBUTE = "data-dsh-ms-backoff";
var NATIVE_DRAWER_SELECTOR = "[data-sidebar-drawer]";
var HOST_LEADING_SELECTOR = "[data-shell-leading]";
var HOST_OPENER_SELECTOR = "[data-sidebar-opener]";
var FOREIGN_TOGGLE_SELECTOR = '[data-mobile-nav="toggle"]';
var HOST_LEADING_CONTROL_SELECTOR = `${HOST_LEADING_SELECTOR} :is(button, a, [role="button"])`;
var OWN_SURFACE_SELECTOR = "[data-dsh-ms]";
function isRendered(element) {
  if (!element.isConnected) return false;
  if (typeof element.getClientRects === "function") {
    return element.getClientRects().length > 0;
  }
  const box = element;
  return box.offsetWidth > 0 || box.offsetHeight > 0;
}
function firstVisible(doc, selector) {
  for (const element of doc.querySelectorAll(selector)) {
    if (element.closest(OWN_SURFACE_SELECTOR) !== null) continue;
    if (isRendered(element)) return element;
  }
  return null;
}
function detectBackoff(doc) {
  if (doc.querySelector(NATIVE_DRAWER_SELECTOR) !== null) {
    return { active: true, reason: "native-drawer" };
  }
  if (firstVisible(doc, `${HOST_LEADING_SELECTOR} ${HOST_OPENER_SELECTOR}`) !== null) {
    return { active: true, reason: "native-drawer" };
  }
  if (firstVisible(doc, HOST_LEADING_CONTROL_SELECTOR) !== null) {
    return { active: true, reason: "foreign-toggle" };
  }
  if (firstVisible(doc, FOREIGN_TOGGLE_SELECTOR) !== null) {
    return { active: true, reason: "foreign-toggle" };
  }
  return { active: false, reason: null };
}
function installBackoff(doc) {
  let current = detectBackoff(doc);
  let disposed = false;
  let pending = null;
  let observer = null;
  const listeners = /* @__PURE__ */ new Set();
  const write = (state) => {
    const root = doc.documentElement;
    if (state.active) root.setAttribute(BACKOFF_ATTRIBUTE, state.reason ?? "");
    else root.removeAttribute(BACKOFF_ATTRIBUTE);
  };
  const publish = (next) => {
    if (disposed) return;
    if (next.active === current.active && next.reason === current.reason) return;
    current = next;
    write(next);
    for (const listener of listeners) {
      try {
        listener(next);
      } catch (error) {
        console.warn("dsh-mobile-shell: backoff listener failed", error);
      }
    }
  };
  const cancel = () => {
    if (pending === null) return;
    if (pending.kind === "raf") {
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(pending.id);
    } else {
      clearTimeout(pending.id);
    }
    pending = null;
  };
  const reconcile = () => {
    pending = null;
    publish(detectBackoff(doc));
  };
  const schedule = () => {
    if (disposed || pending !== null) return;
    if (typeof requestAnimationFrame === "function") {
      pending = { kind: "raf", id: requestAnimationFrame(reconcile) };
    } else {
      pending = { kind: "timeout", id: setTimeout(reconcile, 0) };
    }
  };
  write(current);
  if (typeof MutationObserver !== "undefined") {
    observer = new MutationObserver(schedule);
    observer.observe(doc.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      // Visibility flips arrive as style/hidden changes or as a mount/unmount
      // (the host's drawer seat is conditional). A `class` watch would fire on
      // every React render for no signal this module reads.
      attributeFilter: ["data-sidebar-drawer", "data-sidebar-collapsed", "hidden", "aria-hidden", "style"]
    });
  }
  const onResize = () => schedule();
  if (typeof window !== "undefined") {
    window.addEventListener("resize", onResize, { passive: true });
  }
  return {
    state: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    sync: () => {
      cancel();
      reconcile();
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      cancel();
      observer?.disconnect();
      observer = null;
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", onResize);
      }
      listeners.clear();
      doc.documentElement.removeAttribute(BACKOFF_ATTRIBUTE);
    }
  };
}

// src/client/frame-bridge.ts
var FRAME_ATTRIBUTE = "data-dsh-mobile-shell";
var FRAME_RIGHT_VAR = "--dsh-ms-frame-right";
var ZERO_TRACK = "minmax(0px, 0px)";
function splitTracks(value) {
  const tracks = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth = Math.max(0, depth - 1);
    } else if ((char === " " || char === "	" || char === "\n") && depth === 0) {
      if (current !== "") tracks.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current !== "") tracks.push(current);
  return tracks;
}
function rightTrackOf(template) {
  const tracks = splitTracks(template);
  return tracks.length >= 3 ? tracks[2] : ZERO_TRACK;
}
var FRAME_SELECTOR = `[${FRAME_ATTRIBUTE}="frame"]`;
function installFrameBridge(onShellChange) {
  let marked = null;
  let lastCollapsed = null;
  const publishRightTrack = (frame) => {
    const template = frame.style.gridTemplateColumns;
    const right = rightTrackOf(template);
    if (frame.style.getPropertyValue(FRAME_RIGHT_VAR) !== right) {
      frame.style.setProperty(FRAME_RIGHT_VAR, right);
    }
  };
  const publishCollapsed = (frame) => {
    const collapsed = frame.hasAttribute("data-sidebar-collapsed");
    if (lastCollapsed === collapsed) return;
    lastCollapsed = collapsed;
    onShellChange(collapsed);
  };
  const sync = () => {
    const overlay = document.querySelector("[data-shell-overlay]");
    const frame = overlay?.parentElement ?? null;
    if (frame === null) return;
    if (frame !== marked) {
      if (marked !== null && marked.isConnected) marked.removeAttribute(FRAME_ATTRIBUTE);
      marked = frame;
      frame.setAttribute(FRAME_ATTRIBUTE, "frame");
      publishRightTrack(frame);
      lastCollapsed = null;
    }
    publishCollapsed(frame);
    publishRightTrack(frame);
  };
  const observer = new MutationObserver(() => sync());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "data-sidebar-collapsed"]
  });
  sync();
  return {
    frame: () => marked !== null && marked.isConnected ? marked : document.querySelector(FRAME_SELECTOR),
    shellCollapsed: () => {
      const frame = marked;
      return frame === null ? true : frame.hasAttribute("data-sidebar-collapsed");
    },
    dispose: () => {
      observer.disconnect();
      marked?.removeAttribute(FRAME_ATTRIBUTE);
      marked = null;
    }
  };
}

// src/client/swipe.ts
var SWIPE_DEFAULTS = {
  /**
   * Horizontal travel, in px, before the stroke is COMMITTED to opening.
   * 44px is below the shortest deliberate swipe and above tap jitter.
   */
  openDistance: 44,
  /**
   * The horizontal component must exceed the vertical by this factor before the
   * axis is considered locked. 1.4 keeps a slightly diagonal scroll from opening
   * the drawer, the single most common false positive in swipe code.
   */
  axisRatio: 1.4,
  /**
   * Movement, in px, before the axis is decided at all. 8px matches the
   * reference implementation's lock threshold: it decides within the first
   * frames of movement while staying clear of tap jitter.
   */
  lockDistance: 8,
  /**
   * Fraction of the viewport width in which a stroke may START. The default
   * covers the whole viewport — this is a GLOBAL swipe — and a caller may
   * narrow it deliberately.
   */
  startZoneRatio: 1,
  /** Leftward travel before an open drawer closes (opt-in direction). */
  closeDistance: 64
};
var CLICK_SUPPRESS_MS = 400;
var HORIZONTAL_SCROLLER = "[data-dsh-ms-swipe-ignore], pre, table, [data-horizontal-scroll]";
var INTERACTIVE = 'button, a, input, textarea, select, [role="switch"], [role="button"], [contenteditable="true"]';
function insideHorizontalScroller(target) {
  let node = target;
  while (node !== null && node !== document.documentElement) {
    if (node.matches?.(HORIZONTAL_SCROLLER) === true) return true;
    const overflowX = getComputedStyle(node).overflowX;
    if ((overflowX === "auto" || overflowX === "scroll") && node.scrollWidth > node.clientWidth + 2) return true;
    node = node.parentElement;
  }
  return false;
}
function insideInteractive(target) {
  return target !== null && target.closest?.(INTERACTIVE) != null;
}
function decideAxis(absX, absY, lockDistance, axisRatio) {
  if (absX < lockDistance && absY < lockDistance) return "pending";
  if (absX < absY * axisRatio) return "abandoned";
  return "locked";
}
function installSwipeGesture(options) {
  const tuning = { ...SWIPE_DEFAULTS, ...options.tuning };
  const closeOnLeftSwipe = options.closeOnLeftSwipe !== false;
  let stroke = null;
  let suppressClickUntil = 0;
  const onClickCapture = (event) => {
    if (Date.now() > suppressClickUntil) return;
    suppressClickUntil = 0;
    event.stopPropagation();
    event.preventDefault();
  };
  const lockStroke = (active, dx) => {
    active.phase = "locked";
    active.direction = dx > 0 ? 1 : -1;
    suppressClickUntil = Date.now() + CLICK_SUPPRESS_MS;
  };
  const advance = (active, dx, dy) => {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (active.phase === "pending") {
      const next = decideAxis(absX, absY, tuning.lockDistance, tuning.axisRatio);
      if (next === "pending") return void 0;
      if (next === "abandoned") {
        active.phase = "abandoned";
        return void 0;
      }
      lockStroke(active, dx);
    }
    if (active.phase !== "locked") return void 0;
    const open = options.isOpen();
    if (!open && active.direction === 1 && !active.fromDrawer) {
      if (dx < tuning.openDistance) return void 0;
      if (active.startX > window.innerWidth * tuning.startZoneRatio) return void 0;
      return "open";
    }
    if (open && closeOnLeftSwipe && active.direction === -1) {
      if (-dx < tuning.closeDistance) return void 0;
      return "close";
    }
    return void 0;
  };
  const onPointerDown = (event) => {
    stroke = null;
    if (!options.isActive()) return;
    if (event.pointerType === "mouse") return;
    if (!event.isPrimary) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target === null) return;
    if (insideInteractive(target)) return;
    const open = options.isOpen();
    const fromDrawer = target.closest("[data-dsh-drawer-surface]") !== null;
    if (fromDrawer && !(open && closeOnLeftSwipe)) return;
    if (!open && insideHorizontalScroller(target)) return;
    stroke = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      phase: "pending",
      direction: 1,
      fromDrawer
    };
  };
  const onPointerMove = (event) => {
    const active = stroke;
    if (active === null || event.pointerId !== active.pointerId) return;
    if (event.pointerType === "mouse") return;
    const verdict = advance(active, event.clientX - active.startX, event.clientY - active.startY);
    if (verdict === void 0) return;
    stroke = null;
    if (verdict === "open") options.onOpen();
    else options.onClose();
  };
  const onTouchMove = (event) => {
    const active = stroke;
    if (active === null) return;
    if (event.touches.length !== 1 || !event.cancelable) {
      stroke = null;
      return;
    }
    const touch = event.touches[0];
    if (touch === void 0) return;
    const verdict = advance(active, touch.clientX - active.startX, touch.clientY - active.startY);
    if (verdict !== void 0) {
      stroke = null;
      if (verdict === "open") options.onOpen();
      else options.onClose();
      return;
    }
    if (active.phase === "locked") {
      event.preventDefault();
    }
  };
  const onPointerEnd = (event) => {
    if (stroke !== null && event.pointerId === stroke.pointerId) stroke = null;
  };
  document.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
  document.addEventListener("pointermove", onPointerMove, { passive: true, capture: true });
  document.addEventListener("pointerup", onPointerEnd, { passive: true, capture: true });
  document.addEventListener("pointercancel", onPointerEnd, { passive: true, capture: true });
  document.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
  document.addEventListener("click", onClickCapture, { capture: true });
  return () => {
    document.removeEventListener("pointerdown", onPointerDown, { capture: true });
    document.removeEventListener("pointermove", onPointerMove, { capture: true });
    document.removeEventListener("pointerup", onPointerEnd, { capture: true });
    document.removeEventListener("pointercancel", onPointerEnd, { capture: true });
    document.removeEventListener("touchmove", onTouchMove, { capture: true });
    document.removeEventListener("click", onClickCapture, { capture: true });
    stroke = null;
  };
}

// src/client/cockpit-relay.ts
var COCKPIT_ROOT = "[data-remote-cockpit]";
var COCKPIT_LAUNCHER = "button";
var RELAY_ATTRIBUTE = "data-dsh-ms-cockpit";
function launcherLabel(launcher) {
  const label = launcher.getAttribute("aria-label") ?? "";
  return label.split(/[，,]/)[0]?.trim() ?? "";
}
function launcherCount(launcher) {
  const count = launcher.querySelector("span[aria-live]");
  return count?.textContent?.trim() ?? "";
}
function buildRow(launcher, list, onActivate) {
  const row = document.createElement("button");
  row.type = "button";
  row.setAttribute(RELAY_ATTRIBUTE, "");
  const label = launcherLabel(launcher);
  row.setAttribute("aria-label", label || "\u4EFB\u52A1\u63A7\u5236\u53F0");
  row.title = label || "\u4EFB\u52A1\u63A7\u5236\u53F0";
  const glyph = document.createElement("span");
  glyph.setAttribute("aria-hidden", "true");
  glyph.dataset.dshMsCockpitGlyph = "";
  const glyphElement = [...list.querySelectorAll('[class*="panelGlyph"]')][0];
  if (glyphElement !== void 0 && glyphElement.className !== "") glyph.className = glyphElement.className;
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("width", "16");
  icon.setAttribute("height", "16");
  icon.setAttribute("viewBox", "0 0 16 16");
  icon.setAttribute("fill", "none");
  icon.setAttribute("aria-hidden", "true");
  icon.style.width = "16px";
  icon.style.height = "16px";
  icon.style.display = "block";
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M2.2 2.6h11.6v10.8H2.2z M2.2 6.2h11.6 M5.8 6.2v7.2");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.2");
  path.setAttribute("stroke-linejoin", "round");
  icon.appendChild(path);
  glyph.appendChild(icon);
  row.appendChild(glyph);
  const text = document.createElement("span");
  text.dataset.dshMsCockpitLabel = "";
  text.textContent = label || "\u4EFB\u52A1\u63A7\u5236\u53F0";
  const titleElement = [...list.querySelectorAll('[class*="panelTitle"]')].find((element) => typeof element.className === "string" && element.className !== "");
  if (titleElement !== void 0) text.className = titleElement.className;
  row.appendChild(text);
  const count = launcherCount(launcher);
  if (count !== "" && count !== "0") {
    const badge = document.createElement("span");
    badge.dataset.dshMsCockpitCount = "";
    badge.textContent = count;
    row.appendChild(badge);
  }
  row.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    launcher.click();
    onActivate();
  });
  return row;
}
function installCockpitRelay(options) {
  let row = null;
  let observer = null;
  const removeRow = () => {
    row?.remove();
    row = null;
  };
  const sync = () => {
    const launcher = document.querySelector(`${COCKPIT_ROOT} ${COCKPIT_LAUNCHER}`);
    const list = document.querySelector('[class*="panelList"]');
    if (launcher === null || list === null) {
      removeRow();
      return;
    }
    const existing = list.querySelector(`[${RELAY_ATTRIBUTE}]`);
    const expectedCount = launcherCount(launcher);
    if (existing !== null) {
      const shown = existing.querySelector("[data-dsh-ms-cockpit-count]")?.textContent?.trim() ?? "0";
      if (shown === (expectedCount === "" ? "0" : expectedCount)) {
        row = existing;
        return;
      }
      existing.remove();
    }
    const next = buildRow(launcher, list, options.onActivate);
    const siblings = [...list.querySelectorAll("button")].filter((button) => !button.hasAttribute(RELAY_ATTRIBUTE));
    const sibling = siblings[0];
    if (sibling !== void 0) next.className = sibling.className;
    const moreAnchor = list.querySelector('[class*="moreAnchor"]');
    if (moreAnchor !== null && moreAnchor.parentElement === list) {
      list.insertBefore(next, moreAnchor);
    } else {
      list.appendChild(next);
    }
    row = next;
  };
  observer = new MutationObserver(() => sync());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributeFilter: ["aria-label"]
  });
  sync();
  return {
    sync,
    dispose: () => {
      observer?.disconnect();
      observer = null;
      removeRow();
    }
  };
}

// src/routes.ts
var ASSET_PREFIX = "/_dsh_mobile_shell";
var MANIFEST_PATH = "/manifest.webmanifest";
var SERVICE_WORKER_PATH = "/sw.js";
var APPLE_TOUCH_ICON = "apple-touch-icon.png";

// src/client/pwa-installer.ts
function isStandalone() {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  const navigatorWithStandalone = navigator;
  return navigatorWithStandalone.standalone === true;
}
function isIosSafari() {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS;
}
function isSecureContext() {
  if (typeof window.isSecureContext === "boolean") return window.isSecureContext;
  try {
    const { protocol, hostname } = location;
    return protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
  } catch {
    return false;
  }
}
var PwaInstaller = class {
  prompt = null;
  installed = false;
  busy = false;
  listeners = /* @__PURE__ */ new Set();
  disposers = [];
  /** Start listening for the browser's install signals. */
  start() {
    this.installed = isStandalone();
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      this.prompt = event;
      this.emit();
    };
    const onInstalled = () => {
      this.installed = true;
      this.prompt = null;
      this.emit();
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    this.disposers.push(() => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    });
    const standalone = window.matchMedia("(display-mode: standalone)");
    const onDisplayMode = () => {
      this.installed = isStandalone();
      this.emit();
    };
    standalone.addEventListener("change", onDisplayMode);
    this.disposers.push(() => standalone.removeEventListener("change", onDisplayMode));
    this.emit();
  }
  /** Stop listening and drop the captured prompt. */
  dispose() {
    for (const dispose of this.disposers) dispose();
    this.disposers = [];
    this.listeners.clear();
    this.prompt = null;
  }
  /** Subscribe to snapshot changes; the returned function unsubscribes. */
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }
  /** The current snapshot. */
  snapshot() {
    return { state: this.state(), busy: this.busy, origin: location.origin };
  }
  /** Resolve the state from the facts above, in priority order. */
  state() {
    if (this.installed) return "installed";
    if (this.prompt !== null) return "ready";
    if (!isSecureContext()) return "insecure";
    if (isIosSafari()) return "ios";
    if (!("BeforeInstallPromptEvent" in window)) return "manual";
    return "pending";
  }
  /**
   * Show the browser's install prompt.
   * @returns the user's choice, or undefined when no prompt was available.
   */
  async install() {
    const prompt = this.prompt;
    if (prompt === null || this.busy) return void 0;
    this.busy = true;
    this.emit();
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      this.prompt = null;
      if (choice.outcome === "accepted") this.installed = true;
      return choice.outcome;
    } catch (error) {
      console.warn("dsh-mobile-shell: install prompt failed", error);
      this.prompt = null;
      return void 0;
    } finally {
      this.busy = false;
      this.emit();
    }
  }
  /** Publish the snapshot to every subscriber. */
  emit() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        console.warn("dsh-mobile-shell: pwa listener failed", error);
      }
    }
  }
};

// src/client/pwa-bootstrap.ts
var OWNED = "data-dsh-ms-bootstrap";
var APPLE_TITLE = "DeepSeek Harness";
var SAFE_CACHE = "dsh-mobile-shell-v2";
function ensureLink(rel, href) {
  const existing = document.head.querySelector(`link[rel="${rel}"]`);
  if (existing !== null) {
    existing.href = href;
    existing.setAttribute(OWNED, "");
    return existing;
  }
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  link.setAttribute(OWNED, "");
  document.head.appendChild(link);
  return link;
}
function ensureMeta(name, content) {
  const existing = document.head.querySelector(`meta[name="${name}"]`);
  if (existing !== null) {
    existing.content = content;
    existing.setAttribute(OWNED, "");
    return;
  }
  const meta = document.createElement("meta");
  meta.name = name;
  meta.content = content;
  meta.setAttribute(OWNED, "");
  document.head.appendChild(meta);
}
function assetUrl(file) {
  return new URL(`${ASSET_PREFIX}/${file}`, document.baseURI).href;
}
function routeUrl(path) {
  return new URL(path, document.baseURI).href;
}
async function purgeLegacyCaches() {
  try {
    if (typeof caches === "undefined") return;
    const names = await caches.keys();
    await Promise.all(
      names.filter((name) => name.startsWith("dsh-mobile-shell-") && name !== SAFE_CACHE).map((name) => caches.delete(name))
    );
  } catch {
  }
}
function installPwaBootstrap() {
  const manifest = ensureLink("manifest", routeUrl(MANIFEST_PATH));
  manifest.setAttribute("crossorigin", "use-credentials");
  ensureLink("apple-touch-icon", assetUrl(APPLE_TOUCH_ICON));
  ensureMeta("apple-mobile-web-app-title", APPLE_TITLE);
  ensureMeta("apple-mobile-web-app-capable", "yes");
  ensureMeta("application-name", APPLE_TITLE);
  let registration;
  let disposed = false;
  const canRegister = isSecureContext() && (location.protocol === "https:" || location.protocol === "http:") && "serviceWorker" in navigator;
  if (canRegister) {
    const workerUrl = routeUrl(SERVICE_WORKER_PATH);
    void purgeLegacyCaches();
    navigator.serviceWorker.register(workerUrl, { scope: "/", updateViaCache: "none" }).then((registered) => {
      if (disposed) {
        void registered.unregister();
        return;
      }
      registration = registered;
      void registered.update().catch(() => {
      });
    }).catch((error) => {
      console.warn("dsh-mobile-shell: service worker registration failed", error);
    });
  }
  return {
    registration: () => registration,
    dispose: () => {
      disposed = true;
      for (const element of document.head.querySelectorAll(`[${OWNED}]`)) element.remove();
      const owned = registration;
      registration = void 0;
      if (owned !== void 0) void owned.unregister();
    }
  };
}

// src/pwa/viewport.ts
var VIEWPORT_FIT_COVER = "viewport-fit=cover";
var DEFAULT_VIEWPORT = "width=device-width, initial-scale=1";
var DEFAULT_VIEWPORT_WITH_COVER = `${DEFAULT_VIEWPORT}, ${VIEWPORT_FIT_COVER}`;
function viewportWithCover(content) {
  const directives = content.split(",").map((directive) => directive.trim()).filter((directive) => directive.length > 0);
  if (directives.some((directive) => /^viewport-fit\s*=\s*cover$/i.test(directive))) {
    return content;
  }
  const withoutFit = directives.filter((directive) => !/^viewport-fit\s*=/i.test(directive));
  return [...withoutFit, VIEWPORT_FIT_COVER].join(", ");
}

// src/client/immersive.ts
var STANDALONE_ATTRIBUTE = "data-dsh-ms-standalone";
var IMMERSIVE_THEME_COLOR = "transparent";
var BROWSER_THEME_COLOR = "#111213";
var APPLE_STATUS_BAR_STYLE = "black-translucent";
function ensureMeta2(doc, name, content) {
  const existing = doc.head.querySelector(`meta[name="${name}"]`);
  if (existing !== null) {
    const previous = existing.getAttribute("content");
    existing.setAttribute("content", content);
    return {
      element: existing,
      undo: () => {
        if (previous === null) existing.removeAttribute("content");
        else existing.setAttribute("content", previous);
      }
    };
  }
  const meta = doc.createElement("meta");
  meta.setAttribute("name", name);
  meta.setAttribute("content", content);
  doc.head.appendChild(meta);
  return {
    element: meta,
    undo: () => meta.remove()
  };
}
function ensureViewportCover(doc) {
  const existing = doc.head.querySelector('meta[name="viewport"]');
  if (existing === null) {
    const meta = doc.createElement("meta");
    meta.setAttribute("name", "viewport");
    meta.setAttribute("content", DEFAULT_VIEWPORT_WITH_COVER);
    doc.head.appendChild(meta);
    return { undo: () => meta.remove() };
  }
  const previous = existing.getAttribute("content");
  const next = viewportWithCover(previous ?? "");
  if (next === previous) return { undo: () => {
  } };
  existing.setAttribute("content", next);
  return {
    undo: () => {
      if (previous === null) existing.removeAttribute("content");
      else existing.setAttribute("content", previous);
    }
  };
}
function isStandaloneWindow(win) {
  if (typeof win.matchMedia === "function") {
    for (const mode of ["standalone", "fullscreen", "minimal-ui"]) {
      if (win.matchMedia(`(display-mode: ${mode})`).matches) return true;
    }
  }
  const navigatorWithStandalone = win.navigator;
  return navigatorWithStandalone.standalone === true;
}
function watchStandalone(doc, win) {
  const sync = () => {
    if (isStandaloneWindow(win)) doc.documentElement.setAttribute(STANDALONE_ATTRIBUTE, "");
    else doc.documentElement.removeAttribute(STANDALONE_ATTRIBUTE);
  };
  sync();
  const modes = ["standalone", "fullscreen", "minimal-ui"].map((mode) => win.matchMedia(`(display-mode: ${mode})`));
  for (const mode of modes) mode.addEventListener("change", sync);
  win.addEventListener("appinstalled", sync);
  return {
    undo: () => {
      for (const mode of modes) mode.removeEventListener("change", sync);
      win.removeEventListener("appinstalled", sync);
      doc.documentElement.removeAttribute(STANDALONE_ATTRIBUTE);
    }
  };
}
function installImmersive(doc = document, win = window) {
  const viewport = ensureViewportCover(doc);
  const theme = ensureMeta2(doc, "theme-color", BROWSER_THEME_COLOR);
  const appleStatusBar = ensureMeta2(doc, "apple-mobile-web-app-status-bar-style", APPLE_STATUS_BAR_STYLE);
  const appleCapable = ensureMeta2(doc, "apple-mobile-web-app-capable", "yes");
  const standalone = watchStandalone(doc, win);
  const syncTheme = () => {
    theme.element.setAttribute(
      "content",
      isStandaloneWindow(win) ? IMMERSIVE_THEME_COLOR : BROWSER_THEME_COLOR
    );
  };
  syncTheme();
  win.addEventListener("appinstalled", syncTheme);
  let disposed = false;
  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      win.removeEventListener("appinstalled", syncTheme);
      standalone.undo();
      appleCapable.undo();
      appleStatusBar.undo();
      theme.undo();
      viewport.undo();
    }
  };
}

// src/client/fade-in.ts
var FADE_IN_DURATION_MS = 180;
var FADE_IN_EASING = "cubic-bezier(0.2, 0, 0, 1)";
var FADE_IN_MAX_BATCH = 12;
var FADE_IN_MAX_NODES = 60;
var FADE_IN_TAIL_WINDOW = 12;
var FADE_IN_WARMUP_MS = 200;
var FLOW_SELECTOR = "[data-chat-flow]";
var CONVERSATION_SELECTOR = "[data-conversation-content]";
var ROW_ATTRIBUTES = [
  "data-chat-flow-key",
  "data-chat-anchor-key",
  "data-chat-group-key",
  "data-chat-call-id",
  "data-chat-node-key"
];
var BLOCK_TAGS = /* @__PURE__ */ new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "DL",
  "DT",
  "DD",
  "PRE",
  "BLOCKQUOTE",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TR",
  "TD",
  "TH",
  "HR",
  "FIGURE",
  "FIGCAPTION",
  "DETAILS",
  "SUMMARY"
]);
var SKIP_TAGS = /* @__PURE__ */ new Set([
  "SCRIPT",
  "STYLE",
  "LINK",
  "META",
  "TEMPLATE",
  "NOSCRIPT",
  "BR",
  "WBR",
  "SVG",
  "PATH",
  "CIRCLE",
  "RECT",
  "LINE",
  "POLYLINE",
  "POLYGON",
  "G",
  "DEFS",
  "USE",
  "CLIPPATH",
  "MASK",
  "PATTERN",
  "IMAGE"
]);
function attribute(element, name) {
  const value = element.getAttribute?.(name);
  if (value !== void 0) return value;
  return element.hasAttribute(name) ? "" : null;
}
function isFadeCandidate(element) {
  if (element.nodeType !== 1) return false;
  const tag = element.tagName.toUpperCase();
  if (SKIP_TAGS.has(tag)) return false;
  if (element.hasAttribute("hidden")) return false;
  if (element.hasAttribute("data-chat-turn-spacer")) return false;
  if (element.hasAttribute("data-text-interaction-surface")) return false;
  if (element.hasAttribute("data-chat-motion")) return false;
  const ariaHidden = attribute(element, "aria-hidden");
  if (ariaHidden !== null && ariaHidden !== "false") return false;
  if (ROW_ATTRIBUTES.some((name) => element.hasAttribute(name))) return true;
  return BLOCK_TAGS.has(tag);
}
function outermostAdditions(elements) {
  const added = new Set(elements);
  const result = [];
  for (const element of new Set(elements)) {
    let nested = false;
    for (let parent = element.parentElement; parent !== null; parent = parent.parentElement) {
      if (added.has(parent)) {
        nested = true;
        break;
      }
    }
    if (!nested) result.push(element);
  }
  return result;
}
function containsFadeCandidate(element) {
  if (isFadeCandidate(element)) return true;
  const children = element.children;
  if (children === void 0) return false;
  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    if (child !== void 0 && containsFadeCandidate(child)) return true;
  }
  return false;
}
function isInTailWindow(element, column, windowSize = FADE_IN_TAIL_WINDOW) {
  let top = element;
  while (top.parentElement !== null && top.parentElement !== column) {
    top = top.parentElement;
  }
  if (top.parentElement !== column) return false;
  const children = column.children;
  if (children === void 0) return true;
  const start = Math.max(0, children.length - Math.max(1, windowSize));
  for (let index = start; index < children.length; index++) {
    if (children[index] === top) return true;
  }
  return false;
}
function shouldFadeBatch(candidateCount, nodeCount) {
  return candidateCount > 0 && candidateCount <= FADE_IN_MAX_BATCH && nodeCount <= FADE_IN_MAX_NODES;
}
var FadeInEngine = class {
  /**
   * @param doc - document owning the chat.
   * @param win - its window, used for animation and motion preference.
   */
  constructor(doc, win) {
    this.doc = doc;
    this.win = win;
  }
  doc;
  win;
  enabled = false;
  column = null;
  observer = null;
  columnObserver = null;
  animations = /* @__PURE__ */ new Set();
  byElement = /* @__PURE__ */ new WeakMap();
  discoverQueued = false;
  checkQueued = false;
  lastSession = "";
  readyAt = 0;
  /**
   * Attach or detach all observation. Enabling starts with the current
   * content already settled; only later additions fade.
   * @param enabled - desired state.
   */
  setEnabled(enabled) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (enabled) {
      this.connect();
      this.discover();
    } else {
      this.disconnect();
    }
  }
  /** Remove observers and cancel every running fade. */
  dispose() {
    this.enabled = false;
    this.disconnect();
  }
  /** Observe the document only to find and replace the mounted chat column. */
  connect() {
    if (this.observer === null && typeof MutationObserver === "function") {
      this.observer = new MutationObserver(this.onDocumentMutations);
      this.observer.observe(this.doc.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }
  /** Detach both observers and release every temporary animation. */
  disconnect() {
    this.observer?.disconnect();
    this.observer = null;
    this.checkQueued = false;
    this.unbindColumn();
    this.column = null;
  }
  /**
   * Only a remount or a hidden column matters at document scope. Chat rows can
   * mutate at token rate, so the layout read is coalesced to one check per
   * frame instead of forcing a synchronous layout on every commit.
   */
  onDocumentMutations = () => {
    if (!this.enabled || this.checkQueued) return;
    this.checkQueued = true;
    const check = () => {
      this.checkQueued = false;
      if (!this.enabled) return;
      const column = this.column;
      if (column === null || !column.isConnected || column.getClientRects().length === 0) {
        this.queueDiscover();
      }
    };
    if (typeof this.win.requestAnimationFrame === "function") {
      this.win.requestAnimationFrame(check);
    } else {
      check();
    }
  };
  /** Coalesce remount discovery into one microtask. */
  queueDiscover() {
    if (this.discoverQueued) return;
    this.discoverQueued = true;
    queueMicrotask(() => {
      this.discoverQueued = false;
      if (this.enabled) this.discover();
    });
  }
  /** Find the visible outer chat column, falling back to a mounted one. */
  discover() {
    const next = this.findColumn();
    if (next === this.column) {
      if (next !== null && this.columnObserver === null) this.bindColumn(next);
      return;
    }
    this.unbindColumn();
    this.column = next;
    if (next !== null) this.bindColumn(next);
  }
  /**
   * @returns the first visible top-level flow, or the first mounted one.
   */
  findColumn() {
    let fallback = null;
    for (const element of this.doc.querySelectorAll(FLOW_SELECTOR)) {
      if (element.parentElement?.closest(FLOW_SELECTOR) != null) continue;
      fallback ??= element;
      if (element.getClientRects().length > 0) return element;
    }
    return fallback;
  }
  /**
   * Observe additions inside one column.
   * @param column - mounted outer chat column.
   */
  bindColumn(column) {
    this.columnObserver?.disconnect();
    this.columnObserver = null;
    this.lastSession = this.readSession(column);
    this.readyAt = this.now() + FADE_IN_WARMUP_MS;
    if (typeof MutationObserver !== "function") return;
    this.columnObserver = new MutationObserver(this.onColumnMutations);
    this.columnObserver.observe(column, { childList: true, subtree: true });
  }
  /** Stop observing one column and release animations attached to it. */
  unbindColumn() {
    this.columnObserver?.disconnect();
    this.columnObserver = null;
    this.lastSession = "";
    this.readyAt = 0;
    this.cancelAnimations();
  }
  /** @param column - chat column. @returns the owning session id, if any. */
  readSession(column) {
    return column.closest(CONVERSATION_SELECTOR)?.getAttribute("data-conversation-session") ?? "";
  }
  /**
   * Animate the outermost new content blocks in one observer batch.
   * @param records - additions reported for the chat column.
   */
  onColumnMutations = (records) => {
    if (!this.enabled) return;
    const column = this.column;
    if (column === null || !column.isConnected) {
      this.queueDiscover();
      return;
    }
    const session = this.readSession(column);
    if (session !== this.lastSession) {
      this.lastSession = session;
      this.readyAt = this.now() + FADE_IN_WARMUP_MS;
      return;
    }
    if (this.now() < this.readyAt) return;
    const added = [];
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) added.push(node);
      }
    }
    if (added.length === 0 || added.length > FADE_IN_MAX_NODES) return;
    const outer = outermostAdditions(added);
    const targets = [];
    for (const element of outer) {
      if (!element.isConnected || !column.contains(element)) continue;
      if (this.hasHiddenAncestor(element, column)) continue;
      if (this.hasMotionAncestor(element, column)) continue;
      if (this.hasFadingAncestor(element, column)) continue;
      if (!containsFadeCandidate(element)) continue;
      if (!isInTailWindow(element, column)) continue;
      targets.push(element);
    }
    if (!shouldFadeBatch(targets.length, added.length)) return;
    for (const target of targets) this.fade(target);
  };
  /**
   * @param element - inserted node.
   * @param column - chat column.
   * @returns whether the node or an ancestor up to the column is hidden.
   */
  hasHiddenAncestor(element, column) {
    for (let node = element; node !== null; node = node.parentElement) {
      if (node.hasAttribute("hidden")) return true;
      const ariaHidden = node.getAttribute("aria-hidden");
      if (ariaHidden !== null && ariaHidden !== "false") return true;
      if (node === column) break;
    }
    return false;
  }
  /**
   * @param element - inserted node.
   * @param column - chat column.
   * @returns whether the host's own fold/reveal motion owns this subtree.
   */
  hasMotionAncestor(element, column) {
    for (let node = element; node !== null && node !== column; node = node.parentElement) {
      if (node.hasAttribute("data-chat-motion")) return true;
    }
    return false;
  }
  /**
   * @param element - inserted node.
   * @param column - chat column.
   * @returns whether an ancestor is already fading; its opacity already covers
   * this subtree, and a second fade would arrive at a different rate.
   */
  hasFadingAncestor(element, column) {
    for (let node = element; node !== null && node !== column; node = node.parentElement) {
      if (this.byElement.has(node)) return true;
    }
    return false;
  }
  /**
   * Play one fade, replacing an earlier fade on the same element.
   * @param element - new content block.
   */
  fade(element) {
    if (this.prefersReducedMotion()) return;
    if (typeof element.animate !== "function") return;
    const previous = this.byElement.get(element);
    if (previous !== void 0) {
      this.byElement.delete(element);
      this.animations.delete(previous);
      previous.cancel();
    }
    let end = 1;
    try {
      const parsed = Number.parseFloat(this.win.getComputedStyle(element).opacity);
      if (Number.isFinite(parsed)) end = parsed;
    } catch {
    }
    if (!(end > 0.05)) return;
    let animation;
    try {
      animation = element.animate(
        [{ opacity: 0 }, { opacity: end }],
        { duration: FADE_IN_DURATION_MS, easing: FADE_IN_EASING, fill: "none" }
      );
    } catch {
      return;
    }
    this.byElement.set(element, animation);
    this.animations.add(animation);
    const settle = () => {
      if (this.byElement.get(element) === animation) this.byElement.delete(element);
      this.animations.delete(animation);
    };
    animation.onfinish = settle;
    animation.oncancel = settle;
  }
  /** Cancel every fade this engine started. */
  cancelAnimations() {
    const animations = [...this.animations];
    this.animations.clear();
    this.byElement = /* @__PURE__ */ new WeakMap();
    for (const animation of animations) animation.cancel();
  }
  /** @returns whether the OS asks for reduced motion. */
  prefersReducedMotion() {
    if (typeof this.win.matchMedia !== "function") return false;
    return this.win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  /** @returns a monotonic millisecond clock for warmup expiry. */
  now() {
    return typeof this.win.performance?.now === "function" ? this.win.performance.now() : Date.now();
  }
};

// src/client/smooth-scroll.ts
var SMOOTH_SCROLL_STORAGE_KEY = "dsh-mobile-shell:smooth-scroll";
var SMOOTH_SCROLL_ATTRIBUTE = "data-dsh-ms-smooth-scroll";
var COLUMN_SELECTOR = "[data-chat-flow]";
var FOLLOW_SLOP = 32;
var MIN_STEP = 0.5;
var MAX_STEP = 320;
var MAX_OFFSET = 120;
var PENDING_GROWTH_TTL_MS = 100;
var BLOCK_ADD_WINDOW_MS = 100;
var SMOOTH_SCROLL_HALF_LIFE_MS = 45;
var SETTLE_PX = 0.35;
function readSmoothScrollPreference(storage) {
  try {
    return storage?.getItem(SMOOTH_SCROLL_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}
function writeSmoothScrollPreference(storage, enabled) {
  try {
    storage?.setItem(SMOOTH_SCROLL_STORAGE_KEY, enabled ? "on" : "off");
  } catch {
  }
}
function defaultStorage2() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
function growthStep(grew, following, msSinceBlockAdd = 0, consumed = false) {
  if (consumed) return 0;
  if (!following) return 0;
  if (!(grew > MIN_STEP) || grew > MAX_STEP) return 0;
  if (!(msSinceBlockAdd <= BLOCK_ADD_WINDOW_MS)) return 0;
  return grew;
}
function growthCompensation(moved, pendingGrowth, following) {
  if (!following) return 0;
  if (!(moved > MIN_STEP) || moved > MAX_STEP) return 0;
  if (!(pendingGrowth > MIN_STEP)) return 0;
  return Math.min(moved, pendingGrowth);
}
function decayOffset(offset, elapsedMs) {
  if (!(offset > 0)) return 0;
  const next = offset * Math.pow(0.5, Math.max(0, elapsedMs) / SMOOTH_SCROLL_HALF_LIFE_MS);
  return next < SETTLE_PX ? 0 : next;
}
var SmoothScrollEngine = class {
  /**
   * @param doc - document owning the chat.
   * @param win - its window, used for animation and motion preference.
   */
  constructor(doc, win) {
    this.doc = doc;
    this.win = win;
  }
  doc;
  win;
  enabled = false;
  column = null;
  scroller = null;
  observer = null;
  columnObserver = null;
  resizes = null;
  frame = null;
  lastFrameAt = null;
  offset = 0;
  lastTop = 0;
  /** Chat column layout height; independent of this engine's visual offset. */
  lastHeight = 0;
  /** Column width; a reflow is not streamed growth and must not animate. */
  lastWidth = 0;
  lastFloor = 0;
  pendingGrowth = 0;
  pendingAt = 0;
  /** When the newest content block entered the column, for soft-wrap gating. */
  lastBlockAddAt = Number.NEGATIVE_INFINITY;
  /** One glide per inserted block; later text reflow is a soft wrap. */
  blockConsumed = false;
  primed = false;
  discoverQueued = false;
  sampleQueued = false;
  /** Inline overscroll values this engine replaced; restored on unbind. */
  overscroll = [];
  /**
   * Attach or detach all observation. Enabling primes the next sample instead
   * of animating whatever jump happened while the reader was in Settings.
   * @param enabled - desired state.
   */
  setEnabled(enabled) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (enabled) {
      this.doc.documentElement.setAttribute(SMOOTH_SCROLL_ATTRIBUTE, "");
      this.primed = false;
      this.connect();
      this.discover();
    } else {
      this.doc.documentElement.removeAttribute(SMOOTH_SCROLL_ATTRIBUTE);
      this.disconnect();
      this.reset();
    }
  }
  /** Remove observers, pending frames, and every style this engine wrote. */
  dispose() {
    this.enabled = false;
    this.doc.documentElement.removeAttribute(SMOOTH_SCROLL_ATTRIBUTE);
    this.disconnect();
    this.reset();
  }
  /** Observe the whole document so a chat remount is picked up without polling. */
  connect() {
    if (this.observer === null && typeof MutationObserver === "function") {
      this.observer = new MutationObserver(this.onMutations);
      this.observer.observe(this.doc.documentElement, {
        childList: true,
        subtree: true
      });
    }
    this.doc.addEventListener("scroll", this.onScroll, { capture: true, passive: true });
    if (this.scroller !== null && this.scroller.isConnected) this.bindScroller(this.scroller);
  }
  /** Detach observation and stop the animation loop. */
  disconnect() {
    this.observer?.disconnect();
    this.observer = null;
    this.doc.removeEventListener("scroll", this.onScroll, { capture: true });
    this.columnObserver?.disconnect();
    this.columnObserver = null;
    this.resizes?.disconnect();
    this.resizes = null;
    if (this.frame !== null) this.win.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.lastFrameAt = null;
    this.restoreOverscroll();
  }
  /**
   * Only remounts matter here. Content growth is measured by the size
   * observer, which runs once per frame instead of once per streamed token;
   * reading layout from every mutation would force a layout at token rate.
   */
  onMutations = () => {
    if (!this.enabled) return;
    if (this.column === null || !this.column.isConnected || this.scroller !== null && !this.scroller.isConnected) {
      this.queueDiscover();
    }
  };
  /** A scroll from our scrollport is another chance to catch a late host jump. */
  onScroll = (event) => {
    if (!this.enabled || this.scroller === null) return;
    const target = event.target;
    if (target !== this.scroller && target !== this.doc.scrollingElement && target !== this.doc) return;
    this.sample();
  };
  /** Coalesce remount discovery into one microtask. */
  queueDiscover() {
    if (this.discoverQueued) return;
    this.discoverQueued = true;
    queueMicrotask(() => {
      this.discoverQueued = false;
      if (this.enabled) this.discover();
    });
  }
  /**
   * Sample after the current observer batch. The host follows tail growth from
   * its own ResizeObserver, and observer order is not a contract; a microtask
   * lets the host's scroll write land first so the jump never reaches paint.
   */
  queueSample() {
    if (this.sampleQueued) return;
    this.sampleQueued = true;
    queueMicrotask(() => {
      this.sampleQueued = false;
      if (this.enabled) this.sample();
    });
  }
  /** Find the visible chat column and its scrollport, resetting baselines on a swap. */
  discover() {
    const next = this.findColumn();
    if (next === this.column) {
      if (next !== null && (this.scroller === null || !this.scroller.isConnected)) {
        this.bindScroller(this.findScroller(next));
        this.primed = false;
      }
      if (next !== null && this.resizes === null) this.observeSize(next);
      if (next !== null && this.columnObserver === null) this.observeAdditions(next);
      return;
    }
    this.columnObserver?.disconnect();
    this.columnObserver = null;
    this.resizes?.disconnect();
    this.resizes = null;
    this.reset();
    this.column = next;
    this.bindScroller(next === null ? null : this.findScroller(next));
    if (next !== null) {
      this.observeSize(next);
      this.observeAdditions(next);
    }
  }
  /**
   * Watch the column itself. A width change, an image load, or a markdown
   * block that reflows can grow the content without any mutation this engine
   * sees; the size observer closes that gap.
   * @param column - mounted chat column.
   */
  observeSize(column) {
    if (typeof ResizeObserver !== "function") return;
    this.resizes?.disconnect();
    this.resizes = new ResizeObserver(() => {
      if (!this.enabled) return;
      this.sample();
      this.queueSample();
    });
    this.resizes.observe(column);
  }
  /**
   * Record when a content block is inserted. Only growth in the short window
   * after this timestamp is treated as a block entering; text reflow inside an
   * existing block is a soft wrap and advances without compensation.
   * @param column - mounted chat column.
   */
  observeAdditions(column) {
    if (typeof MutationObserver !== "function") return;
    this.columnObserver?.disconnect();
    this.columnObserver = new MutationObserver((records) => {
      if (!this.enabled) return;
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (!isFadeCandidate(node)) continue;
          this.lastBlockAddAt = this.now();
          this.blockConsumed = false;
          return;
        }
      }
    });
    this.columnObserver.observe(column, { childList: true, subtree: true });
  }
  /** @returns the first mounted, visible column, or a detached fallback. */
  findColumn() {
    let fallback = null;
    for (const element of this.doc.querySelectorAll(COLUMN_SELECTOR)) {
      if (element.parentElement?.closest(COLUMN_SELECTOR) != null) continue;
      if (element.closest("[hidden]") !== null) continue;
      if (element.getClientRects().length > 0) return element;
      fallback ??= element;
    }
    return fallback;
  }
  /**
   * Walk out to the element that actually scrolls. The host either scrolls
   * `.scroll` itself or delegates to an enclosing conversation scrollport, so
   * both are found by computed overflow rather than by a hashed class name.
   * @param column - mounted chat column.
   * @returns the nearest vertical scrollport, or the document scroller.
   */
  findScroller(column) {
    for (let node = column.parentElement; node !== null; node = node.parentElement) {
      const overflow = this.win.getComputedStyle(node).overflowY;
      if (overflow !== "auto" && overflow !== "scroll" && overflow !== "overlay") continue;
      if (node.scrollHeight > node.clientHeight + 1) return node;
    }
    const root = this.doc.scrollingElement;
    return root instanceof HTMLElement && root.scrollHeight > root.clientHeight + 1 ? root : null;
  }
  /**
   * Adopt one scrollport and turn off its overscroll elasticity while the
   * feature is active. The transcript must glide, not bounce, and a pull at
   * the top must not chain into the page. Previous inline values are restored
   * verbatim, so switching the feature off returns control to the host's CSS.
   * @param next - the new scrollport, or null when the chat is unmounted.
   */
  bindScroller(next) {
    if (next === this.scroller && this.overscroll.length > 0) return;
    this.restoreOverscroll();
    this.scroller = next;
    if (next === null) return;
    const targets = next === this.doc.scrollingElement && this.doc.body !== null ? [next, this.doc.body] : [next];
    for (const element of targets) {
      this.overscroll.push({ element, previous: element.style.getPropertyValue("overscroll-behavior") });
      element.style.setProperty("overscroll-behavior", "none");
    }
  }
  /** Put every replaced overscroll value back. */
  restoreOverscroll() {
    for (const { element, previous } of this.overscroll) {
      if (previous === "") element.style.removeProperty("overscroll-behavior");
      else element.style.setProperty("overscroll-behavior", previous);
    }
    this.overscroll = [];
  }
  /**
   * Compare the scrollport against the previous sample and decide whether this
   * commit was streamed growth. The read is the only layout cost; the write is
   * a compositor-only translation, so the host's own measurements stay valid.
   */
  sample() {
    if (!this.enabled) return;
    const column = this.column;
    if (column === null || !column.isConnected) {
      this.queueDiscover();
      return;
    }
    if (column.getClientRects().length === 0) {
      this.queueDiscover();
      return;
    }
    const scroller = this.scroller ?? this.findScroller(column);
    if (scroller === null) {
      this.primed = false;
      return;
    }
    this.bindScroller(scroller);
    const top = scroller.scrollTop;
    const height = column.offsetHeight;
    const width = column.offsetWidth;
    const floor = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const following = this.following(column, floor, top);
    if (this.primed && width !== this.lastWidth) {
      this.pendingGrowth = 0;
    } else if (this.primed) {
      const moved = top - this.lastTop;
      const grew = height - this.lastHeight;
      const now = this.now();
      if (grew > MIN_STEP) {
        const step = growthStep(
          grew,
          following,
          now - this.lastBlockAddAt,
          this.blockConsumed
        );
        if (step > 0) {
          this.pendingGrowth = Math.min(MAX_STEP, this.pendingGrowth + step);
          this.pendingAt = now;
        } else if (grew > MAX_STEP) {
          this.pendingGrowth = 0;
        }
        this.blockConsumed = true;
      }
      if (moved < -MIN_STEP) this.pendingGrowth = 0;
      if (this.pendingGrowth > 0 && now - this.pendingAt > PENDING_GROWTH_TTL_MS) {
        this.pendingGrowth = 0;
      }
      const compensation = growthCompensation(moved, this.pendingGrowth, following);
      if (compensation > 0) {
        this.pendingGrowth = Math.max(0, this.pendingGrowth - compensation);
        if (!this.prefersReducedMotion()) this.hold(compensation);
      }
    }
    this.lastTop = top;
    this.lastHeight = height;
    this.lastWidth = width;
    this.lastFloor = floor;
    this.primed = true;
  }
  /**
   * Whether the host currently intends to follow the tail. The host exposes
   * that intent as an attribute; the metric fallback keeps an older host
   * working when the attribute is absent.
   * @param column - mounted chat column.
   * @param floor - current scroll floor.
   * @param top - current scroll position.
   * @returns whether growth should move the reader.
   */
  following(column, floor, top) {
    if (column.closest("[data-chat-following-tail]") !== null) return true;
    return this.primed && floor - top <= FOLLOW_SLOP && this.lastFloor - this.lastTop <= FOLLOW_SLOP;
  }
  /** @returns a monotonic millisecond clock for pending-growth expiry. */
  now() {
    return typeof this.win.performance?.now === "function" ? this.win.performance.now() : Date.now();
  }
  /** Add visual lag and start the decay loop. */
  hold(pixels) {
    this.offset = Math.min(MAX_OFFSET, this.offset + pixels);
    this.apply();
    if (this.frame !== null) return;
    this.lastFrameAt = null;
    this.frame = this.win.requestAnimationFrame(this.tick);
  }
  /** Release the lag exponentially; the last step clears every temporary style. */
  tick = (now) => {
    this.frame = null;
    const elapsed = this.lastFrameAt === null ? 16 : Math.max(1, Math.min(64, now - this.lastFrameAt));
    this.lastFrameAt = now;
    this.offset = decayOffset(this.offset, elapsed);
    this.apply();
    if (this.offset > 0) this.frame = this.win.requestAnimationFrame(this.tick);
    else this.lastFrameAt = null;
  };
  /** Write the current lag as an individual transform (never `scrollTop`). */
  apply() {
    const column = this.column;
    if (column === null) return;
    if (this.offset > 0) {
      column.style.setProperty("translate", `0 ${this.offset.toFixed(2)}px`);
    } else {
      column.style.removeProperty("translate");
    }
  }
  /** @returns whether the OS asks for reduced motion. */
  prefersReducedMotion() {
    if (typeof this.win.matchMedia !== "function") return false;
    return this.win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  /** Drop pending motion and restore the untransformed layout. */
  reset() {
    if (this.frame !== null) this.win.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.lastFrameAt = null;
    this.offset = 0;
    this.pendingGrowth = 0;
    this.lastBlockAddAt = Number.NEGATIVE_INFINITY;
    this.blockConsumed = false;
    this.primed = false;
    this.apply();
  }
};
var SmoothScrollController = class {
  /**
   * @param storage - preference storage; defaults to localStorage when present.
   */
  constructor(storage = defaultStorage2()) {
    this.storage = storage;
    this.current = readSmoothScrollPreference(this.storage);
  }
  storage;
  listeners = /* @__PURE__ */ new Set();
  engine = null;
  fade = null;
  started = false;
  current;
  /** @returns the current reader-visible state. */
  snapshot() {
    return { enabled: this.current };
  }
  /**
   * Listen for switch changes.
   * @param listener - called with a fresh snapshot after every change.
   * @returns teardown for this listener.
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  /** Begin observing the live document. Safe to call once. */
  start(doc = document) {
    if (this.started) return;
    this.started = true;
    const view = doc.defaultView;
    if (view === null) return;
    this.engine = new SmoothScrollEngine(doc, view);
    this.fade = new FadeInEngine(doc, view);
    this.engine.setEnabled(this.current);
    this.fade.setEnabled(this.current);
  }
  /** Stop observing, restore the transcript, and drop every listener. */
  dispose() {
    this.engine?.dispose();
    this.engine = null;
    this.fade?.dispose();
    this.fade = null;
    this.started = false;
    this.listeners.clear();
  }
  /**
   * Apply and persist a new preference.
   * @param enabled - whether new lines should push old ones smoothly.
   */
  setEnabled(enabled) {
    if (this.current === enabled) return;
    this.current = enabled;
    writeSmoothScrollPreference(this.storage, enabled);
    this.engine?.setEnabled(enabled);
    this.fade?.setEnabled(enabled);
    for (const listener of [...this.listeners]) listener(this.snapshot());
  }
};

// src/client/styles.ts
var DRAWER_WIDTH = "min(86vw, max-content)";
var SCRIM = "var(--dsw-alias-bg-mask, rgb(0 0 0 / 45%))";
var DRAWER_ACTIVE = `html:not([${BACKOFF_ATTRIBUTE}]):not([${MOBILE_ATTRIBUTE}="${MOBILE_OFF}"])`;
var MOBILE_ACTIVE = `html:not([${MOBILE_ATTRIBUTE}="${MOBILE_OFF}"])`;
var SHELL_CSS = `
/* ============================================================
   1. Narrow-screen drawer: the sidebar becomes an overlay.
   ============================================================ */
@media ${NARROW_TOUCH_QUERY} {
  /* The rail column is removed from the grid, so the conversation keeps the
     full frame width whether the drawer is open or closed. The right-hand
     track is read back from the custom property the bridge publishes, so a
     touch tablet with the right panel open keeps that panel's column. */
  ${DRAWER_ACTIVE} [${FRAME_ATTRIBUTE}="frame"] {
    grid-template-columns: 0 minmax(0, 1fr) var(${FRAME_RIGHT_VAR}, minmax(0, 0px)) !important;
    transition: none !important;
  }

  /* CRITICAL: taking the sidebar column out of flow (position: fixed) removes
     it from grid auto-placement, which would shift the centre into column 1 \u2014
     the ZERO-width track \u2014 and blank the whole page. Every remaining column is
     therefore pinned to its own track explicitly. */
  ${DRAWER_ACTIVE} [${FRAME_ATTRIBUTE}="frame"] > [class*="centerCol"] {
    grid-column: 2;
    grid-row: 1;
  }
  ${DRAWER_ACTIVE} [${FRAME_ATTRIBUTE}="frame"] > [class*="rightbarCol"] {
    grid-column: 3;
    grid-row: 1;
  }
  ${DRAWER_ACTIVE} [${FRAME_ATTRIBUTE}="frame"] > [data-shell-bottom] {
    grid-column: 1 / -1;
  }

  /* While closed, the shell's rail is not drawn and not hit-testable. The
     column itself stays in the DOM (the shell owns it), which is what lets the
     drawer open without remounting the sidebar subtree. */
  ${DRAWER_ACTIVE} [${FRAME_ATTRIBUTE}="frame"] > [class*="sidebarCol"] {
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
  ${DRAWER_ACTIVE}[${DRAWER_ATTRIBUTE}="open"] [${FRAME_ATTRIBUTE}="frame"] > [class*="sidebarCol"] {
    transform: translateX(0);
    visibility: visible;
    transition: transform var(--ds-transition-duration-slow, 220ms) var(--ds-ease-in-out, ease),
                visibility 0s linear 0s;
  }

  /* The drawer is an overlay: it must not inherit the shell's own scroll
     container geometry, which would clip the footer on short screens. */
  ${DRAWER_ACTIVE} [${FRAME_ATTRIBUTE}="frame"] > [class*="sidebarCol"] > * {
    height: 100%;
  }

  /* The frame's own resize handle belongs to the desktop column model. */
  ${DRAWER_ACTIVE} [${FRAME_ATTRIBUTE}="frame"] > [class*="handle"] {
    display: none !important;
  }

  /* The conversation column is the full frame now; the header's left padding
     is where the drawer button lands, so keep it in sync with the button. */
  ${DRAWER_ACTIVE} [${FRAME_ATTRIBUTE}="frame"] [data-dsh-ms="header-leading"] {
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
  /* Sticky :hover is a real problem on touch \u2014 only real pointers get it. */
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
  ${DRAWER_ACTIVE} [data-dsh-ms="backdrop"] {
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
  ${DRAWER_ACTIVE}[${DRAWER_ATTRIBUTE}="open"] [data-dsh-ms="backdrop"] {
    opacity: 1;
    pointer-events: auto;
  }
}

/* ============================================================
   4. Settings group (General, after the shipped preferences).
   ============================================================ */
/* The shipped General rows separate themselves with this exact hairline
   (.5px solid var(--dsw-alias-border-l2)). The plugin keeps that rhythm and
   adds ONE divider above its rows, so the group reads as its own region rather
   than trailing the current-version row. */
[data-dsh-ms="section-divider"] {
  height: 0;
  margin: 8px 0 0;
  border-top: 0.5px solid var(--dsw-alias-border-l2, rgb(255 255 255 / 12%));
}
[data-dsh-ms="setting-row"] {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  border-bottom: 0.5px solid var(--dsw-alias-border-l2, rgb(255 255 255 / 12%));
}
/* The section's own CSS already removes the last row's border; this keeps the
   invariant if the shell's wrapper changes. */
[data-dsh-ms="setting-row"]:last-child {
  border-bottom: none;
}
[data-dsh-ms="setting-row-text"] {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
[data-dsh-ms="setting-row-title"] {
  font-size: 14px;
  line-height: 22px;
  color: var(--dsw-alias-label-primary, #f9fafb);
}
[data-dsh-ms="setting-row-desc"] {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary, #adb2b8);
}
[data-dsh-ms="setting-row-desc"] a {
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

/* A real switch: 40\xD722 track, 18px thumb, 18px travel. The thumb moves with
   the individual translate property so it composes with the track's colour
   transition and never touches layout. */
[data-dsh-ms="switch"] {
  appearance: none;
  position: relative;
  flex: none;
  width: 40px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--dsw-alias-border-l2, rgb(255 255 255 / 20%));
  cursor: pointer;
  transition: background-color 160ms cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
/* Enlarge the touch target without enlarging the painted track. */
[data-dsh-ms="switch"]::before {
  content: "";
  position: absolute;
  inset: -11px;
}
[data-dsh-ms="switch-thumb"] {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--dsw-alias-bg-layer-1, #fff);
  box-shadow: 0 1px 3px rgb(0 0 0 / 30%);
  transition: translate 160ms cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}
[data-dsh-ms="switch"][aria-checked="true"] {
  background: var(--dsw-alias-state-business-primary, #4d6bfe);
}
[data-dsh-ms="switch"][aria-checked="true"] [data-dsh-ms="switch-thumb"] {
  translate: 18px 0;
}
[data-dsh-ms="switch"]:focus-visible {
  outline: 2px solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary, #4d6bfe));
  outline-offset: 2px;
}

/* ============================================================
   5. Body scroll lock while the drawer is open.
   ============================================================ */
@media ${NARROW_TOUCH_QUERY} {
  ${DRAWER_ACTIVE}[${DRAWER_ATTRIBUTE}="open"] body {
    overflow: hidden;
    touch-action: none;
  }
}

/* ============================================================
   6. Top-left backoff: the host (or another plugin) owns the expand button.
   ============================================================ */
/* installBackoff \u4F1A\u5728 <html> \u4E0A\u5199\u8FD9\u4E2A\u5C5E\u6027\uFF1A\u8868\u793A\u5BBF\u4E3B\u539F\u751F\u62BD\u5C49\u6216\u7B2C\u4E09\u65B9\u79FB\u52A8\u7AEF
   \u5F00\u5173\u5DF2\u7ECF\u5360\u4F4F\u5DE6\u4E0A\u89D2\u3002\u4E0A\u65B9\u7684\u5217\u51E0\u4F55\u5DF2\u6309\u5B83\u95E8\u63A7\uFF1B\u6309\u94AE\u548C\u906E\u7F69\u7684\u79FB\u52A8\u7AEF display
   \u89C4\u5219\u4E0D\u5728\u95E8\u63A7\u5757\u91CC\uFF0C\u56E0\u6B64\u8FD9\u91CC\u663E\u5F0F\u8BA9\u5B83\u4EEC\u6D88\u5931\u3002 */
html[${BACKOFF_ATTRIBUTE}] [data-dsh-ms="drawer-button"],
html[${BACKOFF_ATTRIBUTE}] [data-dsh-ms="backdrop"] {
  display: none !important;
}

/* The reader's own switch retires the same two controls. The overlay geometry
   and the visible backdrop state are already behind DRAWER_ACTIVE; the button
   and the scrim's baseline live outside that block. */
html[${MOBILE_ATTRIBUTE}="${MOBILE_OFF}"] [data-dsh-ms="drawer-button"],
html[${MOBILE_ATTRIBUTE}="${MOBILE_OFF}"] [data-dsh-ms="backdrop"] {
  display: none !important;
}


/* ============================================================
   7. Remote task console: hidden from the frame corner, mirrored in the drawer.
   ============================================================ */
@media ${NARROW_TOUCH_QUERY} {
  /* The console's own launcher floats over the conversation header on a phone.
     It is not ours to restyle into the header, so it is hidden and its shipped
     button is instead reached through the relay row in the drawer. The panel
     and its backdrop keep working exactly as shipped \u2014 only the corner entry
     disappears. */
  ${MOBILE_ACTIVE} [data-remote-cockpit] > button {
    display: none !important;
  }
  ${MOBILE_ACTIVE} [data-remote-cockpit] > [class*="backdrop"] {
    /* When the panel is opened from the drawer it is still the console's own
       backdrop; keep it above the drawer so a tap outside closes the console
       before it closes the drawer. */
    z-index: 40;
  }

  /* The relay row adopts the shipped row classes (glyph + title), so only the
     count badge needs styling: the shipped rows have no badge. */
  ${MOBILE_ACTIVE} [${RELAY_ATTRIBUTE}] > [data-dsh-ms-cockpit-count] {
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
  [data-dsh-ms="switch"],
  [data-dsh-ms="switch-thumb"] {
    transition: none !important;
  }
}

/* ============================================================
   9. Installed PWA: edge-to-edge under the system bars.
   ============================================================ */
/* The safe-area variables are zero in every ordinary window. An installed
   window gets the real insets from the display-mode media query at first paint;
   the attribute covers iOS versions that only expose navigator.standalone.
   The frame then paints its background through the system-bar strip while its
   CONTENT is padded by the variables, so the clock and battery icons stay
   visible and no header control hides behind them. The Windows caption owns its
   own top padding, so that platform is excluded. */
:root {
  --dsh-ms-safe-top: 0px;
  --dsh-ms-safe-bottom: 0px;
  --dsh-ms-safe-left: 0px;
  --dsh-ms-safe-right: 0px;
}
@media (display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui) {
  :root {
    --dsh-ms-safe-top: env(safe-area-inset-top, 0px);
    --dsh-ms-safe-bottom: env(safe-area-inset-bottom, 0px);
    --dsh-ms-safe-left: env(safe-area-inset-left, 0px);
    --dsh-ms-safe-right: env(safe-area-inset-right, 0px);
  }
}
html[${STANDALONE_ATTRIBUTE}] {
  --dsh-ms-safe-top: env(safe-area-inset-top, 0px);
  --dsh-ms-safe-bottom: env(safe-area-inset-bottom, 0px);
  --dsh-ms-safe-left: env(safe-area-inset-left, 0px);
  --dsh-ms-safe-right: env(safe-area-inset-right, 0px);
  background: var(--dsw-alias-bg-base);
}
html:not([data-windows-titlebar]) [${FRAME_ATTRIBUTE}="frame"] {
  box-sizing: border-box;
  padding-top: var(--dsh-ms-safe-top);
  padding-bottom: var(--dsh-ms-safe-bottom);
  padding-left: var(--dsh-ms-safe-left);
  padding-right: var(--dsh-ms-safe-right);
}

@media ${NARROW_TOUCH_QUERY} {
  /* The overlay drawer is fixed to the viewport, so the frame padding never
     reaches it. Inset the panel's own content too; its background still runs
     under the bars. This also covers the host's native drawer, which uses the
     same sidebar column. */
  [${FRAME_ATTRIBUTE}="frame"] > [class*="sidebarCol"] {
    padding-top: var(--dsh-ms-safe-top);
    padding-bottom: var(--dsh-ms-safe-bottom);
    padding-left: var(--dsh-ms-safe-left);
    padding-right: var(--dsh-ms-safe-right);
  }
}

/* The host's leading seat is absolutely positioned inside the frame, so the
   frame padding does not move it; lift the opener below the status bar. This is
   deliberately more specific than the host's .frame[data-sidebar-drawer]
   .leadingSeat rule. */
html:not([data-windows-titlebar]) [${FRAME_ATTRIBUTE}="frame"] [data-shell-leading] {
  top: calc(11px + var(--dsh-ms-safe-top));
}
`;

// src/client/i18n.ts
var NS = "dshMobileShell";
var zh = {
  /** Accessible name of the header drawer button. */
  openSidebar: "\u5C55\u5F00\u4FA7\u8FB9\u680F",
  /** Accessible name while the drawer is open. */
  closeSidebar: "\u6536\u8D77\u4FA7\u8FB9\u680F",
  /** Settings row title. */
  pwaTitle: "\u6DFB\u52A0\u4E3A PWA \u5E94\u7528",
  /** Settings row description. */
  pwaDesc: "\u50CF\u539F\u751F\u5E94\u7528\u4E00\u6837\u5B89\u88C5 DeepSeek Harness\uFF0C\u4ECE\u684C\u9762\u56FE\u6807\u76F4\u63A5\u6253\u5F00",
  /** Install button label. */
  pwaInstall: "\u5B89\u88C5",
  /** Shown once the app already runs as an installed app. */
  pwaInstalled: "\u5DF2\u5B89\u88C5",
  /** Shown while the browser has not offered an install prompt yet. */
  pwaNotReady: "\u6682\u4E0D\u53EF\u5B89\u88C5",
  /** Button label when installation is impossible until the origin is trusted. */
  pwaUnavailable: "\u9700\u8BBE\u4E3A\u53EF\u4FE1\u6E90",
  /**
   * The decisive explanation for a LAN/HTTP deployment, with the actual fix.
   * `{origin}` is replaced so the user sees exactly which address to add.
   */
  pwaInsecureHint: "\u5F53\u524D\u5730\u5740 {origin} \u4E0D\u662F\u5B89\u5168\u4E0A\u4E0B\u6587\u3002\u5728\u6D4F\u89C8\u5668 chrome://flags \u4E2D\u641C\u7D22 unsafely-treat-insecure-origin-as-secure\uFF0C\u628A {origin} \u6DFB\u52A0\u4E3A\u53EF\u4FE1\u6E90\u5E76\u91CD\u542F\u6D4F\u89C8\u5668\uFF0C\u5373\u53EF\u5B89\u88C5\u3002",
  /** Shown while the install prompt is opening. */
  pwaInstalling: "\u6B63\u5728\u6253\u5F00\u5B89\u88C5\u2026",
  /** iOS has no install prompt API: the manual path is the only one. */
  pwaIosHint: "\u5728 Safari \u4E2D\u70B9\u51FB\u300C\u5206\u4EAB\u300D\u2192\u300C\u6DFB\u52A0\u5230\u4E3B\u5C4F\u5E55\u300D",
  /** Fallback guidance for browsers that expose no prompt but do support install. */
  pwaManualHint: "\u5728\u6D4F\u89C8\u5668\u83DC\u5355\u4E2D\u9009\u62E9\u300C\u5B89\u88C5\u5E94\u7528\u300D\u6216\u300C\u6DFB\u52A0\u5230\u4E3B\u5C4F\u5E55\u300D",
  /** Shown when the install prompt was dismissed or failed. */
  pwaDismissed: "\u5DF2\u53D6\u6D88\u5B89\u88C5",
  /** Mobile-adaptation settings row title. */
  mobileTitle: "\u79FB\u52A8\u7AEF\u9002\u914D",
  /** Mobile-adaptation settings row description. */
  mobileDesc: "\u7A84\u5C4F\u4E0B\u7528\u62BD\u5C49\u4EE3\u66FF\u4FA7\u8FB9\u680F\uFF0C\u652F\u6301\u53F3\u6ED1\u5C55\u5F00\uFF1B\u5173\u95ED\u540E\u6062\u590D\u5BBF\u4E3B\u7684\u539F\u751F\u5E03\u5C40",
  /** Smooth-scroll settings row title. */
  smoothTitle: "\u5E73\u6ED1\u6EDA\u52A8\u4E0E\u6DE1\u5165",
  /** Smooth-scroll settings row description. */
  smoothDesc: "\u65B0\u5185\u5BB9\u6DE1\u5165\u3001\u65E7\u5185\u5BB9\u5E73\u6ED1\u4E0A\u79FB\uFF0C\u4E0D\u56DE\u5F39\uFF1B\u601D\u8003\u8FC7\u7A0B\u540C\u6837\u751F\u6548"
};
var en = {
  openSidebar: "Open sidebar",
  closeSidebar: "Close sidebar",
  pwaTitle: "Add as PWA app",
  pwaDesc: "Install DeepSeek Harness like a native app and open it from a desktop icon",
  pwaInstall: "Install",
  pwaInstalled: "Installed",
  pwaNotReady: "Not installable yet",
  pwaUnavailable: "Trust origin first",
  pwaInsecureHint: "This address ({origin}) is not a secure context. Open chrome://flags, find unsafely-treat-insecure-origin-as-secure, add {origin} as a trusted origin, then restart the browser to install.",
  pwaInstalling: "Opening install\u2026",
  pwaIosHint: "In Safari, tap Share \u2192 Add to Home Screen",
  pwaManualHint: 'Open the browser menu and choose "Install app" or "Add to Home Screen"',
  pwaDismissed: "Install cancelled",
  mobileTitle: "Mobile layout",
  mobileDesc: "Use an overlay drawer with right-swipe on narrow screens; turn off to restore the host layout",
  smoothTitle: "Smooth scroll & fade-in",
  smoothDesc: "New content fades in while old lines glide upward, with no bounce; reasoning included"
};

// src/client/index.tsx
var inject = ["slots", "layout", "locale"];
var SECTION_DIVIDER_ORDER = 998;
var MOBILE_ROW_ORDER = 999;
var PWA_ROW_ORDER = 1e3;
var SMOOTH_SCROLL_ROW_ORDER = PWA_ROW_ORDER + 1;
function installStyles(ctx) {
  ctx.effect(() => {
    for (const stale of document.querySelectorAll('style[data-plugin-css="dsh-mobile-shell/shell.css"]')) {
      stale.remove();
    }
    const tag = document.createElement("style");
    tag.dataset.plugin = "dsh-mobile-shell";
    tag.dataset.pluginCss = "dsh-mobile-shell/shell.css";
    tag.textContent = SHELL_CSS;
    document.head.appendChild(tag);
    return () => tag.remove();
  }, "dsh-mobile-shell: stylesheet");
}
function installDrawer(ctx, backoff, mobile) {
  const drawer = new DrawerController();
  const narrow = window.matchMedia(NARROW_TOUCH_QUERY);
  ctx.effect(() => {
    const syncShell = () => {
      if (!mobile.snapshot().enabled) return;
      const frame2 = document.querySelector('[data-dsh-mobile-shell="frame"]');
      const shellOpen = frame2 !== null && !frame2.hasAttribute("data-sidebar-collapsed");
      if (drawer.isOpen !== shellOpen) ctx.layout.toggleSidebar();
    };
    const unsubscribe = drawer.subscribe((change) => {
      if (change.cause !== "reset") syncShell();
    });
    const onQueryChange = () => {
      if (!narrow.matches) drawer.closeDrawer("reset");
    };
    narrow.addEventListener("change", onQueryChange);
    const frame = installFrameBridge((collapsed) => {
      if (!mobile.snapshot().enabled) return;
      if (collapsed && drawer.isOpen) drawer.closeDrawer("reset");
      if (!collapsed && !drawer.isOpen) drawer.openDrawer("reset");
    });
    const unsubscribeBackoff = backoff.subscribe((state) => {
      if (state.active) {
        if (frame.shellCollapsed() && drawer.isOpen) drawer.closeDrawer("reset");
        return;
      }
      if (mobile.snapshot().enabled && narrow.matches && !frame.shellCollapsed() && !drawer.isOpen) {
        drawer.openDrawer("reset");
      }
    });
    const unsubscribeMobile = mobile.subscribe((state) => {
      if (!state.enabled) {
        if (drawer.isOpen) drawer.closeDrawer("reset");
        return;
      }
      if (narrow.matches && !frame.shellCollapsed() && !drawer.isOpen) {
        drawer.openDrawer("reset");
      }
    });
    const removeGesture = installSwipeGesture({
      onOpen: () => drawer.openDrawer("gesture"),
      onClose: () => drawer.closeDrawer("gesture"),
      isOpen: () => drawer.isOpen,
      // The swipe is never disarmed by backoff: it is the one interaction the
      // host does not provide. The reader's switch still owns it.
      isActive: () => narrow.matches && mobile.snapshot().enabled
    });
    const onKeyDown = (event) => {
      if (event.key === "Escape" && drawer.isOpen) {
        event.stopPropagation();
        drawer.closeDrawer("escape");
      }
    };
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      narrow.removeEventListener("change", onQueryChange);
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      removeGesture();
      unsubscribeMobile();
      unsubscribeBackoff();
      unsubscribe();
      frame.dispose();
      drawer.dispose();
    };
  }, "dsh-mobile-shell: drawer");
  return drawer;
}
function installCockpit(ctx, drawer, mobile) {
  ctx.effect(() => {
    let relay = null;
    const sync = () => {
      if (mobile.snapshot().enabled) {
        if (relay === null) {
          relay = installCockpitRelay({
            onActivate: () => drawer.closeDrawer("backdrop")
          });
        }
        return;
      }
      relay?.dispose();
      relay = null;
    };
    sync();
    const unsubscribe = mobile.subscribe(sync);
    return () => {
      unsubscribe();
      relay?.dispose();
      relay = null;
    };
  }, "dsh-mobile-shell: cockpit relay");
}
function installSurfaces(ctx, drawer, mobile) {
  const installer = new PwaInstaller();
  ctx.effect(() => {
    installer.start();
    return () => installer.dispose();
  }, "dsh-mobile-shell: pwa installer");
  const smoothScroll = new SmoothScrollController();
  ctx.effect(() => {
    smoothScroll.start();
    return () => smoothScroll.dispose();
  }, "dsh-mobile-shell: smooth scroll");
  ctx.effect(() => {
    const immersive = installImmersive();
    return () => immersive.dispose();
  }, "dsh-mobile-shell: immersive pwa chrome");
  ctx.effect(() => {
    const bootstrap = installPwaBootstrap();
    return () => bootstrap.dispose();
  }, "dsh-mobile-shell: pwa bootstrap");
  ctx.slots.inject("conversation.header.leading", () => ctx.slots.register({
    name: "conversation.header.leading",
    locale: NS,
    inject: () => ({ drawer })
  }, DrawerButton));
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({
    name: "shell.overlay",
    id: "dsh-mobile-shell-backdrop",
    order: 5,
    inject: () => ({ drawer })
  }, DrawerBackdrop));
  ctx.slots.inject("settings.general.item", () => ctx.slots.register({
    name: "settings.general.item",
    id: "dsh-mobile-shell-section",
    order: SECTION_DIVIDER_ORDER
  }, SectionDivider));
  ctx.slots.inject("settings.general.item", () => ctx.slots.register({
    name: "settings.general.item",
    id: "dsh-mobile-shell-mobile",
    order: MOBILE_ROW_ORDER,
    locale: NS,
    inject: () => ({ mobile })
  }, MobileRow));
  ctx.slots.inject("settings.general.item", () => ctx.slots.register({
    name: "settings.general.item",
    id: "dsh-mobile-shell-pwa",
    order: PWA_ROW_ORDER,
    locale: NS,
    inject: () => ({ installer })
  }, PwaRow));
  ctx.slots.inject("settings.general.item", () => ctx.slots.register({
    name: "settings.general.item",
    id: "dsh-mobile-shell-smooth-scroll",
    order: SMOOTH_SCROLL_ROW_ORDER,
    locale: NS,
    inject: () => ({ smoothScroll })
  }, SmoothScrollRow));
}
function apply(ctx) {
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    "dsh-mobile-shell: dictionaries"
  );
  installStyles(ctx);
  const mobile = new MobileController();
  ctx.effect(() => {
    mobile.start();
    return () => mobile.dispose();
  }, "dsh-mobile-shell: mobile preference");
  const backoff = installBackoff(document);
  ctx.effect(() => () => backoff.dispose(), "dsh-mobile-shell: top-left backoff");
  const drawer = installDrawer(ctx, backoff, mobile);
  installCockpit(ctx, drawer, mobile);
  installSurfaces(ctx, drawer, mobile);
}

		})(module, exports, require);
		return module.exports;
	}
});
