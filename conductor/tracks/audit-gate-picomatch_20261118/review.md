# Review: Pnpm 12 Toolchain and Audit Gate

- **Track:** `audit-gate-picomatch_20261118`
- **Type:** `chore`
- **Branch:** `chore/audit-gate-picomatch_20261118`
- **Range:** `6bb8b93e3591d61be340455e7fd6a23d29645b4b..c6410a9dffb5433b255268213e0ea605e6e866a2`
- **Date:** `2026-11-18T16:05:00Z`
- **Verdict:** `PASS`

## Summary

The diff is a narrowly scoped toolchain and audit-gate repair: the pnpm pin moves from 11.24.0 to 12.21.0, one dated `audit.ignore` exception for GHSA-fc5q-39xc-vjpf is added with a removal trigger, the lockfile receives a mechanical 167-line pnpm-12 metadata rewrite, and four stale pnpm-11 / `auditConfig.ignoreCves` strings are refreshed. All six non-Conductor files match the plan's `Touches`; no source, dependency-version, `overrides`, audit-level, or player-facing change is present. Every configured check is green on the final HEAD, the primary requirements table is accurate across all FR/NFR/AC, and the independent reviewer returned PASS with zero findings.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm test` | pass | `conductor/tracks/audit-gate-picomatch_20261118/verification/integrated.md` |
| coverage | `pnpm test:coverage` | pass (97.05% stmts / 91.19% branches / 97.39% funcs / 98.86% lines; 80% gate on `src/core` + `src/state`) | `verification/integrated.md` |
| lint | `pnpm exec biome check .` | pass (195 files, no fixes) | `verification/integrated.md` |
| typecheck | `pnpm exec tsc --noEmit` | pass | `verification/integrated.md` |
| build | `pnpm build` | pass (Vite + PWA service worker, 178 precache entries) | `verification/integrated.md` |
| e2e | `pnpm exec playwright test` | pass (68 passed, 1 pre-existing `@ci` skip, tablet/phone/prod) | `verification/integrated.md` |
| audit | `pnpm audit --audit-level=high` | pass (1 ignored high = the single dated exception; 1 low / 4 moderate below threshold) | `verification/phase-1.md`, `verification/integrated.md` |
| install | `pnpm install --frozen-lockfile` | pass with pnpm 12.21.0 | `verification/phase-1.md` |
| docs | `grep -rInE 'auditConfig\.ignoreCves|pnpm 11|pnpm \^11'` over four files | pass (exit 1, no matches) | `verification/phase-2.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | `package.json:10`; `pnpm/action-setup@v4` / `corepack enable`; `verification/phase-1.md` | covered |
| FR-2 | P1.T2 | `pnpm-workspace.yaml:23-28`; `verification/phase-1.md`; `pnpm audit` | covered |
| FR-3 | P2.T1, P2.T2, P2.T3 | `.github/workflows/ci.yml:94`; `conductor/tech-stack.md:19,39,288`; `CONTRIBUTING.md:9,42`; `Dockerfile:7`; `verification/phase-2.md` | covered |
| FR-4 | P1.T1 | `pnpm-lock.yaml` metadata-only rewrite; `pnpm install --frozen-lockfile`; `verification/phase-1.md` | covered |
| FR-5 | P1 + P2 verification | `verification/integrated.md` | covered |
| FR-6 | all phases | `git diff --name-only 6bb8b93..c6410a9`; per-phase diffs; `verification/integrated.md` | covered |
| NFR-1 | all phases | diff inspection (no `src/` telemetry, storage, network or kid-UI change) | covered |
| NFR-2 | P1.T2 | `pnpm-workspace.yaml:10-28`; audit output; `verification/phase-1.md` | covered |
| NFR-3 | P1 + integrated verification | coverage report; `verification/integrated.md` | covered |
| NFR-4 | P1.T1 | `pnpm --version` = 12.21.0 in `verification/phase-1.md` | covered |
| AC-1 | P1.T1 | `package.json:10`; stale grep; `verification/phase-1.md` | covered |
| AC-2 | P1.T2 | pre-change exit 1 / post-change exit 0 in `verification/phase-1.md` | covered |
| AC-3 | P1.T2 | `pnpm-workspace.yaml:23-28` | covered |
| AC-4 | P2 all tasks | phase-2 stale grep; `verification/phase-2.md` | covered |
| AC-5 | P1.T1 | frozen install; lockfile diff; `verification/phase-1.md` | covered |
| AC-6 | integrated verification | `pnpm check`, `pnpm test:coverage`; `verification/integrated.md` | covered |
| AC-7 | integrated verification | `pnpm build`, `pnpm exec playwright test`; `verification/integrated.md` | covered |
| AC-8 | all phases | full-range diff; `verification/integrated.md` | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- <none>

## Overrides

- <none>

## Plan compliance

Both phases are complete: each has a `Result`, `Checkpoint` and `Evidence` entry, and all 14 tasks are marked `[x]`. The final diff stays within the union of the two phases' `Touches` plus track artifacts. The only deviation is recorded in `verification/phase-2.md`: the subagent was tool-denied `conductor/tech-stack.md`, so the primary applied the four in-scope replacements; no scope or behavior changed. No review-fix phase was needed.

## Out of scope

- <none introduced by this diff>

## Debt

- <none>

## Doc sync

`updated` — pre-review doc sync added the dated pnpm 12 note in `conductor/tech-stack.md`; post-review sync confirmed no further doc change is needed.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS | 0 | 0 | 0 | 0 | 0 |
