/**
 * Locale dictionaries for the two surfaces this plugin adds: the drawer
 * control in the session header and the "add to home screen" row in General
 * settings.
 *
 * Kept in one flat namespace so the whole plugin owns exactly one dictionary;
 * the shell composes keys, it never ships copy of its own.
 */

/** Namespace registered with `ctx.locale`. */
export const NS = 'dshMobileShell' as const

/** Chinese copy (the product's default locale). */
export const zh = {
  /** Accessible name of the header drawer button. */
  openSidebar: '展开侧边栏',
  /** Accessible name while the drawer is open. */
  closeSidebar: '收起侧边栏',
  /** Settings row title. */
  pwaTitle: '添加为 PWA 应用',
  /** Settings row description. */
  pwaDesc: '像原生应用一样安装 DeepSeek Assistant，从桌面图标直接打开',
  /** Install button label. */
  pwaInstall: '安装',
  /** Shown once the app already runs as an installed app. */
  pwaInstalled: '已安装',
  /** Shown while the browser has not offered an install prompt yet. */
  pwaNotReady: '暂不可安装',
  /** Button label when installation is impossible until the origin is trusted. */
  pwaUnavailable: '需设为可信源',
  /**
   * The decisive explanation for a LAN/HTTP deployment, with the actual fix.
   * `{origin}` is replaced so the user sees exactly which address to add.
   */
  pwaInsecureHint: '当前地址 {origin} 不是安全上下文。在浏览器 chrome://flags 中搜索 unsafely-treat-insecure-origin-as-secure，把 {origin} 添加为可信源并重启浏览器，即可安装。',
  /** Shown while the install prompt is opening. */
  pwaInstalling: '正在打开安装…',
  /** iOS has no install prompt API: the manual path is the only one. */
  pwaIosHint: '在 Safari 中点击「分享」→「添加到主屏幕」',
  /** Fallback guidance for browsers that expose no prompt but do support install. */
  pwaManualHint: '在浏览器菜单中选择「安装应用」或「添加到主屏幕」',
  /** Shown when the install prompt was dismissed or failed. */
  pwaDismissed: '已取消安装',
} as const

/** English copy, key-for-key with {@link zh}. */
export const en: Record<keyof typeof zh, string> = {
  openSidebar: 'Open sidebar',
  closeSidebar: 'Close sidebar',
  pwaTitle: 'Add as PWA app',
  pwaDesc: 'Install DeepSeek Assistant like a native app and open it from a desktop icon',
  pwaInstall: 'Install',
  pwaInstalled: 'Installed',
  pwaNotReady: 'Not installable yet',
  pwaUnavailable: 'Trust origin first',
  pwaInsecureHint: 'This address ({origin}) is not a secure context. Open chrome://flags, find unsafely-treat-insecure-origin-as-secure, add {origin} as a trusted origin, then restart the browser to install.',
  pwaInstalling: 'Opening install…',
  pwaIosHint: 'In Safari, tap Share → Add to Home Screen',
  pwaManualHint: 'Open the browser menu and choose "Install app" or "Add to Home Screen"',
  pwaDismissed: 'Install cancelled',
}

/** Key union shared by both dictionaries. */
export type DshMobileShellKey = keyof typeof zh
