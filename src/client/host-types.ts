/**
 * Structural host faces.
 *
 * The plugin talks to the client runtime through a handful of services, and the
 * shape it needs is small and stable: register a slot entry, drive the sidebar
 * toggle, translate a key, register a disposable. Declaring those faces here
 * (instead of importing the host's own augmented types) has two consequences,
 * both intended:
 *
 * - the plugin type-checks against the CONTRACT it actually uses, so a host
 *   build whose type bundle is incomplete or a different rc line still checks;
 * - every assumption about the host is written down in one place, so a host
 *   upgrade that changes a signature fails here rather than at runtime.
 *
 * The runtime shapes below were read off the shipped host bundles: a slot
 * registration is `{ name, id?, order?, locale?, inject? }` plus a component,
 * and the component receives the resolved `inject` share plus, when `locale` is
 * declared, a `t` translate seat.
 */

/** One disposable teardown, as returned by every registration. */
export type Disposable = () => void

/** Translate seat for one dictionary namespace. */
export type Translate = (key: string) => string

/** Options accepted by `ctx.slots.register`. */
export interface SlotRegisterOptions {
  /** The seat being claimed. */
  name: string
  /** Stable entry id, required for list seats and used for diagnostics. */
  id?: string
  /** Position within a list seat (ascending). */
  order?: number
  /** Dictionary namespace the component translates through. */
  locale?: string
  /** Bound inject face: its return value is merged into the component props. */
  inject?: () => object
}

/** The slot registry face. */
export interface SlotsFace {
  /** Run `install` once the named seat is declared; returns the teardown. */
  inject(name: string, install: () => Disposable): Disposable
  /** Claim a seat. */
  register(options: SlotRegisterOptions, component: unknown): Disposable
}

/** The layout service face this plugin uses. */
export interface LayoutFace {
  /**
   * Toggle the sidebar. Below the shell's auto-collapse width this flips the
   * narrow-mode expansion flag, which mounts the real sidebar subtree.
   */
  toggleSidebar(): void
}

/** The locale service face this plugin uses. */
export interface LocaleFace {
  /** Register one dictionary set. */
  register(namespace: string, dictionaries: Record<string, Record<string, string>>): Disposable
}

/** The client root context, as far as this plugin is concerned. */
export interface ClientContext {
  /** Register one disposable installer; its return value disposes on unload. */
  effect(install: () => Disposable | undefined, label?: string): Disposable
  /** Read one optional service (undefined when the host omits it). */
  get(service: string): unknown
  slots: SlotsFace
  layout: LayoutFace
  locale: LocaleFace
}

/** Props the framework hands a registered component: inject share plus locale. */
export type SlotProps<TInjected> = TInjected & {
  /** Present whenever the registration declared `locale`. */
  t: Translate
}
