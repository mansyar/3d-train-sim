# Pnpm 12 Toolchain and Audit Gate — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead.

## Overview

Upgrade the repo's pinned package manager from pnpm 11.24.0 to the current stable **pnpm 12.21.0**, and restore the red `Gate · audit` CI check with a single, dated exception for the unfixable dev-only `picomatch` advisory (GHSA-fc5q-39xc-vjpf). No player-facing behavior changes.

## Problem / Motivation

`Gate · audit` fails on an advisory with **no patched version** (GitHub advisory, reviewed 2026-11-17), reachable only through dev tooling (`vitest → vite → picomatch`). Separately, four repo documents still describe pnpm 11 / the obsolete `auditConfig.ignoreCves` key, which pnpm 11+ does not read. A red required check blocks the v1.0 "all six CI gates green" claim and any clean PR CI result.

## Goals & Success Metrics

- **Goal:** `pnpm audit --audit-level=high` exits 0 with exactly one narrow GHSA exception; the pnpm 12 pin is reproducible in CI, Docker and local installs; full verification stays green.
- **Metric:** green audit gate, exact pnpm pin in `package.json`, clean `pnpm install --frozen-lockfile`, and all configured verification layers passing.

## Scope

### In Scope

- Pin `pnpm@12.21.0` in `package.json` and install with pnpm 12.21.0; commit any mechanical lockfile rewrite.
- Add one `audit.ignore` entry for GHSA-fc5q-39xc-vjpf with a dated comment naming this track and its removal trigger.
- Refresh pnpm/audit wording in `.github/workflows/ci.yml`, `conductor/tech-stack.md`, `CONTRIBUTING.md`, and `Dockerfile`.
- Run the full configured verification matrix and record evidence.

### Out of Scope

- Dependency upgrades other than the pnpm toolchain; changes to `overrides`, `audit.level`, or CI job structure.
- Broad path or dev-only exemptions; player-facing source changes; a guarding unit test (explicitly declined).

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Pin `packageManager` to `pnpm@12.21.0`; CI (`action-setup@v4`) and Docker (`corepack enable`) resolve that pin. | must |
| FR-2 | Add exactly one exception: `audit.ignore: [GHSA-fc5q-39xc-vjpf]` in `pnpm-workspace.yaml`, with a dated comment naming this track, the advisory, and removal when upstream patches it. No broad path/dev-only exemption, no level lowering. | must |
| FR-3 | Update stale pnpm/audit wording in `.github/workflows/ci.yml`, `conductor/tech-stack.md`, `CONTRIBUTING.md`, `Dockerfile` to pnpm 12 and `audit.ignore`. | must |
| FR-4 | Install with pnpm 12.21.0; commit any mechanical lockfile rewrite; `pnpm install --frozen-lockfile` passes cleanly. | must |
| FR-5 | Full verification passes on the final tree: `pnpm check`, `pnpm test:coverage`, `pnpm build`, `pnpm exec playwright test`, `pnpm audit --audit-level=high`. | must |
| FR-6 | Keep the diff limited to toolchain config, workspace config, lockfile, and the four documents; no player-facing source or dependency version changes. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No new telemetry, storage keys, network calls, or kid-UI changes; privacy posture unchanged. |
| NFR-2 | Audit level stays `high`; `overrides` untouched; no broad or dev-only ignore. |
| NFR-3 | Coverage gate remains ≥80% on `src/core` + `src/state`; all configured checks remain green. |
| NFR-4 | Verification requires pnpm 12.21.0 locally (`pnpm self-update 12.21.0` / corepack); running pnpm 11 would test the wrong pin. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `package.json` has `pnpm@12.21.0`; no `pnpm 11` pin remains in tracked files. | FR-1 |
| AC-2 | `pnpm audit --audit-level=high` exits 0 with no high/critical advisories outstanding; pre-change failure is recorded as evidence. | FR-2 |
| AC-3 | `audit.ignore` contains only GHSA-fc5q-39xc-vjpf; comment carries date 2026-11-18, track id, advisory id, and removal trigger. | FR-2 |
| AC-4 | The four named files contain no `auditConfig.ignoreCves` / "pnpm 11" wording; CI comment names `audit.ignore`. | FR-3 |
| AC-5 | `pnpm install --frozen-lockfile` with pnpm 12.21.0 exits 0; any lockfile diff is mechanical and committed. | FR-4 |
| AC-6 | `pnpm check` and `pnpm test:coverage` pass (80% gate). | FR-5 |
| AC-7 | `pnpm build` and full `pnpm exec playwright test` pass. | FR-5 |
| AC-8 | `git diff` touches only files named in FR-1/FR-3/FR-4 (plus track artifacts); no dependency version or player-facing source changes. | FR-6 |

## Edge Cases

- Advisory patched before merge: drop the exception entirely instead of shipping a stale ignore.
- pnpm 12 rejects an unrecognized workspace setting: fix the setting; never suppress the error.
- Frozen-lockfile mismatch: regenerate and commit the lockfile; never relax CI to `--no-frozen-lockfile`.
- `engineStrict` failure: investigate the dependency; do not disable engine checks.
- Typo or multiple GHSA entries: reject; exactly one advisory id is permitted.
- Registry outage: the audit gate fails by design (documented behavior, out of scope).

## Dependencies

- **Tracks:** none
- **External:** npm registry, availability of pnpm 12.21.0, current GitHub advisory status for GHSA-fc5q-39xc-vjpf. No patched `picomatch` version exists as of 2026-11-18.

## Open Questions & Assumptions

- **Assumption:** pnpm 12.21.0 is compatible with Node 24 and Vite 8; proven by AC-6/AC-7 before merge.
- **Assumption:** `pnpm/action-setup@v4` reads the `packageManager` field, so workflow setup steps need no rewrite beyond their comment.
- **Assumption:** the advisory remains unpatched at implementation time; if it is patched mid-track, the exception is removed.
- **Question:** none unresolved. `conductor/product.md` defines no separate Open Questions section.

## References

- `https://github.com/advisories/ghsa-fc5q-39xc-vjpf` (high, affected `<= 4.0.7`, patched versions `None`, reviewed 2026-11-17).
- `https://pnpm.io/migration-v11` and `https://pnpm.io/blog/whats-different-in-pnpm-12` (same lockfile and workspace format; unrecognized settings become errors).
- npm dist-tags: `latest` and `latest-12` = `12.21.0`; `next-12` = `12.22.0` (pre-release).
- `ci.yml` audit comment, `conductor/tech-stack.md` line 19, `CONTRIBUTING.md`, `Dockerfile`, local `pnpm audit --audit-level=high` output.
