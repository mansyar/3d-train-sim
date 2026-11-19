# Phase 2 Verification — Visible station/wagon hand-off and verification

- Track: `station-cargo-clarity_20261120` (Station Cargo Clarity)
- Phase: 2 — Visible station/wagon hand-off and verification
- Date: 2026-11-20
- Branch: `feat/station-cargo-clarity_20261120`
- Phase base: `8023802faa0e45d998feb022ec4cadab731dc878`
- Head at verification: `3c8242e27340eb6b5dab0f42ee17f47138549277` (code head; this
  evidence file is committed after it)
- Result: **verified**

## What changed

A short crate arc now carries the hand-off in both directions. On a station
load the crate leaves the station's next platform slot and lands on the wagon
bed; on delivery it leaves the wagon bed and lands on the next platform slot.
Both use the Phase 1 pure helper (`transferPoint`, `arcLift`, `transferProgress`,
`resolveTransferProgress`) with one reused travel crate and preallocated
endpoints — no per-frame allocation, no new state, no new key. Reduced motion
keeps the original instant state change; a removed station or a stopped ride
resolves progress to 1 so the crate snaps home with no orphan mesh.

The persisted delivery count still increments exactly once at the arc's end,
the confetti cue is unchanged, and the platform pile stays capped at eight via
the existing `MAX_DELIVERED_CRATES` and track-renderer sync. Two dev/e2e
witnesses on `window.__tinyTracksScene` (`cargoTransfer`, `forceCargoStation`)
let the specs observe the arc and drive a deterministic reduced-motion stop.

## Commands

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| Style + types + unit | `pnpm check` | 0 | Biome clean (200 files), `tsc --noEmit` clean, Vitest 58 files / 1029 tests passed |
| Production build | `pnpm build` | 0 | vite v8.3.6 built in 2.26 s; PWA precache 178 entries |
| Targeted e2e | `pnpm exec playwright test e2e/cargo.spec.ts e2e/ride-toybox-flow.spec.ts e2e/a11y.spec.ts` | 0 | 9 passed on 2 workers (tablet + phone); both new arc tests passed |
| **Full verification command** | `pnpm check && pnpm build && pnpm exec playwright test e2e/cargo.spec.ts e2e/ride-toybox-flow.spec.ts e2e/a11y.spec.ts` | **0** | All three layers green in sequence |

New e2e cases in the run:

- `e2e/cargo.spec.ts:345` — `load and delivery crates arc between the platform
  slot and the wagon bed` (18.6 s, passed)
- `e2e/cargo.spec.ts:443` — `reduced motion skips the crate arc but still
  delivers exactly once` (2.5 s, passed)

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| AC-2 | Tablet station load shows a short wordless crate arc from platform slot to wagon bed | New tablet spec samples `kind:'load'` with progress span > 0.15, spot travel > 0.05, and origin→destination spot ordering | verified |
| AC-3 | Delivery arc visible; persisted count increments exactly once | Same spec samples `kind:'deliver'` with the same travel proofs; existing cargo spec keeps the count across reload; reduced-motion spec asserts `before + 1` | verified |
| AC-4 | Reduced motion: instant change, no travel mesh, delivery still counts | Reduced-motion spec asserts `cargoTransfer()` is null after both forced stops and `deliveryCount` is `before + 1`; confetti remains gated by the existing `!reducedMotion` predicate | verified |
| AC-5 | Cancel-and-snap on station removal / ride stop leaves no orphan mesh | `tickTransfer` resolves progress via `resolveTransferProgress(elapsed, stationGone \|\| rig.anchor === '')`; progress 1 calls `finishTransfer`, which hides the stand-in and settles the wagon crates. Pure cancel branch unit-tested in Phase 1 | verified (code path + Phase 1 helper test) |
| AC-6 | No save-format/key/telemetry/dependency change; core helper untouched | `git diff --stat 8023802..HEAD` lists only four in-Touch files; `package.json`, `pnpm-lock.yaml`, `src/core/cargo-transfer.ts`, and the world/snapshot schemas are unchanged; no new storage key | verified |
| AC-7 | Verification chain green (unit, build, targeted tablet/phone/a11y e2e) | Exact command above exit 0: 1029 unit tests, successful build, 9 Playwright tests. Full matrix (coverage gate, perf, axe, prod, phone, audit) is captured by the primary in `verification/integrated.md` | verified (scoped chain; matrix in integrated.md) |
| AC-8 | No sky, train-length, piece-type, kid-text, parent-gate, viewport or clarity measured-value change | Diff scope confined to cargo scene/view files and tests; none of the named subsystems or `conductor/archive/clarity-audit_20261110/comparison.md` changed | verified |
| NFR-1 | No per-frame allocation in the arc math | `transferPoint` writes into a preallocated `spot`; endpoints are allocated once at hand-off start; witness objects are created only on the e2e read | verified |
| NFR-2 / NFR-4 / NFR-5 / NFR-6 | View-only, reduced motion, full matrix, confined diff | Covered by AC-4, AC-6, AC-7 and AC-8 above; full matrix is the primary's integrated run | verified (scoped) |

## Scope guard proof

`git diff --stat 8023802..HEAD` at verification time:

```
 e2e/cargo.spec.ts        | 185 ++++++++++++++++++++++++++++++++++++++++++++++
 src/scene/init-scene.ts  |  54 ++++++++++++++++++++-
 src/scene/rig-cargo.ts   | 188 ++++++++++++++++++++++++++++++++++++++----
 src/scene/train-fleet.ts |   3 +
 4 files changed, 416 insertions(+), 14 deletions(-)
```

Only the four Phase 2 Touch files changed. `package.json`, `pnpm-lock.yaml`,
`src/core/cargo-transfer.ts`, `src/state/world.ts`, any snapshot/serialization
schema, and the clarity comparison are all absent from the diff. No clarity
numbers are filled in and no 3/3-child v1.0 gate is claimed here. Full-matrix
results are recorded by the primary in `verification/integrated.md`.

## Evidence paths

- This report: `conductor/tracks/station-cargo-clarity_20261120/verification/phase-2.md`
- Arc implementation: `src/scene/rig-cargo.ts`
- Per-frame wiring: `src/scene/train-fleet.ts`
- Witness + slot resolver: `src/scene/init-scene.ts`
- e2e assertions: `e2e/cargo.spec.ts`

## Deviations

None. All changes are inside the Phase 2 Touches.

## Notes

- The travel crate is a single clone of the crate template, parented to the
  scene and positioned in world space. Its scale is copied from the riding
  crate so it reads as the same toy at both ends.
- Slot positions are resolved from the actual `station_crate_N` meshes with a
  nearest-to-cell match, so persisted slot visibility remains owned by the
  existing `syncStationCrates` (not edited).
- `forceCargoStation` exists because reduced motion renders one static frame:
  no real station stop advances, so the spec drives the exact cargo handler the
  ride uses. It does not fabricate the world's count.
- Pre-existing Vite `configLoader: 'native'` and `THREE.WebGLShadowMap`
  deprecation warnings remain; both are outside Touches and unrelated.
- The untracked `conductor/runs/` directory belongs to the primary's brief and
  was not added to any commit.

## Rework 1 — flaky reload count (2026-11-20)

### Flake observed

The primary re-ran the exact verification command and it failed at the reload
assertion of `the wagons load, deliver, keep the count across a reload, and
nothing with no station`: expected saved count `1`, received `0`. An isolated
`--repeat-each=3` reproduced it twice-pass/once-fail with the identical error,
confirming a genuine race rather than a one-off. The original Phase 2 report
claimed a single green run; that green was not reliably reproducible.

### Root cause

Two compounding timing issues, both in the original Phase 2 design:

1. The persisted `world.deliverCrate(stationId)` was deferred to the end of the
   0.5 s visual arc. A reload during the arc therefore lost the delivery
   entirely — the visible cue outlived the committed state.
2. Even once the count advanced, `watchWorldPersistence` saves through a
   fire-and-forget async IndexedDB write. The old e2e step reloaded immediately
   after reading the live count, so it could race the write and boot from a
   snapshot taken before the delivery. The single-shot `expect(...).toBe(count)`
   also assumed hydration had already applied on `__tinyTracksReady`.

### Fix (within Touches)

- `src/scene/rig-cargo.ts`: `handleStation` now settles the ledger
  (`world.deliverCrate`) and the confetti cue at the **station stop**, before the
  arc starts. The arc is purely a visual cue: `finishTransfer` only hides the
  stand-in and settles wagon crate visibility, so a cancel/snap or a new stop
  cannot double-count. The destination slot is captured from `deliveryCount`
  before the increment, so the crate still lands on the slot that just lit up.
  Reduced motion and mesh-less fallbacks keep the original instant state path.
- `e2e/cargo.spec.ts`: before reloading, a new `savedDeliveryCount` helper polls
  IndexedDB (`tiny-tracks` / `worlds` / `current`) until the **exact** saved
  count equals the live count; only then does the reload happen. After reload,
  `expect.poll` still asserts the exact saved count (not a weaker ">0"). A new
  spec, `the count settles at the station stop, before the arc finishes`,
  proves the count is `before + 1` while the delivery arc is still in flight and
  that stopping the ride cancels the arc without a second count or orphan mesh.

No assertion was weakened, and the count-exactly-once, confetti, reduced-motion
and cap-at-eight semantics are unchanged. No Conductor state file, save schema,
storage key, dependency, or clarity comparison was touched.

### Re-run results

| Command | Exit | Summary |
|---------|------|---------|
| `pnpm check && pnpm build && pnpm exec playwright test e2e/cargo.spec.ts e2e/ride-toybox-flow.spec.ts e2e/a11y.spec.ts` | 0 | Biome/tsc/1029 unit tests green; build green; **10 passed** on 2 workers (tablet + phone), including all four cargo specs and the new stop-settled spec |
| `pnpm exec playwright test e2e/cargo.spec.ts --repeat-each=3` | 0 | **18 passed** (6 specs x 3 runs). The previously flaky reload spec passed in all three repetitions |

The first command was also run standalone as `pnpm check` immediately before
the full chain (exit 0). Code head at these re-runs:
`6eec19cf4293f676393c1bb1ab5cf4647082cc24`; this evidence file is committed
after it. Rework commits: `620c775` (scene fix), `6eec19c` (e2e fix and new spec).

### Rework scope guard

`git diff --stat 8023802..HEAD` at rework verification time:

```
 .../verification/phase-2.md                        | 103 +++++++
 e2e/cargo.spec.ts                                  | 297 ++++++++++++++++++++-
 src/scene/init-scene.ts                            |  54 +++-
 src/scene/rig-cargo.ts                             | 184 ++++++++++++-
 src/scene/train-fleet.ts                           |   3 +
 5 files changed, 629 insertions(+), 12 deletions(-)
```

Still only the four code/test Touch files plus this evidence file. No new
clarity numbers or child-gate claims are made here; full matrix results remain
the primary's `verification/integrated.md`.

## Primary verification

- **Exact command (re-run after rework):** `pnpm check && pnpm build && pnpm exec playwright test e2e/cargo.spec.ts e2e/ride-toybox-flow.spec.ts e2e/a11y.spec.ts`
- **Exit code:** 0 — Biome 200 files clean, `tsc --noEmit` clean, 58 files / 1029 unit tests passed, build green, **10 Playwright tests passed** on 2 workers (tablet + phone), including the new stop-settled spec.
- **Stability proof (primary re-run):** `pnpm exec playwright test e2e/cargo.spec.ts --repeat-each=3` exit 0, **18 passed / 18** — the previously flaky reload step is now stable across three repetitions.
- **Tree/diff check:** `git status --porcelain` clean apart from untracked `conductor/runs/`; `git diff --name-only 8023802..HEAD` = exactly the four code/test Touch files plus this evidence file.
- **Squash guard:** commit range `bd92490`, `3b453c3`, `3c8242e`, `d8dfa29`, `620c775`, `6eec19c`, `3812158` matches the report; no merge/user commits. Phase accepted at checkpoint after squash.
- **Note:** The pre-rework summary lines above (head `3c8242e`, "9 passed", "count increments at arc's end") are superseded by `## Rework 1` and this section; the authoritative final behavior is count-settled-at-station-stop with a purely visual arc.
