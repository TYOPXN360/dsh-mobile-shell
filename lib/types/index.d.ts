import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildManifest } from './pwa/manifest.js';
/** Minimal structural slice of the host cordis Context this plugin reads. */
export interface HostContext {
    /** Register one disposable installer; its return value disposes on unload. */
    effect(install: () => unknown, label?: string): unknown;
    /** Read one optional service by name (undefined when the host omits it). */
    get(service: string): unknown;
    /** Run apply once the named services exist (cordis fiber inject). */
    inject(services: readonly string[], apply: (scoped: ScopedContext) => void): void;
    /** Host logger service face (warn-level is all this plugin uses). */
    logger: {
        warn(message: string): void;
    };
}
/** The web route registry surface this plugin uses. */
export interface WebServerFace {
    register(route: {
        kind: 'exact' | 'prefix';
        path: string;
        handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
    }): unknown;
}
/** Context shape inside the `webServer` inject scope. */
export interface ScopedContext extends HostContext {
    webServer: WebServerFace;
}
/**
 * Build the manifest document for one request.
 *
 * `start_url` and `scope` are absolute, and both are `/`: a phone that installs
 * the app through a reverse proxy on some other port or host must still land on
 * that surface's own root, and a relative value would resolve against the
 * manifest URL rather than the application root.
 * @returns the serializable manifest.
 */
export declare function manifestFor(): ReturnType<typeof buildManifest>;
/**
 * Plugin name, per the official minimal plugin shape (name + apply). The patch
 * row in cordis.patch.yml carries the same id.
 */
export declare const name = "dsh-mobile-shell";
/**
 * Register the PWA routes.
 *
 * Every route is registered inside the `webServer` inject scope and disposed
 * with the plugin fiber, so a reload leaves no stale handler behind.
 * @param ctx - host root context.
 */
export declare function apply(ctx: HostContext): void;
