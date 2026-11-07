/**
 * Security headers — the one source of truth for the app's response policy.
 *
 * The production list is applied by three layers: this module feeds the Vite
 * dev/preview plugin (`vite.config.ts`), and `headerLines()` renders the exact
 * `Name: value` lines the nginx include mirrors in production. Keeping the
 * policy in a dependency-free module (no `three`, no DOM, no `node:` imports)
 * lets the Vite config import it while the config itself is being evaluated.
 *
 * Every source is `'self'` or same-device `blob:`: nothing leaves the device.
 * `object-src`, `base-uri`, `frame-ancestors` and `form-action` are `'none'`
 * because the toy never embeds, frames or submits anything.
 */

/** Directive names in their stable order — the nginx include mirrors this. */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "media-src 'self'",
  // GLTFLoader turns embedded GLB textures into object URLs and reads them
  // back through `fetch`, so `blob:` must be a connect source. A blob URL is
  // same-device memory; it cannot name or reach a network origin.
  "connect-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
] as const;

/** One line, `'; '` separated, sent verbatim as the policy header. */
export const CONTENT_SECURITY_POLICY: string = CSP_DIRECTIVES.join('; ');

/** The full header set, sent on every preview and production response. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

/**
 * Dev splits from production in exactly one directive. Vite's dev server
 * injects CSS as `<style>` elements (and rewrites them on HMR), which a strict
 * style source refuses; production and preview serve extracted stylesheets, so
 * they keep `style-src 'self'`. Everything else — including `connect-src` —
 * stays identical to production.
 */
const DEV_CSP_DIRECTIVES: readonly string[] = CSP_DIRECTIVES.map((directive) =>
  directive === "style-src 'self'" ? "style-src 'self' 'unsafe-inline'" : directive,
);

const DEV_CONTENT_SECURITY_POLICY: string = DEV_CSP_DIRECTIVES.join('; ');

/**
 * The header set for a server mode. `dev` is the only relaxation, for Vite's
 * injected styles; callers that serve built output must pass `dev: false`.
 */
export function securityHeadersFor(options: { dev: boolean }): Readonly<Record<string, string>> {
  if (!options.dev) {
    return SECURITY_HEADERS;
  }
  return {
    ...SECURITY_HEADERS,
    'Content-Security-Policy': DEV_CONTENT_SECURITY_POLICY,
  };
}

/**
 * Render the headers as `Name: value` lines sorted by header name, so the
 * nginx guard can compare sets instead of depending on declaration order.
 */
export function headerLines(): readonly string[] {
  return Object.entries(SECURITY_HEADERS)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}: ${value}`);
}
