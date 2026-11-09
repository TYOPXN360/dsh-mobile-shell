/**
 * PWA manifest — pure builder, no I/O.
 *
 * Kept separate from the host half so the same document can be asserted by
 * tests and served through any transport (the host's own webServer, or a
 * reverse proxy in front of it). Nothing here reads config files or the
 * filesystem: every value arrives as an argument.
 */
/**
 * Build the manifest document.
 *
 * Ordering is stable (fixed key order, icons in input order) so repeated
 * requests produce byte-identical bodies and conditional caching stays honest.
 * @param input - every value the document carries.
 * @returns a JSON-serializable manifest.
 */
export function buildManifest(input) {
    const document = {
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
    };
    return document;
}
/**
 * The icons that make an install prompt appear on both platforms.
 *
 * A 192 and a 512 `any` icon satisfy Chromium's minimums; the maskable 512 is
 * what Android uses when it crops the launcher shape, and its artwork keeps the
 * mark inside the safe zone. These are byte-for-byte copies of the assets the
 * host UI already uses, so the installed app is visually the shipped app.
 */
export const SHIPPED_ICONS = [
    { file: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { file: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { file: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];
/** Apple's non-standard touch icon, linked from the document rather than the manifest. */
export const APPLE_TOUCH_ICON = 'apple-touch-icon.png';
