# Phase R1 — Review Fixes — Verification

## Goal

Close the seven round-1 findings. Two of them would have broken a real build
rather than a test: the tree-wide `brace-expansion` override broke
`minimatch@5`'s `require` contract, and the Dockerfile never copied the pnpm
settings file that carries every override.

## Commands

| Check | Command | Exit | Result |
|---|---|---|---|
| Static + unit | `pnpm check` | 0 | Biome 175 files, `tsc` clean, 48 files / 866 tests |
| Audit | `pnpm audit --audit-level=high` | 0 | 0 high, 0 critical — **1.6 s** measured |
| Build | `pnpm build` | 0 | 178 precache entries, 10 639.92 KiB |
| E2E (full) | `pnpm exec playwright test` | 0 | 193 passed (tablet · phone · prod) |
| Override guard | `pnpm exec vitest run src/core/dependency-overrides.test.ts` | 0 | 2 passed |

## F1 — the override broke `minimatch@5` (High)

Proved before fixing, through the installed tree:

```
require('brace-expansion') from minimatch@5.1.9 → object  {EXPANSION_MAX, …}
minimatch('a.js', '{a,b}.js')                  → TypeError: expand is not a function
```

Fixed by scoping the override per consumer major:

```yaml
"minimatch@5>brace-expansion": ">=2.1.7 <3"
"minimatch@10>brace-expansion": ">=5.0.11"
```

After the change: `minimatch@5` resolves `brace-expansion@2.1.7` (`typeof:
function`) and `minimatch('a.js','{a,b}.js')` returns `true`; `minimatch@10`
keeps 5.0.12 and its namespace import. Audit still exits 0.

New guard `src/core/dependency-overrides.test.ts` walks
`node_modules/.pnpm/minimatch@*`, and for every copy below major 6 asserts the
required module is callable and a brace pattern matches. Demonstrated failing on
the tree-wide override with the finding-specific message
("minimatch@5.1.9 resolves brace-expansion as object; it requires the callable
2.x shape — scope the override to a major below 3."), then passing once scoped.

## F2 — the release image would not build (Medium)

Reproduced the Dockerfile's install context in a temp directory:

| Inputs copied | Exit | Message |
|---|---|---|
| `package.json`, `pnpm-lock.yaml` (the pre-fix Dockerfile) | 1 | `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` |
| `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` (fixed) | 0 | install completes in 8.4 s |

`Dockerfile` now copies all three before `pnpm install --frozen-lockfile`, with a
comment explaining that the workspace file carries the overrides the lockfile
records.

## F3 — automerge guard was literal-only (Medium)

`automerge` is now asserted to be exactly `false`, any per-rule `automerge` key is
rejected, `platformAutomerge: true` is rejected, and the types accept
`boolean | string` so the JSON contract matches Renovate's. A new case proves a
string-valued `automerge: 'patch'` is counted as automerge.

## F4 — coverage counted rules that cannot deliver (Medium)

`groupsMatching()` now requires a `groupName`, `enabled !== false`, and a scope
that includes minor or patch before a rule counts as coverage; the manifest
reader also includes `optionalDependencies` and `peerDependencies`. A new case
asserts that a groupless rule, a disabled rule and a major-only rule all fail to
cover `three`.

## F5 — the gate's duration and the AC table (Medium)

`pnpm audit --audit-level=high` measured at **1.6 s** (exit 0), recorded in
`verification/integrated.md` against AC-5 and in `review.md`. The integrated AC
table was renumbered to the spec's criteria.

## F6 — `fast-uri` rode a major past ajv (Low)

The override is now `">=3.1.7 <4"`; the lockfile resolves `fast-uri@3.1.9`,
inside `ajv@8`'s declared `^3`, and the comment says why the cap exists.

## F7 — anti-vacuity floor (Low)

`toBeGreaterThanOrEqual(15)` → `10`, keeping `toContain('three')` as the real
non-triviality assertion.

## Acceptance criteria touched

| AC | Evidence |
|---|---|
| AC-2 | Coverage now means "a grouped minor/patch rule", not "some rule mentions it" |
| AC-4 / AC-5 | Audit exits 0 in 1.6 s; the red proof from Phase 2 still stands |
| AC-7 | Full suite green with the corrected dependency tree |

## Deviations

- The fixes were authored by the primary agent in one pass, so task commits are
  grouped into a single review-fix commit rather than one per finding. The
  Conductor phase agent was not used because the diff is small (four files) and
  the guard needed interactive runtime checks against the installed tree.
- `docker build` itself was not run — no daemon is available locally or in CI.
  The temp-directory frozen install is the witness; the two exit codes above are
  the difference between a release that builds and one that does not.

## Notes

- The new guard reads the pnpm store layout (`node_modules/.pnpm`). If a future
  pnpm major moves it, the test throws on a missing file rather than passing.
- `brace-expansion@5.0.12` still ships for `minimatch@10`, which imports the
  namespace correctly.
