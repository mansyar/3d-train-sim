# Phase 2 Evidence — Coherent pnpm 12 documentation and CI comments

- **Track:** `audit-gate-picomatch_20261118` (Pnpm 12 Toolchain and Audit Gate)
- **Phase:** 2 — Coherent pnpm 12 documentation and CI comments
- **Date:** 2026-11-18
- **Branch:** `chore/audit-gate-picomatch_20261118`
- **Phase base:** `45dd86bdb1ca8215e3f208081925e5e60168be39`
- **Head commit (verified code tree):** see commits below; the worktree is committed as the task commit plus this evidence commit.
- **Result:** **verified** — all four `Touches` files are updated and verified; `pnpm check` passes; the stale-string grep over all four files returns no matches.

> **Permission handoff resolved:** the subagent was denied `edit`/`write` on `conductor/tech-stack.md` (primary-owned Conductor doc). The primary applied the four exact replacements recorded in "Primary action (applied)" below and re-ran the grep and `pnpm check` successfully.

## What was done

| Task | Change | File / line | Commit |
| --- | --- | --- | --- |
| P2.T1.1 | `auditConfig.ignoreCves` → `audit.ignore` in the CI audit comment (policy text otherwise intact: dated, GHSA-named, track-named, never broad/dev-only) | `.github/workflows/ci.yml:94` | task commit |
| P2.T3.1a | `**pnpm 11**` → `**pnpm 12**` in dev setup | `CONTRIBUTING.md:9` | task commit |
| P2.T3.1b | `auditConfig.ignoreCves` → `audit.ignore` in the advisory policy | `CONTRIBUTING.md:42` | task commit |
| P2.T3.2 | `pnpm 11's settings file` → `pnpm's settings file` | `Dockerfile:7` (lines 8-9 unchanged) | task commit |
| P2.T2.1 / P2.T2.2 | Applied by the primary after the subagent's tool-level permission denial: two replacements on `:19`, one on `:39`, one on `:288` | `conductor/tech-stack.md:19,39,288` | primary (uncommitted until primary state commit) |

## Commands table

| Command | Exit | Summary |
| --- | --- | --- |
| `pnpm check` | 0 | `pnpm exec biome check .` → 195 files checked, no fixes; `pnpm exec tsc --noEmit` → clean; `pnpm exec vitest run` → 57 files / 1009 tests passed. Only a pre-existing Vite `configLoader: 'native'` warning (non-fatal). |
| `git branch --show-current` | 0 | `chore/audit-gate-picomatch_20261118` — matches the brief; no branch switch performed. |
| `git diff --stat` | 0 | `.github/workflows/ci.yml \| 2 +-`, `CONTRIBUTING.md \| 4 ++--`, `Dockerfile \| 2 +-` (4 insertions / 4 deletions). |
| `git rev-parse HEAD` | 0 | `45dd86bdb1ca8215e3f208081925e5e60168be39` before commit (the phase base). |

## Replaced strings

| # | File:line | Old | New |
| --- | --- | --- | --- |
| 1 | `.github/workflows/ci.yml:94` | `# with no fixed version yet gets a dated \`auditConfig.ignoreCves\` entry in` | `# with no fixed version yet gets a dated \`audit.ignore\` entry in` |
| 5 | `CONTRIBUTING.md:9` | `- **Node ≥ 24** and **pnpm 11** (\`corepack\` or \`npm i -g pnpm\`)` | `- **Node ≥ 24** and **pnpm 12** (\`corepack\` or \`npm i -g pnpm\`)` |
| 6 | `CONTRIBUTING.md:42` | `silence is a dated \`auditConfig.ignoreCves\` entry in \`pnpm-workspace.yaml\`` | `silence is a dated \`audit.ignore\` entry in \`pnpm-workspace.yaml\`` |
| 7 | `Dockerfile:7` | `# pnpm-workspace.yaml is pnpm 11's settings file; it carries the \`overrides\`` | `# pnpm-workspace.yaml is pnpm's settings file; it carries the \`overrides\`` |

## Before / after grep summary

Pattern: `auditConfig\.ignoreCves|pnpm 11|pnpm \^11`, scoped to the four `Touches` files.

| File | Before | After |
| --- | --- | --- |
| `.github/workflows/ci.yml` | 1 match (`ci.yml:94`) | 0 matches |
| `conductor/tech-stack.md` | 3 matches (`tech-stack.md:19` ×2 keys, `:39`, `:288`) | **3 matches remain — permission denied** |
| `CONTRIBUTING.md` | 2 matches (`:9`, `:42`) | 0 matches |
| `Dockerfile` | 1 match (`:7`) | 0 matches |

No `auditConfig.ignoreCves` and no "pnpm 11" wording remains in the three writable files. The four `Touches` files as a whole are **not yet clean** because of `conductor/tech-stack.md`.

## Acceptance-criteria table

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-4 | The four named files contain no `auditConfig.ignoreCves` / "pnpm 11" wording; CI comment names `audit.ignore` | CI comment `ci.yml:94`, `CONTRIBUTING.md:42` and `conductor/tech-stack.md:19,288` now name `audit.ignore`; `CONTRIBUTING.md:9` says pnpm 12; `Dockerfile:7` says pnpm's settings file; `tech-stack.md:39` says pnpm ^12. Final grep `grep -rInE 'auditConfig\.ignoreCves|pnpm 11|pnpm \^11' <four files>` exits 1 (no matches). | **satisfied** |
| AC-8 | `git diff` touches only FR-1/FR-3/FR-4 files plus track artifacts; no dependency version or player-facing source changes | `git diff --stat` lists only `.github/workflows/ci.yml`, `CONTRIBUTING.md`, `Dockerfile` plus this evidence file. No `package.json`, lockfile, workspace config, source/test, or other Conductor state file changed. | **satisfied** |

## Primary action (applied)

The primary applied these four replacements to `conductor/tech-stack.md` after the subagent's permission denial:

1. `:19` — `a dated \`auditConfig.ignoreCves\` entry` → `a dated \`audit.ignore\` entry` (sentence and table structure otherwise preserved).
2. `:19` — `(pnpm 11 ignores \`pnpm.overrides\` in \`package.json\`)` → `(pnpm reads workspace settings from \`pnpm-workspace.yaml\`, not \`pnpm.overrides\` in \`package.json\`)`. This wording deliberately avoids the literal phrase "pnpm 11" so AC-4's grep stays clean; override entries and the guard-test description are untouched.
3. `:39` — `pnpm ^11 — strict, fast, workspace-ready if tracks ever split.` → `pnpm ^12 — strict, fast, workspace-ready if tracks ever split.`
4. `:288` — `a dated \`auditConfig.ignoreCves\`` → `a dated \`audit.ignore\`` (sentence otherwise unchanged).

Final verification by the primary: `grep -rInE 'auditConfig\.ignoreCves|pnpm 11|pnpm \^11'` over the four Touches files exits 1 (no matches); `pnpm check` exits 0 (biome 195 files clean, tsc clean, 57 files / 1009 tests).

## Deviations

- `conductor/tech-stack.md` could not be edited by the phase subagent (tool-level permission denial on both `edit` and `write`); the primary applied the four in-scope replacements. See "Primary action (applied)". No scope decision changed and no other file was touched.

## Notes

- No new dated audit entry was added; Phase 1's single `audit.ignore` entry in `pnpm-workspace.yaml` was left untouched.
- No dependency version, config key, CI job, audit level, source, or test change was made.
- No stale string was found elsewhere in the three writable files. A repo-wide search for other stale wording (e.g. `README.md`) was not performed beyond the four `Touches` files; AC-8 forbids widening the diff, so any such string would be reported as a note only.
- The permission denial was not retried by the subagent after the second distinct tool failed, and no shell/pipe/wrapper/Code Mode workaround was used.

## Primary verification

- Checked clean tree; phase range `45dd86bdb1ca8215e3f208081925e5e60168be39..HEAD` after the subagent contained only the three writable Touches plus this evidence file, and commits `4b9fb73`, `73add26` matched the subagent report with no merges.
- Applied the four `conductor/tech-stack.md` replacements myself; final stale-string grep over all four Touches exits 1 (no matches), and `pnpm check` re-ran green on the final doc tree (195 files biome clean, tsc clean, 57 files / 1009 tests).
- AC-4 and AC-8 re-checked against final content and diff; both satisfied. Deviation: primary-owned file applied by primary after permission denial; accepted.
