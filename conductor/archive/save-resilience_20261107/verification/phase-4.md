# Phase 4 — End-to-end recovery proof — Verification

- **Track:** save-resilience_20261107
- **Phase:** 4 — End-to-end recovery proof
- **Date:** 2026-11-07
- **Branch:** `fix/save-resilience_20261107`
- **Base commit:** `a6b97e2119e32898c62185e3c02fe007642fcad6`
- **Head commit (verified):** `7199d4518e9fcae5cc65a337b25958c7afd4af34`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| task P4.T1 | `pnpm exec playwright test e2e/save-recovery.spec.ts` | 0 | 6 passed (3 specs × tablet + phone), 33.9 s |
| task P4.T2 | `pnpm exec playwright test e2e/save-recovery.spec.ts` | 0 | 8 passed (4 specs × tablet + phone), 31.2 s |
| phase verification | `pnpm exec playwright test e2e/save-recovery.spec.ts` | 0 | 8 passed (4 specs × tablet + phone), 31.2 s — the T2 run is the final recorded run |

The exact command from the brief, `pnpm exec playwright test
e2e/save-recovery.spec.ts`, was used unchanged for every run. The T2 run is the
phase verification: the spec had already grown its fourth test when it ran, and
no file changed between that run and this report.

### Project results (final run)

| Project | Device profile | Tests | Result |
| --- | --- | --- | --- |
| `tablet` | iPad Mini, 768 × 1024 | 4 | 4 passed |
| `phone` | iPhone 13, 390 × 844 | 4 | 4 passed |

**Browser:** WebKit — Playwright `1.62.1` bundled build (`webkit-2336`),
headless, driven through the device profiles above. These are browser emulation
profiles, not physical devices; no device-level or performance claim is made.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | A v3 snapshot with valid pieces plus one malformed entry boots with every valid piece, the malformed one skipped, status `salvaged`. | Seed `worlds/current` with three dry-land pieces and one piece of type `not-a-piece`, then reload: `__tinyTracksWorld.pieces()` is exactly `piece-1`, `piece-2`, `piece-3`; `piece-99` is absent. The companion note test proves the `salvaged` status with a dropped count of one. | pass |
| AC-3 | With an unreadable `current`, the previous snapshot loads, status `restored`. | Seed `current` with the string `garbage` and `previous` with a readable two-piece v3 snapshot, then reload: the meadow holds exactly `piece-10` and `piece-11`, and the gate note reads `Your meadow was restored from the last good save.` | pass |
| AC-7 | e2e: corrupt `current`, boot, hold the gate, see the note, dismiss it, and it stays dismissed for the session. | Seed the salvage snapshot, reload, hold `.parent-gate` for 2.1 s: `.recovery-note` is visible with the exact text `We saved your meadow and skipped 1 broken toy.`; clicking `.recovery-dismiss` hides it; a tap outside disarms the tray; re-holding reopens `.preset-tray` with the note still hidden. | pass |
| AC-8 | Both slots corrupt or absent: the starter meadow loads, status `fresh`, no thrown error. | Clear both slots and reload, recording the fresh boot's piece ids; then write the unreadable payload `garbage` to both `current` and `previous` and reload: the same piece ids are present, and the collected console/page errors stay empty. | pass |

## Behaviour as implemented

- `e2e/save-recovery.spec.ts` seeds real IndexedDB in the page context and boots
  the unmodified dev app; no `src/**` change was needed.
- Seeding follows the brief: the page first reaches `window.__tinyTracksReady`,
  then opens `tiny-tracks` without an upgrade handler (the app owns store
  creation), writes raw payloads with a `readwrite` transaction on `worlds`, and
  the test reloads.
- One ordering hazard is handled explicitly: a first boot saves the seeded
  starter asynchronously, so a seed written immediately after readiness can be
  overwritten by that pending save. `waitForStoredCurrent` waits until `current`
  exists before overwriting, which makes the boot's `salvaged` / `restored` /
  `fresh` reads deterministic rather than timing-dependent.
- The salvage payload is structurally readable (`version: 3`, `pieces`,
  `scenery`) with one invalid type, so the loader skips one toy and returns a
  one-drop salvage — the note's singular wording is asserted verbatim.
- The gate choreography uses the real pointer path: `page.mouse` down at the
  gate's centre, a 2.1 s hold (the gate's own threshold is 2 s), release, and
  the gate's suppression of its own release click is what leaves the tray
  armed.
- The disaster test compares the corrupted-boot piece ids against the same
  browser's genuinely fresh boot, so it does not hard-code the starter layout.
- `e2e/helpers.ts` was not changed: the existing `watchConsoleErrors` was
  sufficient, and the seeding helpers are specific to this spec.

## Evidence paths

- `e2e/save-recovery.spec.ts` — four tests: salvage, restore, note dismissal,
  fresh-meadow disaster
- `conductor/tracks/save-resilience_20261107/verification/phase-4.md` — this
  report

No screenshots or traces were needed; every assertion is made through the live
world handle, the gate DOM, or the console collectors.

## Deviations

None. Only `e2e/save-recovery.spec.ts` was added; `e2e/helpers.ts` needed no
extension, and no file outside `Touches` was modified.

## Primary verification

- **Commands:** `pnpm exec playwright test e2e/save-recovery.spec.ts` and
  `pnpm check`.
- **Results:** 8 passed in 29.4 s (four specs across `tablet` and `phone`), and
  Biome 163 files clean, `tsc --noEmit` clean, Vitest 42 files / 784 tests.
- **Independent fix:** the submitted spec failed `pnpm check` on Biome
  formatting (a chained `db.transaction(...).objectStore(...).get(...)` call);
  the primary ran `biome check --write` (one line only) before verifying.
- **Tree:** clean before the formatting fix; only `e2e/save-recovery.spec.ts`
  changed afterwards.
- **Diff:** `a6b97e2..HEAD` touched only the two files in `Touches` (helpers were
  not needed) plus this evidence file.
- **Diff review:** the spec seeds IndexedDB from the page context after the boot
  autosave commits, asserts exact piece ids for salvage and restore, holds the
  real 2 s gate for the note, proves session-scoped dismissal, and proves the
  both-slots-corrupt path lands on the starter with no console errors. No
  `src/**` change.

## Notes


- Every test sets `test.setTimeout(60_000)` because each one performs two app
  boots and (in the gate tests) two real-time 2.1 s holds. No Playwright retries
  are configured or added inside the spec; the runs above passed on the first
  attempt.
- The restored status is not exposed on `window`; the gate note is the only
  browser-visible witness, so the restore test asserts both the world contents
  and the restored wording.
- Task commits: `aa37511` (P4.T1 — salvage, restore, notice), `7199d45` (P4.T2
  — both-slots-corrupt disaster path). This evidence file is committed after
  the verified head.
- The run's Vite dev-server log shows only the pre-existing Three.js
  `PCFSoftShadowMap has been deprecated` warning at boot; it is not a console
  error and is outside this phase.
