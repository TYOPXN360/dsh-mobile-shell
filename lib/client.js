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

// src/client/pwa-row.tsx
var import_react3 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
function PwaRow({ t, installer }) {
  const [snapshot, setSnapshot] = (0, import_react3.useState)(() => installer.snapshot());
  (0, import_react3.useEffect)(() => installer.subscribe(setSnapshot), [installer]);
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
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { "data-dsh-ms": "pwa-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { "data-dsh-ms": "pwa-row-text", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { "data-dsh-ms": "pwa-row-title", children: t("pwaTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { "data-dsh-ms": "pwa-row-desc", children: hint ?? t("pwaDesc") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
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
var APPLE_TITLE = "DeepSeek Assistant";
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

// src/client/styles.ts
var DRAWER_WIDTH = "min(86vw, max-content)";
var SCRIM = "var(--dsw-alias-bg-mask, rgb(0 0 0 / 45%))";
var SHELL_CSS = `
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
     it from grid auto-placement, which would shift the centre into column 1 \u2014
     the ZERO-width track \u2014 and blank the whole page. Every remaining column is
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
     and its backdrop keep working exactly as shipped \u2014 only the corner entry
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
  pwaDesc: "\u50CF\u539F\u751F\u5E94\u7528\u4E00\u6837\u5B89\u88C5 DeepSeek Assistant\uFF0C\u4ECE\u684C\u9762\u56FE\u6807\u76F4\u63A5\u6253\u5F00",
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
  pwaDismissed: "\u5DF2\u53D6\u6D88\u5B89\u88C5"
};
var en = {
  openSidebar: "Open sidebar",
  closeSidebar: "Close sidebar",
  pwaTitle: "Add as PWA app",
  pwaDesc: "Install DeepSeek Assistant like a native app and open it from a desktop icon",
  pwaInstall: "Install",
  pwaInstalled: "Installed",
  pwaNotReady: "Not installable yet",
  pwaUnavailable: "Trust origin first",
  pwaInsecureHint: "This address ({origin}) is not a secure context. Open chrome://flags, find unsafely-treat-insecure-origin-as-secure, add {origin} as a trusted origin, then restart the browser to install.",
  pwaInstalling: "Opening install\u2026",
  pwaIosHint: "In Safari, tap Share \u2192 Add to Home Screen",
  pwaManualHint: 'Open the browser menu and choose "Install app" or "Add to Home Screen"',
  pwaDismissed: "Install cancelled"
};

// src/client/index.tsx
var inject = ["slots", "layout", "locale"];
var GENERAL_ROW_ORDER = 1e3;
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
function installDrawer(ctx) {
  const drawer = new DrawerController();
  const narrow = window.matchMedia(NARROW_TOUCH_QUERY);
  ctx.effect(() => {
    const syncShell = () => {
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
      if (collapsed && drawer.isOpen) drawer.closeDrawer("reset");
      if (!collapsed && !drawer.isOpen && narrow.matches) drawer.openDrawer("reset");
    });
    const removeGesture = installSwipeGesture({
      onOpen: () => drawer.openDrawer("gesture"),
      onClose: () => drawer.closeDrawer("gesture"),
      isOpen: () => drawer.isOpen,
      isActive: () => narrow.matches
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
      unsubscribe();
      frame.dispose();
      drawer.dispose();
    };
  }, "dsh-mobile-shell: drawer");
  return drawer;
}
function installCockpit(ctx, drawer) {
  ctx.effect(() => {
    const relay = installCockpitRelay({
      onActivate: () => drawer.closeDrawer("backdrop")
    });
    return () => relay.dispose();
  }, "dsh-mobile-shell: cockpit relay");
}
function installSurfaces(ctx, drawer) {
  const installer = new PwaInstaller();
  ctx.effect(() => {
    installer.start();
    return () => installer.dispose();
  }, "dsh-mobile-shell: pwa installer");
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
    id: "dsh-mobile-shell-pwa",
    order: GENERAL_ROW_ORDER,
    locale: NS,
    inject: () => ({ installer })
  }, PwaRow));
}
function apply(ctx) {
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    "dsh-mobile-shell: dictionaries"
  );
  installStyles(ctx);
  const drawer = installDrawer(ctx);
  installCockpit(ctx, drawer);
  installSurfaces(ctx, drawer);
}

		})(module, exports, require);
		return module.exports;
	}
});
