/**
 * Dependency-override guard: a forced version must keep the shape its consumer
 * expects.
 *
 * `pnpm-workspace.yaml` uses `overrides` to close advisories the parent package
 * still pins. A range is applied to whatever is installed, not to what is
 * compatible, so a tree-wide `brace-expansion: ">=5"` resolves safely-looking
 * versions everywhere and breaks `minimatch@5` at runtime: minimatch@5
 * `require`s the module and calls the result, while `brace-expansion@5` only
 * exports a named `expand`. The failure is dormant because minimatch
 * short-circuits patterns without braces, so a green build proves nothing.
 *
 * This test asks the installed tree directly: for every `minimatch` under
 * `node_modules/.pnpm`, the `brace-expansion` it resolves must be callable in
 * the way that major calls it.
 */

import { globSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = fileURLToPath(new URL('../..', import.meta.url));
const PNPM_DIR = join(ROOT_DIR, 'node_modules', '.pnpm');

interface InstalledMinimatch {
  version: string;
  entry: string;
}

function installedMinimatch(): InstalledMinimatch[] {
  return globSync('minimatch@*/node_modules/minimatch/package.json', {
    cwd: PNPM_DIR,
  })
    .map((relative) => join(PNPM_DIR, relative))
    .map((manifest) => ({
      version: JSON.parse(readFileSync(manifest, 'utf8')).version as string,
      entry: join(manifest, '..', 'minimatch.js'),
    }));
}

function majorOf(version: string): number {
  return Number.parseInt(version.split('.')[0] ?? '0', 10);
}

describe('dependency overrides', () => {
  it('finds the installed minimatch copies, so the guard cannot pass vacuously', () => {
    expect(installedMinimatch().length).toBeGreaterThan(0);
  });

  it('leaves fewer than six majors unable to call their brace-expansion', () => {
    const offenders: string[] = [];

    for (const minimatch of installedMinimatch()) {
      if (majorOf(minimatch.version) >= 6) continue;

      const require_ = createRequire(minimatch.entry);
      const expansion: unknown = require_('brace-expansion');

      if (typeof expansion !== 'function') {
        offenders.push(
          `minimatch@${minimatch.version} resolves brace-expansion as ${typeof expansion}; ` +
            'it requires the callable 2.x shape — scope the override to a major below 3.',
        );
        continue;
      }

      // The shape is right, so the call should work: `{a,b}.js` matches `a.js`.
      const matches = require_('minimatch') as (file: string, pattern: string) => boolean;
      try {
        if (matches('a.js', '{a,b}.js') !== true) {
          offenders.push(`minimatch@${minimatch.version} failed to expand a brace pattern.`);
        }
      } catch (error) {
        offenders.push(
          `minimatch@${minimatch.version} threw on a brace pattern: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    expect(offenders).toEqual([]);
  });
});
