/**
 * PWA manifest — pure builder, no I/O.
 *
 * Kept separate from the host half so the same document can be asserted by
 * tests and served through any transport (the host's own webServer, or a
 * reverse proxy in front of it). Nothing here reads config files or the
 * filesystem: every value arrives as an argument.
 */

/** Icon entries the plugin serves itself (never the host's internal dist). */
export interface ManifestIconInput {
  /** Absolute path the icon is served at, e.g. `/_dsh_mobile_shell/icon-192.png`. */
  src: string
  sizes: string
  type: string
  purpose?: string
}

/** Everything the manifest needs from the running host. */
export interface ManifestInput {
  /** Application name shown on the install prompt and the home screen. */
  name: string
  /** Short name under the launcher icon (11 chars is Android's practical cap). */
  shortName: string
  /**
   * Entry point. Absolute (`/`) rather than relative: a manifest may be served
   * from a nested plugin route, and a relative start_url would then resolve
   * against that route instead of the application root — which breaks the
   * launch URL on every deployment whose manifest lives under a prefix.
   */
  startUrl: string
  /** Navigation scope; must contain startUrl or the browser rejects the manifest. */
  scope: string
  /** Standalone keeps the app shell full-bleed; the DSH UI owns its own chrome. */
  display: string
  /**
   * Progressive enhancement for browsers that support it: `standalone` first so
   * a launcher that understands window-controls-overlay still gets a plain
   * full-bleed window rather than a decorated one.
   */
  displayOverride?: readonly string[]
  backgroundColor: string
  themeColor: string
  icons: readonly ManifestIconInput[]
  /** Locale of `name`/`shortName`/`description`; the app itself localizes at runtime. */
  lang?: string
  dir?: 'ltr' | 'rtl'
  description?: string
  categories?: readonly string[]
  /**
   * A stable identity. Without it the browser keys the installed app by
   * start_url, so moving the entry point (or switching between the loopback
   * port and a proxy port) silently forks a second installation.
   */
  id: string
  /** Orientation policy; `any` leaves rotation to the user, as the harness does. */
  orientation?: string
}

/** The serialized manifest document. */
export type ManifestDocument = Record<string, unknown>

/**
 * Build the manifest document.
 *
 * Ordering is stable (fixed key order, icons in input order) so repeated
 * requests produce byte-identical bodies and conditional caching stays honest.
 * @param input - every value the document carries.
 * @returns a JSON-serializable manifest.
 */
export function buildManifest(input: ManifestInput): ManifestDocument {
  const document: ManifestDocument = {
    id: input.id,
    name: input.name,
    short_name: input.shortName,
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.lang === undefined ? {} : { lang: input.lang }),
    ...(input.dir === undefined ? {} : { dir: input.dir }),
    start_url: input.startUrl,
    scope: input.scope,
    display: input.display,
    ...(input.displayOverride === undefined ? {} : { display_override: [...input.displayOverride] }),
    ...(input.orientation === undefined ? {} : { orientation: input.orientation }),
    background_color: input.backgroundColor,
    theme_color: input.themeColor,
    ...(input.categories === undefined ? {} : { categories: [...input.categories] }),
    icons: input.icons.map((icon) => ({
      src: icon.src,
      sizes: icon.sizes,
      type: icon.type,
      ...(icon.purpose === undefined ? {} : { purpose: icon.purpose }),
    })),
  }
  return document
}

/** One icon the plugin ships, and its declared size. */
export interface ShippedIcon {
  /** Path segment under the plugin's own route prefix. */
  file: string
  sizes: string
  type: string
  purpose: string
}

/**
 * The icons that make an install prompt appear on both platforms.
 *
 * A 192 and a 512 `any` icon satisfy Chromium's minimums; the maskable 512 is
 * what Android uses when it crops the launcher shape, and its artwork keeps the
 * mark inside the safe zone. These are byte-for-byte copies of the assets the
 * host UI already uses, so the installed app is visually the shipped app.
 */
export const SHIPPED_ICONS: readonly ShippedIcon[] = [
  { file: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { file: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { file: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
]

/** Apple's non-standard touch icon, linked from the document rather than the manifest. */
export const APPLE_TOUCH_ICON = 'apple-touch-icon.png'
