# Spec: E2E Stability & CI Efficiency (`e2e-stability_20260904`)

**Type:** Chore · **Branch:** `track/e2e-stability_20260904` · **Date:** 2026-09-04

## Overview

The wagon-workshop tablet/phone Playwright spec flakes on headless WebKit
(the `iPad Mini` / `iPhone 13` device profiles): `blob:` texture fetches get
blocked by access-control checks and trip the zero-console-errors assertion,
while all functional assertions pass. This
noise has survived three releases (v0.5.0–v0.7.0), repeatedly forcing
release-day judgment calls. Related: e2e runs only at release time, browsers
re-download every run, gates run sequentially, and docs-only commits trigger
full gates. This track kills the flake, codifies the stability lessons, and
makes CI faster and, crucially, upstream — so e2e flakes die at PR time, not
release day.

## Functional Requirements

### A. Flake fix (targeted allowlist)

- **A1.** Keep the zero-console-errors guardrail strict everywhere; do not
  remove or weaken any assertion.
- **A2.** Allowlist only the exact known-environmental console-error signature
  (the WebKit `blob:` texture fetch rejection — verbatim fingerprint from the
  wagon-workshop archive: `Fetch API cannot load blob:… due to access control
  checks`), matched by message fingerprint — not a blanket "ignore all
  errors."
- **A3.** The allowlist lives in the e2e harness in one place (e.g., a shared
  helper in `e2e/`), with a comment citing this track and the failure
  mechanism.
- **A4.** Any console error **outside** the allowlisted signature still fails
  the suite, exactly as today.

### B. Stability documentation

- **B1.** Codify the environmental-flake lessons in one durable place
  (`e2e/README.md`) — the `blob:`/headless-GPU mechanism, the `--workers=2`
  rerun convention (v0.5.0/v0.6.0/v0.7.0 lessons), and "ubuntu e2e is the
  release authority."
- **B2.** Cross-link from `tech-stack.md`'s Testing section so the convention
  is discoverable from the source of truth.

### C. CI: e2e on PRs

- **C1.** `ci.yml` gains an e2e job identical in substance to release gates:
  Playwright install + `pnpm build` + full suite, ubuntu runner.
- **C2.** The ubuntu e2e remains the release authority; PR e2e is upstream
  tripwire, not a replacement.
- **C3.** Flaky-in-PR handling follows the same `--workers=2` rerun convention
  as releases (documented per B1).

### D. CI: efficiency

- **D1.** Cache the Playwright browser bundle (keyed on the Playwright version
  from the lockfile) in both `ci.yml` and `release.yml`.
- **D2.** Parallelize gates: biome+typecheck, vitest, and e2e run as parallel
  jobs (PR pipeline: `check` / `vitest` / `e2e`; release gates mirror the
  structure).
- **D3.** Docs-only changes (markdown, `conductor/`, images) skip the heavy
  jobs; at minimum a trivial gate (or nothing) runs for docs-only paths.

## Non-Functional Requirements

- **N1.** No changes to `src/**` product code, no kid-facing behavior changes.
- **N2.** Privacy/perf guardrails untouched; the zero-console assertion
  semantics survive outside the allowlist (A4).
- **N3.** Follow `conductor/workflow.md`: non-logic track → acceptance via
  repeated e2e runs + manual verification, not TDD.

## Acceptance Criteria

1. The previously flaky wagon-workshop spec passes **3 consecutive** full-suite
   runs at `--workers=2` on Windows headless.
2. Full Playwright suite green on ubuntu (PR CI), including the `prod` e2e
   project.
3. Release dry run (`workflow_dispatch`, `dry_run: true`) green end-to-end:
   gates, image build, no publish/deploy.
4. A docs-only change commit produces no heavy CI jobs.
5. `pnpm check` (biome + typecheck + vitest) green — unchanged bar.
6. A deliberately injected *real* console error still fails e2e (proves A4 —
   allowlist didn't neuter the guardrail).

## Out of Scope

- Any change to product runtime code, assets, or app behavior.
- Root-cause fixes to blob:/CORS semantics of headless WebKit.
- Auditing every e2e spec for latent flakes beyond the known one.
- Branch protections / repo settings changes.
