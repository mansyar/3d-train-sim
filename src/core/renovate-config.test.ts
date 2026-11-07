import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Drift guard for the Renovate policy.
 *
 * Renovate only maintains what its config mentions: a direct dependency that
 * no rule matches is silently left out of every update batch, and a coupled
 * pair split across two groups ships a broken combination. Both are failures
 * that no other gate notices, so they are asserted here against the real
 * `package.json` rather than trusted to review.
 *
 * Resolution rule: a dependency belongs to the group of the **unique** rule
 * whose `matchPackageNames` contains it. Zero matches is a coverage failure;
 * two matches is an ambiguity failure.
 *
 * The repo root is resolved from this file, not `process.cwd()`, so the guard
 * works whatever directory Vitest is launched from.
 */
const ROOT_DIR = fileURLToPath(new URL('../..', import.meta.url));
const CONFIG_PATH = join(ROOT_DIR, 'renovate.json');
const MANIFEST_PATH = join(ROOT_DIR, 'package.json');

interface PackageRule {
  groupName?: string;
  matchPackageNames?: string[];
  matchUpdateTypes?: string[];
  automerge?: boolean;
}

interface RenovateConfig {
  extends?: string[];
  dependencyDashboard?: boolean;
  timezone?: string;
  schedule?: string[];
  minimumReleaseAge?: string;
  automerge?: boolean;
  packageRules?: PackageRule[];
}

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * The couplings the policy promises, pinned by group name so renaming a group
 * cannot silently split a pair. Extra members in a group are allowed; the
 * coverage test above is what stops a dependency escaping.
 */
const EXPECTED_GROUPS: Record<string, string[]> = {
  'three and its types': ['three', '@types/three'],
  'howler and its types': ['howler', '@types/howler'],
  'pwa tooling': ['vite-plugin-pwa', 'workbox-window'],
  'test tooling': ['vitest', '@vitest/coverage-v8', '@playwright/test'],
  'lint and types': ['@biomejs/biome', 'typescript', '@types/node'],
  'build tooling': ['vite'],
  'runtime data and fonts': ['idb', '@fontsource/baloo-2'],
};

function readJson<T>(path: string): T {
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}: it must exist at the repository root.`);
  }
  // `JSON.parse` is untyped; each caller's interface is the contract the tests
  // assert field by field below.
  return JSON.parse(readFileSync(path, 'utf8'));
}

function config(): RenovateConfig {
  return readJson<RenovateConfig>(CONFIG_PATH);
}

function packageRules(): PackageRule[] {
  return config().packageRules ?? [];
}

function directDependencies(): string[] {
  const manifest = readJson<PackageManifest>(MANIFEST_PATH);
  return Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).sort();
}

/** Group names of every rule that claims this dependency. */
function groupsMatching(dependency: string, rules: PackageRule[]): string[] {
  return rules
    .filter((rule) => rule.matchPackageNames?.includes(dependency) === true)
    .map((rule) => rule.groupName ?? '(rule without a groupName)');
}

describe('renovate.json', () => {
  it('declares the recommended preset, the dashboard, the weekly Sydney schedule and the soak', () => {
    const policy = config();

    expect(policy.extends, 'extend config:recommended').toContain('config:recommended');
    expect(policy.dependencyDashboard, 'dependencyDashboard is enabled').toBe(true);
    expect(policy.timezone, 'timezone is Australia/Sydney').toBe('Australia/Sydney');
    expect(policy.schedule, 'weekly, Monday before the working day').toEqual([
      'before 6am on monday',
    ]);
    expect(policy.minimumReleaseAge, 'three-day soak').toBe('3 days');
  });

  it('never automerges, at the top level or in any rule', () => {
    const policy = config();
    const automerged = (policy.packageRules ?? []).filter((rule) => rule.automerge === true);

    expect(policy.automerge, 'there is no automerge').not.toBe(true);
    expect(automerged.map((rule) => rule.groupName ?? '(rule without a groupName)')).toEqual([]);
  });

  it('keeps every grouped rule to minor and patch, so a major cannot ride along', () => {
    const offenders = (config().packageRules ?? [])
      .filter((rule) => rule.groupName !== undefined)
      .filter((rule) => {
        const types = [...(rule.matchUpdateTypes ?? [])].sort();
        return types.length !== 2 || types[0] !== 'minor' || types[1] !== 'patch';
      })
      .map((rule) => rule.groupName);

    expect(offenders, 'grouped rules must match exactly minor and patch').toEqual([]);
  });
});

describe('direct dependency coverage', () => {
  it('reads a real dependency list, so the guard cannot pass vacuously', () => {
    const dependencies = directDependencies();

    expect(dependencies.length).toBeGreaterThanOrEqual(15);
    expect(dependencies).toContain('three');
  });

  it('matches every direct dependency to exactly one group', () => {
    const rules = packageRules();
    const problems: string[] = [];

    for (const dependency of directDependencies()) {
      const groups = groupsMatching(dependency, rules);
      if (groups.length === 0) {
        problems.push(`${dependency}: no rule matches it — add it to a group in renovate.json.`);
      } else if (groups.length > 1) {
        problems.push(
          `${dependency}: ambiguous, matched by ${groups.map((group) => `"${group}"`).join(' and ')}.`,
        );
      }
    }

    expect(problems).toEqual([]);
  });

  it('keeps each coupled set on its own explicit group name', () => {
    const rules = packageRules();

    for (const [groupName, members] of Object.entries(EXPECTED_GROUPS)) {
      for (const member of members) {
        expect(groupsMatching(member, rules), `${member} must stay in "${groupName}"`).toEqual([
          groupName,
        ]);
      }
    }
  });
});
