# Phase 3 — Documentation and measurement

**Performed by:** primary agent. This phase's only file is `conductor/tech-stack.md`, which the phase subagent is
denied by its permissions, so the primary wrote it directly.

## Commands

| Command | Exit | Result |
|---|---|---|
| `pnpm check` | 0 | Biome clean (181 files), `tsc --noEmit` clean, 51 files / 892 tests |
| `pnpm build` (HEAD) | 0 | PWA `generateSW`, **178 precache entries**, **10,643.46 KiB** |
| `pnpm build` (base `410a1c3`, detached worktree) | 0 | 178 precache entries, 10,641.84 KiB |
| gzip of emitted JS, both trees | — | base **218,122 B** → HEAD **218,668 B**, delta **+546 B** |

## What the tech stack now records

- **Folder map:** a "Frame contract (2026-11-08)" block under the track stack listing `frame-contract.ts`
  (`FRAME_SYSTEM_ORDER` — twelve names, one reason each — plus `FrameInputs`/`FrameSystem` and
  `createFrameRunner` with its fail-fast order check and in-place tick counters; no three.js import, so the test
  runs headless) and `frame-contract.test.ts` (order, error messages, one tick per run, publish-then-read). The
  block states the rule that matters: moving a system is a behaviour change, not a refactor.
- **E2E row:** `e2e/frame-contract.spec.ts` recorded as the witness — names equal the documented order, one
  tick per animation frame — with the two operational caveats: tablet only (the phone allowlist excludes it) and
  reduced motion (one static frame, so it fails at the floor rather than passing falsely).

## Acceptance criteria

| ID | Evidence |
|---|---|
| FR-11 / AC-7 | The two `conductor/tech-stack.md` edits above; both name the module, the order, the fail-fast rule and the proof. |
| FR-12 / NFR-4 | Diff since base touches no `src/core` file, adds no dependency and does not change the lockfile. Gzip delta is **+546 B**, inside the ≤1 KB budget. |
| NFR-5 | Precache entries unchanged at 178; unit suite grew only by this track's own tests (883 → 892). |

## Notes

- The base build was measured in a throwaway `git worktree` at `410a1c3` installed with
  `pnpm install --offline --frozen-lockfile` (11.3 s from the store), so the delta compares like with like.
  The worktree and its directory were removed afterwards.
- The +546 B gzip is the honest cost of the contract: a new module, chapter-length reason comments, and a
  restructured `onFrame`. No asset, dependency or precache entry changed.
- Nothing in this phase touched code, so `pnpm check` here is a regression guard on the documentation commit
  only.
