# Pnpm 12 Toolchain and Audit Gate — Implementation Plan

> **Branch:** `chore/audit-gate-picomatch_20261118`
> **Base:** `main` @ `6bb8b93e3591d61be340455e7fd6a23d29645b4b`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Toolchain pin and narrow audit exception

- **Goal:** pnpm 12.21.0 is pinned and installs cleanly; `Gate · audit` is green with exactly one dated GHSA exception.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-4, NFR-2, NFR-4, AC-1, AC-2, AC-3, AC-5
- **Touches:** `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`
- **Verification:** `pnpm install --frozen-lockfile && pnpm audit --audit-level=high && pnpm check && pnpm test:coverage`
- **Status:** pending

- [ ] **P1.T1: Pin pnpm 12.21.0** — covers: FR-1
  - [ ] **P1.T1.1:** Set `packageManager` to `pnpm@12.21.0` in `package.json`
  - [ ] **P1.T1.2:** Run the install with pnpm 12.21.0 (self-update/corepack); keep any mechanical `pnpm-lock.yaml` rewrite and record it in evidence
- [ ] **P1.T2: Add the single audit exception** — covers: FR-2
  - [ ] **P1.T2.1:** Add `audit.ignore: [GHSA-fc5q-39xc-vjpf]` to `pnpm-workspace.yaml` using the current pnpm 11/12 key
  - [ ] **P1.T2.2:** Comment it with date `2026-11-18`, this track id, the advisory, and removal when upstream publishes a fix
  - [ ] **P1.T2.3:** Confirm no other ignore entries, no broad path/dev-only exemption, and no change to `audit.level`

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/audit-gate-picomatch_20261118/verification/phase-1.md
-->

## Phase 2: Coherent pnpm 12 documentation and CI comments

- **Goal:** every tracked pnpm/audit instruction describes pnpm 12 and `audit.ignore`; no stale pnpm 11 or `auditConfig.ignoreCves` wording remains.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-6, NFR-1, NFR-3, AC-4, AC-8
- **Touches:** `.github/workflows/ci.yml`, `conductor/tech-stack.md`, `CONTRIBUTING.md`, `Dockerfile`
- **Verification:** `pnpm check`
- **Status:** pending

- [ ] **P2.T1: Refresh the CI audit comment** — covers: FR-3
  - [ ] **P2.T1.1:** Replace the `auditConfig.ignoreCves` guidance in `ci.yml` with the `audit.ignore` policy (still dated, GHSA-named, track-named, never broad/dev-only)
- [ ] **P2.T2: Refresh tech-stack pin and audit policy** — covers: FR-3
  - [ ] **P2.T2.1:** Change the pnpm pin note to `pnpm ^12` / 12.21.0 and the audit exception key to `audit.ignore`
- [ ] **P2.T3: Refresh contributor and Docker wording** — covers: FR-3
  - [ ] **P2.T3.1:** `CONTRIBUTING.md`: pnpm 12 setup and `audit.ignore` policy
  - [ ] **P2.T3.2:** `Dockerfile`: stop calling `pnpm-workspace.yaml` a pnpm 11 settings file

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 2
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
