/**
 * Viewport declaration helpers shared by the served index and the browser half.
 *
 * `viewport-fit=cover` is the switch that lets the layout viewport reach the
 * system bars. It must be present in the HTML the phone parses, not only in the
 * DOM after the app boots, or the first layout has already been decided without
 * the safe-area insets. The host-side index transform therefore uses the same
 * function as the browser fallback, so the two can never disagree.
 */

/** The directive that unlocks `env(safe-area-inset-*)`. */
export const VIEWPORT_FIT_COVER = 'viewport-fit=cover'

/** The host's baseline declaration, for pages that shipped without one. */
export const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1'

/** Baseline plus cover, used when a document has no viewport meta at all. */
export const DEFAULT_VIEWPORT_WITH_COVER = `${DEFAULT_VIEWPORT}, ${VIEWPORT_FIT_COVER}`

/**
 * Return a viewport declaration with `viewport-fit=cover`, preserving every
 * other directive (width, initial-scale, user-scalable, …).
 *
 * An existing `viewport-fit` value is replaced rather than duplicated: when a
 * declaration appears twice the last value silently wins, which is exactly the
 * kind of failure that only shows up on one phone model.
 * @param content - the current viewport `content` attribute.
 * @returns the declaration to write.
 */
export function viewportWithCover(content: string): string {
  const directives = content
    .split(',')
    .map((directive) => directive.trim())
    .filter((directive) => directive.length > 0)

  if (directives.some((directive) => /^viewport-fit\s*=\s*cover$/i.test(directive))) {
    return content
  }

  const withoutFit = directives.filter((directive) => !/^viewport-fit\s*=/i.test(directive))
  return [...withoutFit, VIEWPORT_FIT_COVER].join(', ')
}
