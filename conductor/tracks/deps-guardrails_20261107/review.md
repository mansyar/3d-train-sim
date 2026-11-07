# Review — Dependency Guardrails

| | |
|---|---|
| Track | `deps-guardrails_20261107` |
| Branch | `chore/deps-guardrails_20261107` |
| Range | `b99999a..e8f6a1c` (round 1), `e8f6a1c..HEAD` (round 2) |
| Rounds | 2 |
| Verdict | **PASS WITH FINDINGS** |

## Summary

The Renovate policy, its coverage guard and the audit gate are the right shape:
one weekly batch with coupled pairs kept together, a guard that fails when a new
dependency escapes the policy, and a fourth CI gate that is independent, cheap
and red on high advisories. The track went further than asked and cleared the
15 high advisories that the gate exposed, so the gate means something from its
first run.

Round 1 found a High: the `brace-expansion` override was applied tree-wide, and
`brace-expansion@5` is not callable in the way `minimatch@5` requires. The build
and 193 specs stayed green because minimatch short-circuits patterns without
braces, so the break was dormant, not absent — `minimatch('a.js','{a,b}.js')`
threw `TypeError: expand is not a function`. Round 1 also found that the
Dockerfile never copied `pnpm-workspace.yaml`, so the release image's frozen
install would have failed with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. Both are
fixed in Phase R1, each with a witness that fails without the fix.

## Verification

| Check | Command | Result |
|---|---|---|
| Static | `pnpm exec biome check .` | pass — 175 files |
| Types | `pnpm exec tsc --noEmit` | pass |
| Unit | `pnpm test` | pass — 48 files / 866 tests |
| Audit | `pnpm audit --audit-level=high` | pass — 0 high, 0 critical, 1.6 s |
| Build | `pnpm build` | pass — 178 precache entries |
| E2E (full) | `pnpm exec playwright test` | pass — 193 specs (tablet · phone · prod) |
| Config | `renovate-config-validator renovate.json` | pass |

## Requirements coverage

| Requirement | Status | Witness |
|---|---|---|
| FR-1 recommended preset + dashboard | covered | `renovate-config.test.ts` shape test |
| FR-2 weekly Sydney schedule | covered | same |
| FR-3 three-day soak | covered | same |
| FR-4 grouped minors, majors separate | covered | grouped-rule + pair tests |
| FR-5 guard against coverage drift | covered | coverage test, `left-pad` red/green |
| FR-6 audit gate in CI | covered | `ci.yml` `Gate · audit` |
| FR-7 independent job | covered | no `needs:`, own checkout/install |
| FR-8 dated ignore for unfixable advisories | covered | none needed; rule documented |
| FR-9 docs | covered | `tech-stack.md`, `CONTRIBUTING.md`, roadmap row |
| NFR-1 no new runtime dependency | covered | overrides only; 4 runtime deps unchanged |
| NFR-2 gate under 60 s | covered | 1.6 s measured |
| NFR-3 existing gates unchanged | covered | full suite green |
| NFR-4 config validates | covered | validator exit 0 |
| NFR-5 no new secret | covered | job adds nothing |
| AC-1 … AC-7 | covered | see `verification/integrated.md` |

## Findings — round 1

### F1 — High — `pnpm-workspace.yaml:13`

**What:** `brace-expansion: ">=5.0.11"` applied to every consumer, including
`minimatch@5.1.9` (`filelist → jake → workbox-build`), which was written against
`brace-expansion@^2`. minimatch@5 does `const expand = require('brace-expansion')`
and calls it; `brace-expansion@5` only exports a named `expand`, so the required
module is a namespace object.

**Why it mattered:** every brace-containing pattern through that path throws
`TypeError: expand is not a function`. Dormant only because minimatch
short-circuits patterns without `{...}` — which is why 178 precache entries and
193 specs passed. Confirmed at runtime before fixing.

**Fix:** scope the override per consumer major — `"minimatch@5>brace-expansion":
">=2.1.7 <3"` and `"minimatch@10>brace-expansion": ">=5.0.11"` — and add
`src/core/dependency-overrides.test.ts`, which resolves the installed minimatch
copies and asserts the brace-expansion they require is callable and that
`'{a,b}.js'` matches `a.js`. Demonstrated failing on the tree-wide override.

### F2 — Medium — `Dockerfile:7`

**What:** the build stage copied `package.json pnpm-lock.yaml` only. The lockfile
records `overrides:`, which live in `pnpm-workspace.yaml`, so the release
image's `pnpm install --frozen-lockfile` ran without them.

**Why it mattered:** reproduced in a temp directory — exit 1,
`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. The next tag would have failed to build,
and no test or evidence covered `docker build`.

**Fix:** `COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./`, proven by the
same temp-directory frozen install (exit 0).

### F3 — Medium — `src/core/renovate-config.test.ts:105`

**What:** the automerge guard only rejected the literal `true`. Renovate also
accepts `automerge: "patch"` and `platformAutomerge: true`.

**Why it mattered:** a future `automerge: "patch"` would pass every gate while
enabling bot merges — the vacuous pass the guard exists to prevent.

**Fix:** assert `automerge` is exactly `false`, reject any per-rule `automerge`
key, reject `platformAutomerge: true`, widen the types, and add a case proving a
string-valued automerge is treated as automerge.

### F4 — Medium — `src/core/renovate-config.test.ts:80`

**What:** coverage resolution counted any rule matching the package name,
including rules with no `groupName`, `enabled: false`, or `matchUpdateTypes:
["major"]`; `optionalDependencies`/`peerDependencies` were not read at all.

**Why it mattered:** a disabled or major-only rule would report a dependency as
maintained while Renovate never opens a grouped minor/patch for it.

**Fix:** only rules with a `groupName`, not disabled, and able to deliver minor
or patch count as coverage; the manifest reader now includes optional and peer
dependencies; a new case asserts all three useless shapes are rejected.

### F5 — Medium — `verification/integrated.md:37`

**What:** AC-5 (measured duration) had no measurement anywhere, and the AC table
had drifted from the spec's numbering, which hid the gap.

**Fix:** the gate was timed — **1.6 s**, exit 0, well inside the 60 s ceiling —
recorded here and in the evidence; the AC table is renumbered to the spec.

### F6 — Low — `pnpm-workspace.yaml:10`

**What:** the `fast-uri` comment said "patched 3.1.7" while the unbounded range
resolved to `4.2.3`, a major outside `ajv@8`'s declared `^3`.

**Fix:** capped to `">=3.1.7 <4"` (resolves 3.1.9) so the override stays inside
the consumer's major, and the comment says why.

### F7 — Low — `src/core/renovate-config.test.ts:130`

**What:** the anti-vacuity floor was exactly the current dependency count (15),
so legitimately removing a dependency would fail with a misleading message.

**Fix:** floor lowered to 10, with `toContain('three')` kept as the real
non-triviality check.

## Overrides

None.

## Plan compliance

Phases 1–3 verified at `0915650`, `691f4a7`, `9ad7f35`. Phase R1 (round-1
fixes) verified at `e8f6a1c`. Deviations recorded in the plan: remediation moved
into Phase 2 because the baseline was red; pnpm 11 settings live in
`pnpm-workspace.yaml`; no dated ignore shipped.

## Out of scope

- Six low/moderate advisories remain below the agreed threshold.
- Installing the Renovate GitHub app is a repository setting.
- `docker build` itself was not run (no daemon locally); the frozen-install
  reproduction is the substitute witness.

## Debt

- The audit job's duration is measured locally; the CI step duration should
  confirm it on the first run.
- The dependency-overrides guard resolves the pnpm store layout
  (`node_modules/.pnpm`). A future pnpm major that changes that layout would make
  the guard throw rather than silently pass — acceptable, but worth knowing.

## Doc sync

`synced` — `tech-stack.md` (Dependency maintenance row, four-gate CI section),
`CONTRIBUTING.md` (Dependency PRs), `product.md` (roadmap row marked shipped).

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
|---|---|---|---|---|---|---|
| 1 | BLOCK | 0 | 1 | 4 | 2 | 7 |
| 2 | PASS WITH FINDINGS | 0 | 0 | 0 | 0 | — |
