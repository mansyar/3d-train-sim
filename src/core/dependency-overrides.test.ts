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
 * This test asks the installed tree directly. Each minimatch major has a known
 * shape, and an unseen major fails loudly rather than being skipped, because a
 * guard that skips is the same guard that was missing when this went wrong.
 */
import { globSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = fileURLToPath(new URL('../..', import.meta.url));
const PNPM_DIR = join(ROOT_DIR, 'node_modules', '.pnpm');

/**
 * How each minimatch major consumes `brace-expansion`.
 * - `callable`: `require('brace-expansion')` must be the function itself (2.x line).
 * - `namespace`: the module must expose `expand` as a named export (5.x line).
 */
const SHAPE_BY_MAJOR: Record<number, 'callable' | 'namespace'> = {
  5: 'callable',
  9: 'callable',
  10: 'namespace',
};

interface InstalledMinimatch {
  version: string;
  entry: string;
}

interface Checked {
  version: string;
  shape: 'callable' | 'namespace';
}

function installedMinimatch(): InstalledMinimatch[] {
  return globSync('minimatch@*/node_modules/minimatch/package.json', { cwd: PNPM_DIR })
    .map((relative) => join(PNPM_DIR, relative))
    .map((manifest) => ({
      version: JSON.parse(readFileSync(manifest, 'utf8')).version as string,
      entry: join(manifest, '..', 'minimatch.js'),
    }));
}

function majorOf(version: string): number {
  return Number.parseInt(version.split('.')[0] ?? '0', 10);
}

/**
 * The overrides block from `pnpm-workspace.yaml`: `key` is either a bare package
 * name or `<consumer>@<major>><target>`. pnpm 11 ignores `pnpm.overrides` in
 * `package.json`, so this file is the only place a range can be set.
 */
function workspaceOverrides(): { selector: string; target: string }[] {
  const text = readFileSync(join(ROOT_DIR, 'pnpm-workspace.yaml'), 'utf8');
  const lines = text.split('\n');
  const start = lines.findIndex((line) => /^overrides:\s*$/.test(line));
  if (start === -1) return [];

  const entries: { selector: string; target: string }[] = [];
  for (const line of lines.slice(start + 1)) {
    // The block ends at the next top-level key.
    if (/^\S/.test(line) && !line.startsWith('#')) break;
    const match = /^\s+"?([^"#]+?)"?\s*:\s*"?[^"#]+"?\s*(?:#.*)?$/.exec(line);
    if (match?.[1] === undefined) continue;

    const selector = match[1].trim();
    const target = (selector.split('>').pop() ?? '').trim();
    if (target !== '') entries.push({ selector, target });
  }

  return entries;
}

/** Directory names in the pnpm virtual store, with `+` decoded back to `/`. */
function installedStoreEntries(): string[] {
  return readdirSync(PNPM_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name.replace(/^@([^+]+)\+/, '@$1/'));
}

/** Majors of a package that the store actually holds. */
function installedMajors(name: string): number[] {
  return installedStoreEntries()
    .filter((entry) => entry.startsWith(`${name}@`))
    .map((entry) => majorOf(entry.slice(name.length + 1)));
}

const CONSUMER_SELECTOR = /^(@?[^@]+)@(\d+)$/;

describe('dependency overrides', () => {
  it('checks every installed minimatch copy, so the guard cannot pass vacuously', () => {
    const copies = installedMinimatch();

    expect(copies.length).toBeGreaterThan(0);
    for (const copy of copies) {
      expect(
        SHAPE_BY_MAJOR[majorOf(copy.version)],
        `minimatch@${copy.version}: teach this test which brace-expansion shape it calls`,
      ).toBeDefined();
    }
  });

  it('keeps each brace-expansion the shape its minimatch major calls', () => {
    const problems: string[] = [];
    const checked: Checked[] = [];

    for (const copy of installedMinimatch()) {
      const major = majorOf(copy.version);
      const shape = SHAPE_BY_MAJOR[major];
      if (shape === undefined) {
        problems.push(`minimatch@${copy.version}: unknown major, add its shape to SHAPE_BY_MAJOR.`);
        continue;
      }

      const require_ = createRequire(copy.entry);
      const expansion: unknown = require_('brace-expansion');
      checked.push({ version: copy.version, shape });

      if (shape === 'callable') {
        if (typeof expansion !== 'function') {
          problems.push(
            `minimatch@${copy.version} resolves brace-expansion as ${typeof expansion}; ` +
              'it requires the callable 2.x shape — scope the override below 3.',
          );
          continue;
        }
        const matches = require_('minimatch') as (file: string, pattern: string) => boolean;
        try {
          if (matches('a.js', '{a,b}.js') !== true) {
            problems.push(`minimatch@${copy.version} failed to expand a brace pattern.`);
          }
        } catch (error) {
          problems.push(
            `minimatch@${copy.version} threw on a brace pattern: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      } else {
        const expand = (expansion as { expand?: unknown }).expand;
        if (typeof expand !== 'function') {
          problems.push(
            `minimatch@${copy.version} requires the namespace shape, but brace-expansion exposes ` +
              `expand as ${typeof expand}.`,
          );
        }
      }
    }

    expect(checked.length, 'every copy must actually be examined').toBe(
      installedMinimatch().length,
    );
    expect(problems).toEqual([]);
  });

  it('binds every override to a package the store actually holds', () => {
    const overrides = workspaceOverrides();

    expect(
      overrides.length,
      'the overrides block must parse, or this test proves nothing',
    ).toBeGreaterThan(0);

    const dead = overrides
      .filter(({ selector, target }) => {
        // `minimatch@5>brace-expansion` names a consumer major and a target.
        const consumer = selector.includes('>') ? selector.split('>')[0]?.trim() : undefined;
        const consumerMatch = consumer === undefined ? null : CONSUMER_SELECTOR.exec(consumer);

        const targetMissing = installedMajors(target).length === 0;
        const consumerMissing =
          consumerMatch !== null &&
          !installedMajors(consumerMatch[1] as string).includes(Number(consumerMatch[2]));

        return targetMissing || consumerMissing;
      })
      .map(({ selector }) => selector);

    expect(
      dead,
      'a selector that matches nothing is a silent no-op — it closes no advisory and guards nothing',
    ).toEqual([]);
  });
});
