# Phase 1 Evidence — Toolchain pin and narrow audit exception

- **Track:** `audit-gate-picomatch_20261118` (Pnpm 12 Toolchain and Audit Gate)
- **Phase:** 1 — Toolchain pin and narrow audit exception
- **Date:** 2026-11-18
- **Branch:** `chore/audit-gate-picomatch_20261118`
- **Base commit:** `facc6a19754c7d030403ad0ea058a5bb78714343`
- **Head commit (verified code tree):** `2891cd20068e4d86688a34d31122f05834ca25ba`
- **Result:** **verified** — all commands pass; the pnpm 12.21.0 pin governs the in-project CLI, the audit gate is green with exactly one dated GHSA exception, and the full verification chain exits 0.

> **Commit note:** the verified code tree is capped by the lockfile commit `2891cd2`. This evidence file is committed on top of it as the final commit of the phase and is therefore not part of the code tree that was verified.

## What was done

| Task | Change | Commit |
| --- | --- | --- |
| P1.T1.1 | `package.json`: `packageManager` `pnpm@11.24.0` → `pnpm@12.21.0` | `3f77cc8` |
| P1.T1.2 | `pnpm install` with pnpm 12.21.0; mechanical `pnpm-lock.yaml` rewrite kept and committed | `2891cd2` |
| P1.T2.1 | `pnpm-workspace.yaml`: added `audit.ignore: [GHSA-fc5q-39xc-vjpf]` | `0af64fe` |
| P1.T2.2 | Dated comment above the entry (date, track id, advisory id, dev-only transitive with no published patch, removal trigger) | `0af64fe` |
| P1.T2.3 | Confirmed no other ignore entries, no broad path/dev-only exemption, no change to `overrides` or audit level | static check below |

All edits are confined to the three `Touches` files (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`).

## Commands table

The `pnpm` commands were executed by the primary on this branch (primary handoff, 2026-11-18T04:32Z) and are recorded here verbatim. The subagent did not re-run them.

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| toolchain (post-change) | `pnpm --version` | 0 | `12.21.0` — the `packageManager` pin now governs the in-project CLI (was 11.24.0 before the change). |
| install (P1.T1.2) | `pnpm install` | 0 | `Lockfile is up to date, resolution step is skipped`; `Done in 2.4s using pnpm v12.21.0`. Wrote a mechanical `pnpm-lock.yaml` diff (167 insertions, 0 deletions) — see lockfile section. |
| audit (pre-change baseline) | `pnpm audit --audit-level=high` | 1 | On GHSA-fc5q-39xc-vjpf: 6 vulnerabilities (1 low / 4 moderate / 1 high) across 29 paths, all dev-only via `vitest > vite > picomatch`; advisory `patched versions: None`. |
| audit (post-change) | `pnpm audit --audit-level=high` | 0 | `5 vulnerabilities found`; `Severity: 1 low | 4 moderate`; `1 ignored: 1 high`. The single ignored high is GHSA-fc5q-39xc-vjpf; the gate is green. |
| full verification | `pnpm install --frozen-lockfile && pnpm audit --audit-level=high && pnpm check && pnpm test:coverage` | 0 | Frozen install clean; audit as above (1 ignored high); biome checked 195 files with no fixes; tsc clean; 57 files / 1009 tests passed twice; coverage 97.05% statements, 91.19% branches, 97.39% functions, 98.86% lines. |

All remaining below-`high` advisories (1 low, 4 moderate) are unchanged from the pre-change baseline and are below the `--audit-level=high` threshold; only the unfixable high is ignored.

## Acceptance-criteria table

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | `package.json` has `pnpm@12.21.0`; no `pnpm 11` pin remains in tracked files | `package.json` line 10 is `"packageManager": "pnpm@12.21.0"`; `pnpm --version` → `12.21.0`. A repo-wide grep found no remaining `pnpm@11` / `11.24.0` *version pin* in active config; residual "pnpm 11" phrases are Phase 2 doc wording, the pre-existing workspace header comment, a test comment, and historical `conductor/archive/**` records — none are pins. | **satisfied** |
| AC-2 | `pnpm audit --audit-level=high` exits 0 with no high/critical advisories; pre-change failure recorded as evidence | Pre-change baseline exit 1 on GHSA-fc5q-39xc-vjpf (6 vulns, 1 high, 29 paths, no patched version) recorded above. Post-change exit 0: `5 vulnerabilities found`, `1 low | 4 moderate`, `1 ignored: 1 high`. No outstanding high/critical. | **satisfied** |
| AC-3 | `audit.ignore` contains only `GHSA-fc5q-39xc-vjpf`; comment carries date 2026-11-18, track id, advisory id, and removal trigger | `pnpm-workspace.yaml`: `# 2026-11-18 — GHSA-fc5q-39xc-vjpf — audit-gate-picomatch_20261118`, `# Dev-only transitive (vitest > vite > picomatch); no patched version published.`, `# Remove this entry when upstream publishes a fix, then re-run pnpm audit.`, then `audit: / ignore: / - GHSA-fc5q-39xc-vjpf`. Exactly one entry; no broad path/dev-only exemption. | **satisfied** |
| AC-5 | `pnpm install --frozen-lockfile` with pnpm 12.21.0 exits 0; any lockfile diff is mechanical and committed | Frozen install clean in the full verification chain (exit 0). `pnpm-lock.yaml` diff is 167 insertions / 0 deletions, purely toolchain metadata (YAML `---` marker, `lockfileVersion: '9.0'`, `importers[.].configDependencies: {}`, `importers[.].packageManagerDependencies.pnpm = {specifier: 12.21.0, version: 12.21.0}`, platform-specific `@pnpm/exe@12.21.0` resolutions). No application dependency version changed. Committed as `2891cd2`. | **satisfied** |

NFR-2 is satisfied by inspection: the audit level is a CLI argument (`--audit-level=high`, unchanged), the `overrides` block in `pnpm-workspace.yaml` is untouched, there is exactly one GHSA ignore, and no broad or dev-only exemption exists.

## Lockfile diff summary

`git diff --stat` before commit showed `pnpm-lock.yaml | 167 +++++...` (167 insertions, 0 deletions). The rewrite adds a pnpm 12.21.0 toolchain document ahead of the original project lock block: the YAML `---` marker, `lockfileVersion: '9.0'`, `importers[.].configDependencies: {}`, `importers[.].packageManagerDependencies.pnpm = {specifier: 12.21.0, version: 12.21.0}`, platform-specific `@pnpm/exe@12.21.0` package and snapshot entries, and the `pnpm@12.21.0` package with its optional `@pnpm/exe` dependencies. The pre-existing `settings:` / dependency block is preserved unchanged — no application dependency version was added, removed, or bumped. Committed as `2891cd2` (`chore(deps): update lockfile for pnpm 12.21.0`).

## Deviations

None. All edits stayed inside `Touches` and used the current `audit.ignore` key (not the obsolete `auditConfig.ignoreCves`). Phase 2 files were not touched.

## Notes

- Phase 1 commits: `3f77cc8` (pin pnpm), `0af64fe` (audit exception), `2891cd2` (lockfile rewrite), plus this evidence commit.
- The primary executed all pnpm commands; the subagent recorded them verbatim and did not retry or re-run pnpm. No blockers remain.
- The remaining "pnpm 11" wording in `.github/workflows/ci.yml`, `conductor/tech-stack.md`, `CONTRIBUTING.md`, `Dockerfile` (and `README.md`) is Phase 2 scope and was deliberately not touched.

## Primary verification

- Ran on final phase HEAD `ff1a191` after the subagent's evidence commit, worktree clean first.
- `git diff --name-only facc6a19754c7d030403ad0ea058a5bb78714343..HEAD` = exactly `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `verification/phase-1.md` — matches Touches plus evidence; no Phase 2 file changed.
- `git log --oneline facc6a1..HEAD` = `3f77cc8`, `0af64fe`, `2891cd2`, `ff1a191` — exactly the subagent report; `git log --merges` empty.
- Re-ran the exact verification command on final HEAD: **exit 0**. Frozen install clean with pnpm v12.21.0; audit `5 vulnerabilities found / 1 low | 4 moderate / 1 ignored: 1 high`; biome 195 files no fixes; tsc clean; 57 files / 1009 tests passed twice; coverage 97.05% statements / 91.19% branches / 97.39% functions / 98.86% lines (above the 80% gate).
- AC-1, AC-2, AC-3, AC-5 re-checked against the diff and command output; all satisfied. Accepted deviation: none. Squash checkpoint recorded below in `plan.md`.
