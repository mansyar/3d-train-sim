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
  enabled?: boolean;
  /** Renovate accepts `true` or a string such as `"patch"`; both mean automerge. */
  automerge?: boolean | string;
  platformAutomerge?: boolean;
}

interface RenovateConfig {
  extends?: string[];
  dependencyDashboard?: boolean;
  timezone?: string;
  schedule?: string[];
  minimumReleaseAge?: string;
  automerge?: boolean | string;
  platformAutomerge?: boolean;
  packageRules?: PackageRule[];
}

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
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
  return Object.keys({
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.optionalDependencies,
    ...manifest.peerDependencies,
  }).sort();
}

/**
 * Group names of every rule that can actually deliver a grouped update for this
 * dependency. A rule without a `groupName`, one that is disabled, or one that
 * only matches majors cannot keep a dependency maintained, so it does not count
 * as coverage — otherwise the coverage test could report "covered" for a
 * dependency Renovate never touches.
 */
function groupsMatching(dependency: string, rules: PackageRule[]): string[] {
  return rules
    .filter((rule) => rule.matchPackageNames?.includes(dependency) === true)
    .filter((rule) => rule.groupName !== undefined && rule.enabled !== false)
    .filter((rule) => {
      const types = rule.matchUpdateTypes;
      if (types === undefined) return true;
      return types.includes('minor') || types.includes('patch');
    })
    .map((rule) => rule.groupName as string);
}

/**
 * Everything in a policy that turns automerge on. Renovate accepts `true` or a
 * string such as `"patch"`, and its platform toggle defaults to **true**, so the
 * only safe assertions are "the key is exactly false" at the top level and "no
 * rule names it at all" below. An explicit `false` in a rule is not an offender.
 */
function automergeOffenders(policy: RenovateConfig): string[] {
  const offenders: string[] = [];

  if (policy.automerge !== false) {
    offenders.push(`the top-level automerge setting is ${JSON.stringify(policy.automerge)}`);
  }
  if (policy.platformAutomerge !== false) {
    offenders.push(
      `the platform toggle is ${policy.platformAutomerge === true ? 'on' : 'unset (defaults to on)'}`,
    );
  }

  for (const rule of policy.packageRules ?? []) {
    const name = rule.groupName ?? '(rule without a groupName)';
    if (rule.automerge !== undefined && rule.automerge !== false) offenders.push(name);
    if (rule.platformAutomerge === true) offenders.push(name);
  }

  return offenders;
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
    expect(automergeOffenders(config())).toEqual([]);
  });

  it('catches the shapes Renovate accepts besides a bare `true`', () => {
    const base = config();

    // A string means "automerge updates of this type"; an explicit `false` is not
    // an offender. Renovate's platform toggle defaults to true when omitted, which
    // is why the shipped config sets it to `false` rather than leaving it out.
    const offenders = automergeOffenders({
      ...base,
      automerge: 'patch',
      platformAutomerge: true,
      packageRules: [
        { groupName: 'string', matchPackageNames: ['three'], automerge: 'minor' },
        { groupName: 'platform', matchPackageNames: ['howler'], platformAutomerge: true },
        { groupName: 'explicitly off', matchPackageNames: ['idb'], automerge: false },
      ],
    });

    expect(offenders).toEqual([
      'the top-level automerge setting is "patch"',
      'the platform toggle is on',
      'string',
      'platform',
    ]);
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

    expect(dependencies.length).toBeGreaterThanOrEqual(10);
    expect(dependencies).toContain('three');
  });

  it('does not count a rule that could never deliver a grouped update', () => {
    const dependency = 'three';
    const useless: PackageRule[] = [
      { matchPackageNames: [dependency] },
      { groupName: 'disabled', matchPackageNames: [dependency], enabled: false },
      { groupName: 'majors only', matchPackageNames: [dependency], matchUpdateTypes: ['major'] },
    ];

    expect(groupsMatching(dependency, useless)).toEqual([]);
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
