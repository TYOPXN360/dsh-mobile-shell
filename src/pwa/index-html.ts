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

import { DEFAULT_VIEWPORT_WITH_COVER, viewportWithCover } from './viewport.js'

/** iOS's only "content behind the status bar" style. */
const APPLE_STATUS_BAR_STYLE = 'black-translucent'

/** Marks the page as a home-screen web app on pre-manifest iOS versions. */
const APPLE_CAPABLE = 'yes'

/** One `<meta>` tag found in the document. */
interface MetaTag {
  /** The complete tag text. */
  tag: string
  /** Offset of the tag in the source string. */
  index: number
}

/** Escape a value before writing it into a double-quoted attribute. */
function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
}

/**
 * Find the first `<meta name="...">` by name, case-insensitively.
 * @param html - document source.
 * @param name - meta name to match.
 * @returns the tag and its offset, or null.
 */
function findMeta(html: string, name: string): MetaTag | null {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const nameAttribute = /(?:^|\s)name\s*=\s*(["'])([\s\S]*?)\1/i.exec(match[0])
    if (nameAttribute !== null && nameAttribute[2]?.toLowerCase() === name.toLowerCase()) {
      return { tag: match[0], index: match.index ?? 0 }
    }
  }
  return null
}

/**
 * Read one quoted attribute from a tag.
 * @param tag - complete tag text.
 * @param name - attribute name.
 * @returns the value, or null when absent.
 */
function readAttribute(tag: string, name: string): string | null {
  const attribute = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i').exec(tag)
  return attribute?.[2] ?? null
}

/**
 * Set one quoted attribute, replacing its value or appending the attribute
 * before the tag's closing bracket. Other attributes and the original quote
 * style are preserved.
 * @param tag - complete tag text.
 * @param name - attribute name.
 * @param value - new value.
 * @returns the rewritten tag.
 */
function setAttribute(tag: string, name: string, value: string): string {
  const attribute = new RegExp(`(\\s)${name}\\s*=\\s*(["'])([\\s\\S]*?)\\2`, 'i')
  if (attribute.test(tag)) {
    return tag.replace(attribute, (_match, space, quote) =>
      `${space}${name}=${quote}${escapeAttribute(value)}${quote}`)
  }
  return tag.replace(/\s*\/?>$/, (end) =>
    ` ${name}="${escapeAttribute(value)}"${end.includes('/') ? ' />' : '>'}`)
}

/** Replace one source range. */
function replaceRange(source: string, index: number, length: number, replacement: string): string {
  return `${source.slice(0, index)}${replacement}${source.slice(index + length)}`
}

/**
 * Insert markup immediately after the opening `<head>` tag, keeping a leading
 * `<meta charset>` first so the encoding declaration stays inside the parser's
 * 1024-byte window. A fragment with no head receives the markup at the front,
 * which is where the parser would synthesize the head anyway.
 */
function insertAfterHead(html: string, markup: string): string {
  const head = /<head(?:\s[^>]*)?>/i.exec(html)
  if (head === null) return `${markup}${html}`
  const afterHead = head.index + head[0].length
  const rest = html.slice(afterHead)
  const charset = /^\s*<meta\b[^>]*\bcharset\s*=[^>]*>/i.exec(rest)
  if (charset !== null) {
    const at = afterHead + charset[0].length
    return `${html.slice(0, at)}${markup}${html.slice(at)}`
  }
  return `${html.slice(0, afterHead)}${markup}${html.slice(afterHead)}`
}

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
export function injectImmersiveIndex(html: string): string {
  let out = html
  const missing: string[] = []

  const viewport = findMeta(out, 'viewport')
  if (viewport === null) {
    missing.push(`<meta name="viewport" content="${DEFAULT_VIEWPORT_WITH_COVER}">`)
  } else {
    const content = readAttribute(viewport.tag, 'content')
    const next = content === null || content.trim() === ''
      ? DEFAULT_VIEWPORT_WITH_COVER
      : viewportWithCover(content)
    out = replaceRange(
      out,
      viewport.index,
      viewport.tag.length,
      setAttribute(viewport.tag, 'content', next),
    )
  }

  for (const [name, content] of [
    ['apple-mobile-web-app-status-bar-style', APPLE_STATUS_BAR_STYLE],
    ['apple-mobile-web-app-capable', APPLE_CAPABLE],
  ] as const) {
    const existing = findMeta(out, name)
    if (existing === null) {
      missing.push(`<meta name="${name}" content="${content}">`)
      continue
    }
    out = replaceRange(
      out,
      existing.index,
      existing.tag.length,
      setAttribute(existing.tag, 'content', content),
    )
  }

  return missing.length === 0 ? out : insertAfterHead(out, missing.join(''))
}
