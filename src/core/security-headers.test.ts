import { describe, expect, it } from 'vitest';

import {
  CONTENT_SECURITY_POLICY,
  headerLines,
  SECURITY_HEADERS,
  securityHeadersFor,
} from './security-headers';

/**
 * The production policy, in the shipped order. `connect-src` carries `blob:`
 * because GLTFLoader reads embedded textures back through object URLs; that is
 * same-device memory, not a network source.
 */
const EXPECTED_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "media-src 'self'",
  "connect-src 'self' blob:",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
];

const DIRECTIVE_NAMES = [
  'default-src',
  'script-src',
  'style-src',
  'img-src',
  'font-src',
  'media-src',
  'connect-src',
  'worker-src',
  'manifest-src',
  'object-src',
  'base-uri',
  'frame-ancestors',
  'form-action',
];

describe('CONTENT_SECURITY_POLICY', () => {
  it('is the exact directive list the nginx include must mirror', () => {
    expect(CONTENT_SECURITY_POLICY).toBe(EXPECTED_DIRECTIVES.join('; '));
  });

  it.each(DIRECTIVE_NAMES)('declares %s', (name) => {
    expect(CONTENT_SECURITY_POLICY).toContain(`${name} `);
  });

  it('declares all thirteen directives exactly once', () => {
    const directives = CONTENT_SECURITY_POLICY.split('; ');
    expect(directives).toHaveLength(13);
    expect(directives).toEqual(EXPECTED_DIRECTIVES);
  });

  it.each(['unsafe-inline', 'unsafe-eval', 'unsafe-hashes', '*'])(
    'never contains the unsafe token %s',
    (token) => {
      expect(CONTENT_SECURITY_POLICY).not.toContain(token);
    },
  );

  it("never mixes 'none' with a source in the same directive", () => {
    for (const directive of CONTENT_SECURITY_POLICY.split('; ')) {
      const tokens = directive.split(' ');
      if (tokens.includes("'none'")) {
        // A host smuggled beside 'none' would be ignored by browsers but still
        // reads like a permitted source, so refuse the shape outright.
        expect(tokens).toHaveLength(2);
      }
    }
  });
});

/** The dev policy, narrowed once for the structural assertions below. */
function devContentSecurityPolicy(): string {
  const policy = securityHeadersFor({ dev: true })['Content-Security-Policy'];
  if (policy === undefined) {
    throw new Error('the dev header set must carry a Content-Security-Policy');
  }
  return policy;
}

describe('securityHeadersFor', () => {
  it('returns the strict production set when dev is false', () => {
    expect(securityHeadersFor({ dev: false })).toEqual(SECURITY_HEADERS);
  });

  it("relaxes style-src to allow 'unsafe-inline' in dev only", () => {
    const production = CONTENT_SECURITY_POLICY.split('; ');
    const dev = devContentSecurityPolicy().split('; ');

    expect(dev).toHaveLength(production.length);
    // Exactly one directive differs, and it is the style source: Vite serves
    // CSS through a <style> element that the strict policy refuses.
    expect(dev.filter((directive, index) => directive !== production[index])).toEqual([
      "style-src 'self' 'unsafe-inline'",
    ]);
  });

  it("keeps the dev connect-src at 'self' blob: with no host", () => {
    const connectSrc = devContentSecurityPolicy()
      .split('; ')
      .find((directive) => directive.startsWith('connect-src '));

    expect(connectSrc).toBe("connect-src 'self' blob:");
    expect(connectSrc?.endsWith('blob:')).toBe(true);
  });

  it('sends nosniff and no-referrer on the dev variant too', () => {
    const dev = securityHeadersFor({ dev: true });

    expect(dev['X-Content-Type-Options']).toBe('nosniff');
    expect(dev['Referrer-Policy']).toBe('no-referrer');
  });
});

describe('SECURITY_HEADERS', () => {
  it('is exactly the policy plus nosniff and no-referrer', () => {
    expect(Object.keys(SECURITY_HEADERS).sort()).toEqual([
      'Content-Security-Policy',
      'Referrer-Policy',
      'X-Content-Type-Options',
    ]);
    expect(SECURITY_HEADERS['Content-Security-Policy']).toBe(CONTENT_SECURITY_POLICY);
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('no-referrer');
  });
});

describe('headerLines', () => {
  it('renders Name: value lines, sorted by header name and stable across calls', () => {
    const lines = headerLines();

    expect(lines).toEqual([
      `Content-Security-Policy: ${CONTENT_SECURITY_POLICY}`,
      'Referrer-Policy: no-referrer',
      'X-Content-Type-Options: nosniff',
    ]);
    expect(headerLines()).toEqual(lines);
  });
});
