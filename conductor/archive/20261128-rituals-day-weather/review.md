# Review: A. Rituals — Deepen the Day/Weather Clock

- **Track:** `20261128-rituals-day-weather`
- **Type:** `feature`
- **Branch:** `feat/20261128-rituals-day-weather`
- **Range:** `c368d22d1f83c6579c8187fdca3f650f4164192d..12ffd0e837730a05c8a59e4f7999c7294df670e3`
- **Date:** `2026-11-28T04:09:43+11:00`
- **Verdict:** `PASS`

## Summary

Five phases of greeting work are well-tested and green across every layer, but
round 1 found two High defects that block the ship: a mid-greeting cross-family
transition overlaps stages and lets a stale timer clobber the new greeting's
voice (FR-8 broken at the edge the spec calls out), and the evidence spec
hard-codes a Windows-only ffmpeg path that cannot pass on the ubuntu release
authority (AC-4/AC-8 at risk on CI). Both are concrete, in-scope, and fixable —
a Review Fixes phase (R1) is appended below the History.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm check` | pass — 62 files / 1069 tests | `verification/integrated.md` |
| coverage | `pnpm test:coverage` | pass — 97.23/91.51/97.51/98.97, gate ≥80% | `verification/integrated.md` |
| lint | `pnpm check` (biome, 219 files) | pass | `verification/integrated.md` |
| typecheck | `pnpm check` (tsc) | pass | `verification/integrated.md` |
| build | `pnpm build` | pass — precache 178 entries | reviewer brief |
| e2e | `pnpm exec playwright test` (full matrix) | pass — 98 passed, 1 skipped | `verification/integrated.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1/T2 | `src/state/rituals.test.ts` | covered |
| FR-2 | P2.T2 | `e2e/rituals-day.spec.ts` | covered |
| FR-3 | P2.T3 | `e2e/rituals-day.spec.ts` | covered |
| FR-4 | P2.T4 | `e2e/rituals-day.spec.ts` | covered |
| FR-5 | P3.T1 | `e2e/rituals-night.spec.ts` | covered |
| FR-6 | P3.T2 | `e2e/rituals-night.spec.ts` + audio spec | covered |
| FR-7 | P4.T1/T2 | `src/audio/rituals.test.ts` | covered |
| FR-8 | P1.T2, P5.T2 | unit + `e2e/rituals-settle.spec.ts` | **partial — F1** (mid-greeting edge untested and broken) |
| FR-9 | P3.T3, P5.T1 | `e2e/rituals-reduced-motion.spec.ts` | covered |
| FR-10 | P4.T3, P5.T3 | `e2e/rituals-audio.spec.ts` + offline spec | covered |
| NFR-1 | P2.T1.1 | in-browser cap asserts | covered |
| NFR-2 | P4, P5.T3 | offline spec, precache unchanged | covered |
| NFR-3 | P2.T1.1 | no async loads by construction | covered |
| NFR-4 | P5 | full matrix incl. perf specs green | covered |
| NFR-5 | P1–P4 | `pnpm test:coverage` | covered |
| NFR-6 | P1.T3 (comment-only, reasoned) | `frame-contract.ts` comments | covered |
| AC-1 | P1 | unit + day/night specs | covered |
| AC-2 | P2, P3 | day/night screenshots | covered |
| AC-3 | P5.T4 | `evidence/` PNGs | covered |
| AC-4 | P5.T4 | `evidence/greeting-cycle.gif` | **at risk — F2** (bundle cannot regenerate on Linux CI) |
| AC-5 | P5.T2 | `e2e/rituals-settle.spec.ts` | covered |
| AC-6 | P5.T1 | `e2e/rituals-reduced-motion.spec.ts` | covered |
| AC-7 | P1–P5 | `pnpm check` green | covered |
| AC-8 | P5.T3 | full matrix + offline/prod green | **at risk — F2** |

## Findings

### Critical

- <none>

### High

- **F1 — In-flight greeting does not yield to a cross-family transition**
  - **File:** `src/scene/rituals/dusk-night.ts:139-161` (mirror: `src/scene/rituals/day.ts:97-103,145-154`)
  - **What:** Each stage ignores director events it does not own (early return,
    local `active` kept), so a night greeting keeps rendering while the new dawn
    greeting starts. Worse, each stage calls `director.release()`
    unconditionally on its own timeout, clearing the NEW greeting's shared voice.
  - **Why:** Violates FR-8 single-voice and the spec's mid-greeting-yield edge;
    overlap plus a clobbered voice.
  - **Fix:** On any unowned director event, clear local active/level and hide
    actors (mirror the `applyResting` else-branch). Guard `release()`: only call
    it when the released greeting is still the one this stage fired (compare
    against director state or an ownership token).
  - **Requirement:** FR-8
  - **Test gap:** Mid-greeting transition test — fire night, wait for level>0.8,
    transition to dawn, settle, assert day active with night level 0/counts 0
    and exactly one voice transition.

- **F2 — Evidence spec hard-codes a Windows-only ffmpeg path**
  - **File:** `e2e/rituals-evidence.spec.ts:36-37`
  - **What:** `ffmpeg` resolved via a user-absolute Windows path in `afterAll`.
  - **Why:** ENOENT on the ubuntu-24.04 release authority fails the suite,
    breaking the full-matrix-green claim on CI (AC-4/AC-8).
  - **Fix:** Resolve from `PATH` with an `FFMPEG` env override
    (`process.env.FFMPEG ?? 'ffmpeg'`); fail with a clear message when
    unavailable. Never commit a user-absolute binary path.
  - **Requirement:** AC-4
  - **Test gap:** None (harness fix); CI tablet run of the evidence spec is proof.

### Medium

- <none>

### Low

- <none>

## Overrides

- <none>

## Plan compliance

All five phases verified with checkpoints (`d3099f0`, `d35b17b`, `c450027`,
`183d07f`, `2f3a5fd`) and evidence files; every task box checked; final diff
stays within the union of phase Touches plus recorded deviations (frame-contract
comment-only, songbook path, evidence allowlist, GIF format decision). The
attempt-1 scope spill into `phase-4.md` was repaired by the primary. FR-8's
partial status is a test-design gap, not a plan-compliance failure.

## Out of scope

- Pre-existing horizon black polygon (noted in Phase 2, untouched by design).
- The transient `toybox-clarity` WebGL flake (seen once under load, never
  recurred, unrelated paths).
- The reduced-motion path already clears non-owning stages correctly — cited by
  the reviewer as the reference behavior for the F1 fix, not a finding itself.

## Debt

- <none> — strict mode: both findings enter the fix phase, no deferrals.

## Doc sync

`none` — R1 changed product code and specs only; no product/tech-stack/workflow
changes, and the resolved GIF assumption was already traced in plan P5.T4.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 2 | 0 | 0 | 0 |
| 1 (fix delta `8ee5b6a..07b0875`) | PASS | 0 | 0 | 0 | 0 | 2 |
