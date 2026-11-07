# Phase 1 Evidence — Renovate policy and its coverage guard

- **Track:** `deps-guardrails_20261107`
- **Phase:** 1
- **Date:** 2026-11-07
- **Branch:** `chore/deps-guardrails_20261107`
- **Base:** `69f31f192275672c2a3a3888cb2a76be3d559091`
- **Head:** `52da794` (test `5c615d0`, config `82627c1`, format `52da794`)
- **Result:** verified (guard green; NFR-4 validator not run — see [Validator](#validator))

## Config as shipped

`renovate.json` at the repository root:

```json
{
  "extends": ["config:recommended"],
  "dependencyDashboard": true,
  "timezone": "Australia/Sydney",
  "schedule": ["before 6am on monday"],
  "minimumReleaseAge": "3 days",
  "rebaseWhen": "conflicted",
  "automerge": false,
  "separateMajorMinor": true,
  "packageRules": [
    {
      "groupName": "three and its types",
      "matchPackageNames": ["three", "@types/three"],
      "matchUpdateTypes": ["minor", "patch"]
    },
    {
      "groupName": "howler and its types",
      "matchPackageNames": ["howler", "@types/howler"],
      "matchUpdateTypes": ["minor", "patch"]
    },
    {
      "groupName": "pwa tooling",
      "matchPackageNames": ["vite-plugin-pwa", "workbox-window"],
      "matchUpdateTypes": ["minor", "patch"]
    },
    {
      "groupName": "test tooling",
      "matchPackageNames": ["vitest", "@vitest/coverage-v8", "@playwright/test"],
      "matchUpdateTypes": ["minor", "patch"]
    },
    {
      "groupName": "lint and types",
      "matchPackageNames": ["@biomejs/biome", "typescript", "@types/node"],
      "matchUpdateTypes": ["minor", "patch"]
    },
    {
      "groupName": "build tooling",
      "matchPackageNames": ["vite"],
      "matchUpdateTypes": ["minor", "patch"]
    },
    {
      "groupName": "runtime data and fonts",
      "matchPackageNames": ["idb", "@fontsource/baloo-2"],
      "matchUpdateTypes": ["minor", "patch"]
    }
  ]
}
```

No `$schema` key: it would be the repository's only `https://` literal and
nothing fetches it (the privacy guard in `no-external-urls.test.ts` only scans
shipped sources, but the rule of the house still applies).

### Why each group exists

| Group | Why it is a group |
|---|---|
| `three and its types` | `@types/three` tracks `three`'s own minor line; updating one without the other produces type errors against the same API. |
| `howler and its types` | Same coupling for `howler`'s hand-maintained declarations. |
| `pwa tooling` | `vite-plugin-pwa` (Workbox `generateSW`) and `workbox-window` meet at the generated service worker; the `virtual:pwa-register` module imports `workbox-window`, so their versions must be reviewed together. |
| `test tooling` | `vitest` and `@vitest/coverage-v8` must match majors/minors; `@playwright/test` is the other runner and shares the weekly batch so one PR carries the test harness changes. |
| `lint and types` | `typescript` and `@biomejs/biome` parser/syntax support move together, and `@types/node` follows the Node 24 runtime they both target. |
| `build tooling` | `vite` is the single build tool; a one-package group keeps it visible in the dashboard. |
| `runtime data and fonts` | The remaining runtime dependencies (`idb`, the bundled Baloo 2 font) move rarely and are small enough for one reviewable PR. |

Every rule carries `"matchUpdateTypes": ["minor", "patch"]`; a major matches no
rule, lands in its own PR because `separateMajorMinor` is `true`, and is never
automerged.

## Test-first: red, then green

### Red — before `renovate.json` existed

```bash
pnpm test src/core/renovate-config.test.ts
# Exited with code 1
```

```text
 ❯ src/core/renovate-config.test.ts (6 tests | 5 failed) 27ms
     × declares the recommended preset, the dashboard, the weekly Sydney schedule and the soak
     × never automerges, at the top level or in any rule
     × keeps every grouped rule to minor and patch, so a major cannot ride along
     × matches every direct dependency to exactly one group
     × keeps each coupled set on its own explicit group name

Test Files  1 failed (1)
     Tests  5 failed | 1 passed (6)
```

Each of the five failures was:

```text
Error: Missing D:\Projects\3d-train-sim\renovate.json: it must exist at the repository root.
 ❯ readJson src/core/renovate-config.test.ts:65:11
```

The one passing test was the anti-vacuity test: it reads the real
`package.json` (15+ direct dependencies, including `three`), so it can pass
before the policy exists and cannot pass on an empty list.

### Green — after `renovate.json` was written

```bash
pnpm test src/core/renovate-config.test.ts
# Exited with code 0
```

```text
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

## Guard-bites demonstration (AC-3)

A temporary `devDependencies` entry, `"left-pad": "^1.3.0"`, matched by no rule:

```bash
pnpm test src/core/renovate-config.test.ts
# Exited with code 1
```

```text
 FAIL  src/core/renovate-config.test.ts > direct dependency coverage > matches every direct dependency to exactly one group
AssertionError: expected [ Array(1) ] to deeply equal []

- []
+ [
+   "left-pad: no rule matches it — add it to a group in renovate.json.",
+ ]

 Test Files  1 failed (1)
      Tests  1 failed | 5 passed (6)
```

The entry was removed and the tree returned to its committed state. The test
went green again:

```bash
pnpm test src/core/renovate-config.test.ts
# Exited with code 0
```

```text
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

Note: adding the entry made `pnpm test`'s implicit install resolve `left-pad`
and rewrite `pnpm-lock.yaml`. After the entry was removed, `pnpm install`
pruned it and `git status --short` reported no changes — the lockfile is
byte-identical to `HEAD`, and `package.json` was never committed.

## Validator

Attempted exactly as the brief named it:

```bash
npx --yes renovate-config-validator@latest renovate.json
```

Result in the phase sandbox: **not run.** The sandbox rejected the command before
execution:

```text
{"error":{"type":"permission.rejected","message":"Permission denied: shell"},"content":[]}
```

`renovate-config-validator` is not a project dependency, so there is no installed
binary to invoke through `pnpm`. The primary agent ran it after the phase and it
passes:

```bash
npx --yes --package renovate@latest renovate-config-validator renovate.json
# INFO: Validating renovate.json as global config
# INFO: Config validated successfully against 1 file(s)
# Exited with code 0
```

Note the invocation: the bare `renovate-config-validator@latest` package does not
exist on npm (`npm error could not determine executable to run`); the binary ships
inside the `renovate` package, so the `--package` form is the one that works. NFR-4
is therefore proven, by the primary rather than the phase agent.


## Verification

```bash
pnpm check
# Exited with code 0
```

```text
$ pnpm exec biome check . && pnpm exec tsc --noEmit && pnpm test
Checked 174 files in 266ms. No fixes applied.
$ vitest run
 Test Files  47 passed (47)
      Tests  862 passed (862)
```

One formatting failure occurred on the first `pnpm check` (Biome wanted a
`problems.push(...)` call on one line); it was fixed in `52da794` and the
command re-run to green.

## Acceptance criteria

| ID | Criterion | Witness | Status |
|---|---|---|---|
| AC-1 | `renovate.json` declares the recommended preset, the dashboard, the weekly Sydney schedule and the three-day soak | `renovate.json` fields; test `renovate.json > declares the recommended preset, the dashboard, the weekly Sydney schedule and the soak` asserts `extends` contains `config:recommended`, `dependencyDashboard === true`, `timezone === 'Australia/Sydney'`, `schedule === ['before 6am on monday']`, `minimumReleaseAge === '3 days'` | met |
| AC-2 | The guard test proves both members of each coupled pair resolve to one group name, and that every direct dependency is matched | Tests `keeps each coupled set on its own explicit group name` (explicit `EXPECTED_GROUPS` names for all seven groups) and `matches every direct dependency to exactly one group` (reads real `package.json`, fails on zero or two matches) | met |
| AC-3 | Adding a dependency that no rule matches makes the guard test fail; removing it makes it pass again, both demonstrated | Guard-bites section above: `left-pad: no rule matches it — add it to a group in renovate.json.` at exit 1, then 6/6 green at exit 0 | met |

Supporting: **NFR-1** — no runtime dependency, bundle byte or asset added; the
probe dependency was transient and the lockfile is unchanged. **NFR-4** —
validator not run (see above).

## Deviations

None to tracked files. During the guard-bites demonstration `package.json` and
`pnpm-lock.yaml` were transiently modified and restored; `git status --short`
is clean at head.

## Notes

- Repo root is resolved with
  `fileURLToPath(new URL('../..', import.meta.url))` as the brief specified;
  `nginx-headers.test.ts` actually uses `process.cwd()`, while
  `no-external-urls.test.ts` uses the `fileURLToPath` form, so the guard is
  independent of the launch directory.
- The test asserts shape and couplings only: no key order, no optional keys
  Renovate may add, and extra members in an existing group are allowed (the
  coverage test, not a frozen membership list, enforces completeness).
- `automerge` is absent from every rule and explicitly `false` at the top
  level; the test rejects `true` in either place.

## Primary verification

Independent checks after the phase agent finished, at HEAD `bf64c8f` with a clean
tree:

```text
pnpm check            -> exit 0, Biome 174 files, 47 test files / 862 tests (3.28 s)
renovate-config-validator -> exit 0, "Config validated successfully against 1 file(s)"
git diff --stat 69f31f1..HEAD
  renovate.json                                     47 ++
  src/core/renovate-config.test.ts                 163 +++
  verification/phase-1.md                          230 +++
```

Diff review:

- `renovate.json` is exactly the policy in the brief: recommended preset, dashboard,
  `Australia/Sydney`, `before 6am on monday`, `minimumReleaseAge: "3 days"`,
  `rebaseWhen: conflicted`, `automerge: false`, `separateMajorMinor: true`, and seven
  grouped rules each restricted to minor+patch.
- The guard reads the real `package.json` through the same `fileURLToPath` root
  resolution `no-external-urls.test.ts` uses, so it does not depend on the launch
  directory. Its resolution rule is the one the brief specified: unique rule, zero
  matches fails as uncovered, two matches fails as ambiguous.
- Couplings are pinned by group *name*, so renaming a group cannot quietly split
  `three` from `@types/three`.
- The anti-vacuity test requires at least fifteen direct dependencies and `three`
  among them, so the guard cannot pass by reading nothing.

The phase's only blocker — the validator — is closed by the run above; the phase
agent's refusal to claim an unobserved pass was correct, and its report of `P1.T1`
as partial is now superseded.

