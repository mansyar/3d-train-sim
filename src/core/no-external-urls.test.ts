import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Privacy guard: shipped sources must not contain an `http://` or `https://`
 * literal. Nothing leaves the device, and a URL literal is the first step
 * towards a request that does.
 *
 * Test files are skipped on purpose — this file needs to name the pattern, and
 * other tests may describe undo/redo routes.
 */
const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));
const URL_PATTERN = /https?:\/\//;

function shippedSources(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...shippedSources(path));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(path);
    }
  }
  return files;
}

function externalUrlOffenders(): string[] {
  const offenders: string[] = [];
  for (const file of shippedSources(SRC_DIR)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (const [index, line] of lines.entries()) {
      if (URL_PATTERN.test(line)) {
        offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    }
  }
  return offenders;
}

describe('shipped sources', () => {
  it('are actually found, so the guard cannot pass vacuously', () => {
    const files = shippedSources(SRC_DIR).map((file) => file.replaceAll('\\', '/'));
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((file) => file.endsWith('/src/main.ts'))).toBe(true);
  });

  it('contain no http:// or https:// literal', () => {
    const offenders = externalUrlOffenders();
    expect(
      offenders,
      `Nothing leaves the device, so shipped sources must not name a remote origin.\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
