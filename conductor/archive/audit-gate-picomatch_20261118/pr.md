## Summary

Pins the project to pnpm 12.21.0 and restores the red `Gate · audit` CI check with exactly one dated `audit.ignore` exception for the dev-only, unpatched `picomatch` advisory GHSA-fc5q-39xc-vjpf. The lockfile is mechanically regenerated, four stale pnpm-11 / `auditConfig.ignoreCves` references are refreshed, and the full verification matrix stays green. No player-facing behavior changes.

## Track

- **ID:** `audit-gate-picomatch_20261118`
- **Type:** `chore`
- **Spec:** [`conductor/archive/audit-gate-picomatch_20261118/spec.md`](conductor/archive/audit-gate-picomatch_20261118/spec.md)
- **Plan:** [`conductor/archive/audit-gate-picomatch_20261118/plan.md`](conductor/archive/audit-gate-picomatch_20261118/plan.md)
- **Review:** [`conductor/archive/audit-gate-picomatch_20261118/review.md`](conductor/archive/audit-gate-picomatch_20261118/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Toolchain pin and narrow audit exception | Pin pnpm 12.21.0, add one dated GHSA ignore, commit mechanical lockfile rewrite | verified | `81d6c871795ccc4d7d95fd6a5dc8da7baada04dc` | pnpm commands were permission-denied to the phase subagent; the primary ran them and recorded outputs verbatim |
| 2: Coherent pnpm 12 documentation and CI comments | Refresh pnpm/audit wording in CI, tech-stack, CONTRIBUTING and Dockerfile | verified | `6f0a8e0ec996a14e684498e09807e2f4b53b5ed0` | `conductor/tech-stack.md` was primary-owned; the primary applied the four exact replacements after the subagent's write denial |

## Requirements

- [x] `FR-1` — pin `pnpm@12.21.0`; CI and Docker resolve it (`package.json:10`)
- [x] `FR-2` — one dated `audit.ignore` for GHSA-fc5q-39xc-vjpf with removal trigger (`pnpm-workspace.yaml:23-28`)
- [x] `FR-3` — refresh four stale docs/comments (`ci.yml`, `tech-stack.md`, `CONTRIBUTING.md`, `Dockerfile`)
- [x] `FR-4` — pnpm 12 install, mechanical lockfile rewrite, frozen install passes
- [x] `FR-5` — full verification green on final tree
- [x] `FR-6` — narrow diff, no player-facing source or dependency-version changes
- [x] `NFR-1` — no telemetry/storage/network/kid-UI changes
- [x] `NFR-2` — audit level stays `high`; `overrides` untouched; no broad/dev-only ignore
- [x] `NFR-3` — 80% coverage gate and all checks green
- [x] `NFR-4` — verification performed with pnpm 12.21.0
- [x] `AC-1` — exact pin, no stale pin
- [x] `AC-2` — audit exits 0; pre-change failure recorded
- [x] `AC-3` — exactly one GHSA with date, track id and removal trigger
- [x] `AC-4` — no stale wording in the four files
- [x] `AC-5` — frozen install and mechanical lockfile diff
- [x] `AC-6` — `pnpm check` and coverage pass
- [x] `AC-7` — build and full Playwright suite pass
- [x] `AC-8` — diff confined to toolchain config and four docs

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| lint | `pnpm exec biome check .` | pass (195 files, no fixes) | `conductor/archive/audit-gate-picomatch_20261118/verification/integrated.md` |
| typecheck | `pnpm exec tsc --noEmit` | pass | `verification/integrated.md` |
| unit | `pnpm test` | pass (57 files / 1009 tests) | `verification/integrated.md` |
| coverage | `pnpm test:coverage` | pass (97.05% stmts / 91.19% branches / 97.39% funcs / 98.86% lines) | `verification/integrated.md` |
| build | `pnpm build` | pass (Vite + PWA service worker) | `verification/integrated.md` |
| e2e | `pnpm exec playwright test` | pass (68 passed, 1 pre-existing `@ci` skip; tablet/phone/prod) | `verification/integrated.md` |
| audit | `pnpm audit --audit-level=high` | pass (`1 ignored: 1 high`, the dated exception) | `verification/phase-1.md`, `verification/integrated.md` |
| install | `pnpm install --frozen-lockfile` | pass with pnpm 12.21.0 | `verification/phase-1.md` |

## Review

- **Verdict:** `PASS`
- **Rounds:** 1
- **Fixed:** 0 findings
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- Phase 1: pnpm commands were denied to the phase subagent by the tool permission layer; the primary executed them and appended verbatim outputs to the phase brief and evidence. No command was worked around.
- Phase 2: `conductor/tech-stack.md` is primary-owned and could not be written by the subagent; the primary applied the four in-scope replacements and recorded them in `verification/phase-2.md`.
- Risk: the advisory has no published patch as of 2026-11-18. The dated ignore names GHSA-fc5q-39xc-vjpf, this track and the removal trigger ("remove when upstream patches it"); it must not be broadened or kept after a fix is released.

## Follow-ups

- none

## Rollback

```bash
# Squash commit
git revert --no-edit <squash-commit>
```

No migration, feature flag, or data changes. Reverting restores the pnpm 11 pin and the red audit gate; re-open an audit track if the advisory is still unpatched.
