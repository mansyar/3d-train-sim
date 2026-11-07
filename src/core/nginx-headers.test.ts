import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { headerLines, SECURITY_HEADERS } from './security-headers';

/**
 * Drift guard for the production half of the policy.
 *
 * `nginx-security-headers.conf` must mirror `SECURITY_HEADERS` exactly, and
 * `nginx.conf` must include it from the server block and from every location:
 * a location that declares its own `add_header` drops an inherited one, so a
 * missing include leaves one response class unprotected while every other
 * check stays green.
 *
 * `process.cwd()` is the repo root, where `pnpm test` runs.
 */
const NGINX_CONFIG_PATH = join(process.cwd(), 'nginx.conf');
const INCLUDE_PATH = join(process.cwd(), 'nginx-security-headers.conf');
const INCLUDE_DIRECTIVE = 'include /etc/nginx/conf.d/security-headers.conf;';

interface ParsedHeader {
  name: string;
  value: string;
  always: boolean;
}

interface LocationBlock {
  header: string;
  body: string;
  start: number;
  end: number;
}

function readText(path: string): string {
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path}: nginx starts only if the Dockerfile copies it next to the site config.`,
    );
  }
  return readFileSync(path, 'utf8');
}

/** Blank comments without moving offsets, so brace matching stays aligned. */
function withoutComments(source: string): string {
  return source.replace(/^[ \t]*#.*$/gm, (line) => ' '.repeat(line.length));
}

/** Body of the block whose opening brace is at `openBrace`, plus its end offset. */
function blockAt(source: string, openBrace: number): { body: string; end: number } {
  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    const character = source.charAt(index);
    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return { body: source.slice(openBrace + 1, index), end: index + 1 };
      }
    }
  }
  throw new Error('Unbalanced braces in nginx.conf');
}

function locationBlocks(source: string): LocationBlock[] {
  const masked = withoutComments(source);
  const blocks: LocationBlock[] = [];
  for (const match of masked.matchAll(/location\b[^;{\n]*\{/g)) {
    const header = match[0];
    const start = match.index ?? 0;
    const found = blockAt(masked, start + header.length - 1);
    blocks.push({
      header: header.replace(/\{$/, '').trim(),
      body: found.body,
      start,
      end: found.end,
    });
  }
  return blocks;
}

/** The server block with every location block removed. */
function serverBody(source: string): string {
  const masked = withoutComments(source);
  let cursor = 0;
  let remainder = '';
  for (const block of locationBlocks(source)) {
    remainder += masked.slice(cursor, block.start);
    cursor = block.end;
  }
  return remainder + masked.slice(cursor);
}

function parseAddHeaders(source: string): ParsedHeader[] {
  const headers: ParsedHeader[] = [];
  const pattern = /^\s*add_header\s+(\S+)\s+"([^"]*)"(?:\s+([^;\s]+))?\s*;\s*$/gm;
  for (const match of withoutComments(source).matchAll(pattern)) {
    const [, name = '', value = '', flag = ''] = match;
    headers.push({ name, value, always: flag === 'always' });
  }
  return headers;
}

describe('nginx-security-headers.conf', () => {
  it('exists where the Dockerfile copies it from', () => {
    expect(existsSync(INCLUDE_PATH), `Missing ${INCLUDE_PATH}`).toBe(true);
  });

  it('declares exactly the headers from the TypeScript source', () => {
    const parsed = parseAddHeaders(readText(INCLUDE_PATH));
    const declared = Object.fromEntries(parsed.map(({ name, value }) => [name, value]));

    expect(declared).toEqual(SECURITY_HEADERS);
  });

  it('carries every line `headerLines()` renders', () => {
    const declared = Object.fromEntries(
      parseAddHeaders(readText(INCLUDE_PATH)).map(({ name, value }) => [name, value]),
    );

    for (const line of headerLines()) {
      const separator = line.indexOf(': ');
      const name = line.slice(0, separator);

      // The doc contract is that nginx mirrors the rendered lines, so compare
      // the rendered value, not just "a header with that name exists".
      expect(declared[name], line).toBe(line.slice(separator + 2));
    }
  });

  it('parses every add_header line, so a malformed line cannot hide', () => {
    const parsed = parseAddHeaders(readText(INCLUDE_PATH));
    const mentions = withoutComments(readText(INCLUDE_PATH)).match(/^\s*add_header\b/gm) ?? [];

    expect(parsed).toHaveLength(mentions.length);
    expect(parsed).toHaveLength(Object.keys(SECURITY_HEADERS).length);
  });

  it('marks every header `always`, so error responses carry them too', () => {
    const notAlways = parseAddHeaders(readText(INCLUDE_PATH)).filter((header) => !header.always);

    expect(notAlways.map((header) => header.name)).toEqual([]);
  });
});

describe('nginx.conf', () => {
  it('includes the policy from the server block', () => {
    expect(serverBody(readText(NGINX_CONFIG_PATH))).toContain(INCLUDE_DIRECTIVE);
  });

  it('includes the policy from every location block', () => {
    const locations = locationBlocks(readText(NGINX_CONFIG_PATH));
    const missing = locations
      .filter((location) => !location.body.includes(INCLUDE_DIRECTIVE))
      .map((location) => location.header);

    expect(missing).toEqual([]);
    // Exact matches, both regex matches and the fallback all set Cache-Control.
    expect(locations.length).toBeGreaterThanOrEqual(6);
  });

  it('declares at least six include directives', () => {
    const includes = [...withoutComments(readText(NGINX_CONFIG_PATH)).matchAll(/^\s*include\b/gm)];

    expect(includes.length).toBeGreaterThanOrEqual(6);
  });
});
