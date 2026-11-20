/**
 * Served-index transform for the immersive PWA chrome.
 *
 * The browser half can add `viewport-fit=cover` after the app boots, but by then
 * the phone has already laid out the page once. This transform runs inside the
 * host's `renderIndex`, before the HTML leaves the server, so the very first
 * layout already has the safe-area contract. It also supplies the iOS
 * `black-translucent` status-bar meta, which WebKit expects in the document at
 * parse time rather than in a later DOM mutation.
 *
 * The transform is deliberately narrow and idempotent: it edits the viewport
 * meta's `content`, updates the Apple status-bar meta, and inserts either one
 * when the document is missing it. It never rewrites scripts, links, or the
 * body, and running it twice produces the same document.
 */
/**
 * Apply the immersive document metadata to one served index.
 *
 * Only three tags are touched:
 * - the viewport gets `viewport-fit=cover` while keeping every other directive;
 * - `apple-mobile-web-app-status-bar-style` becomes `black-translucent`;
 * - `apple-mobile-web-app-capable` becomes `yes` so iOS launches the page as a
 *   standalone web app even before it consults the manifest.
 *
 * Android's transparent status-bar colour is the manifest's `theme_color`, not
 * a meta tag: a static transparent meta here would also tint normal browser
 * tabs, which is not what the installed-app mode should change.
 * @param html - raw index.html body.
 * @returns the transformed document.
 */
export declare function injectImmersiveIndex(html: string): string;
