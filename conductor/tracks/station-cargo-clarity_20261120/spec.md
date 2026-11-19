# Station Cargo Clarity — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track makes the station cargo moment visually readable for a toddler. Today the pure cargo loop and persisted delivery count work, but crates appear and disappear instantly: `rig-cargo.ts` pops wagon crates into view on load and hides them on delivery, while `track-placement.ts` flips a platform crate visible after the count changes. The parent reported that picking up a box at one station and delivering it at another does not look natural. This track adds a short, gentle, wordless crate arc between the platform slot and the wagon bed for both load and delivery, without changing save data, telemetry, kid UI rules, or the v1.0 gate claims.

## Problem / Motivation

- A child sees a crate appear on the wagon at one stop and vanish at the next; the causal link between station, wagon, and delivered pile is weak.
- The cargo loop is central to the toy train fantasy, so an unclear hand-off makes the ride harder to follow even though the data layer is correct.
- The fix must stay within product guidelines: no reading, no new touch gestures, no parent-only controls, no fail states, and no new storage keys.
- This is informal parent feedback, not a measured clarity result. The formal clarity comparison stays `awaiting observation`; no three-child gate is claimed.

## Goals & Success Metrics

- **Goal:** A crate visibly travels between station platform and wagon bed on both load and delivery, so the hand-off reads without text.
- **Metric:** Unit tests prove deterministic arc timing/path; one tablet e2e proves visual continuity for load and delivery; the full configured matrix, perf budget, and axe sweep stay green.
- **Goal:** Preserve the existing cargo data contract and reduced-motion behavior.
- **Metric:** No snapshot key, save-format, telemetry, dependency, or `CargoLoad`/`CargoAction`/`deliveredCountAfter` semantic change; reduced motion snaps instantly and still counts the delivery.

## Scope

### In Scope

- A short, gentle crate arc from station platform slot to wagon bed on station load.
- A short, gentle crate arc from wagon bed to station platform slot on delivery.
- Pure, deterministic timing/path helpers with no per-frame allocation.
- Instant fallback when reduced motion is enabled.
- Cancel-and-snap behavior when the station or ride disappears mid-transfer.
- Unit tests for the helper and e2e proof of visual continuity, plus the full configured verification matrix.

### Out of Scope

- Richer sky, weather, clouds, sun, or thunder (feedback #4).
- Longer trains or extra wagons (feedback #5).
- New track piece types, new icons, toybox layout changes, or deletion changes.
- Kid-readable text, labels, instructions, new touch gestures, parent-gate changes, viewport changes, or zoom policy changes.
- Telemetry, network calls, analytics, new dependencies, new IndexedDB stores, or new save keys.
- Changing `MAX_DELIVERED_CRATES`, `CargoLoad`, `CargoAction`, `actionAtStop`, `loadAfterAction`, `deliveredCountAfter`, or the persisted `deliveries` ledger.
- Filling in measured clarity values or claiming the 3/3-child v1.0 gate.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | On station load, a crate visibly travels by a short arc from the station's next platform slot to the wagon bed before the loaded state settles. | must |
| FR-2 | On delivery, a crate visibly travels by a short arc from the wagon bed to the station's next delivered slot; the persisted delivery count still increments exactly once. | must |
| FR-3 | Transfer timing and path are computed by pure deterministic helpers, bounded to a short duration, with cancel-and-snap on interruption and no per-frame allocation. | must |
| FR-4 | Reduced motion uses the existing instant fallback: no travel animation, but load/delivery state and count still change. | must |
| FR-5 | The cargo data contract and save format stay unchanged: no new keys, no telemetry, no dependency, and no change to `CargoLoad`, `CargoAction`, `actionAtStop`, `loadAfterAction`, `deliveredCountAfter`, or `MAX_DELIVERED_CRATES`. | must |
| FR-6 | Existing cargo e2e behavior remains intact and a new e2e assertion proves the crate actually moves between endpoints on both load and delivery. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No per-frame allocation: reuse existing crate meshes/transforms and a preallocated path helper; existing perf-budget gates stay green. |
| NFR-2 | The kid UI stays reading-free and gesture-free: no text, labels, new controls, parent-gate changes, viewport changes, or zoom changes. |
| NFR-3 | No telemetry, network calls, analytics, new dependencies, new IndexedDB stores, or new save keys. |
| NFR-4 | Reduced-motion users get an instant state change with no travel arc; accessibility sweep remains clean. |
| NFR-5 | Full configured matrix stays green: Biome, typecheck, unit, 80% coverage gate, build, Playwright, audit, and existing perf/axe checks. |
| NFR-6 | Diff is confined to cargo scene/view and its tests; no sky, train-length, piece-type, clarity-measurement, or release-document changes. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Pure helper unit test proves monotonic 0→1 progress and an arc that starts at the platform endpoint and ends at the wagon endpoint, with deterministic midpoints. | FR-3 |
| AC-2 | Tablet e2e proves a load stop shows a crate leaving a station platform slot and arriving on the wagon bed before the loaded state settles. | FR-1 |
| AC-3 | Tablet e2e proves a delivery stop shows a crate leaving the wagon bed and arriving at the station slot, with `deliveryCount` incrementing exactly once. | FR-2, FR-5 |
| AC-4 | With reduced motion enabled, the wagon/platform state changes instantly, no transfer mesh travels, and delivered count still increments. | FR-4, NFR-4 |
| AC-5 | If the station or ride is removed or stopped mid-transfer, the transfer cancels and snaps to its final visible state with no orphan crate mesh or stuck animation. | FR-3 |
| AC-6 | No diff in `serializeWorld`, `deserializePreferences`, snapshot schemas, `package.json`, `pnpm-lock.yaml`, or the pure cargo data helpers; no new storage keys or dependency. | FR-5, NFR-3 |
| AC-7 | Full configured verification chain passes, including unit tests, coverage above the 80% gate, build, Playwright tablet/phone/prod, perf budget, audit, and the unmodified axe sweep. | NFR-1, NFR-5 |
| AC-8 | Diff scope excludes sky, train length, piece types, kid text, parent gate, viewport, and clarity measured values; clarity comparison still has `awaiting observation=8`. | FR-5, NFR-2, NFR-6 |

## Edge Cases

- **Reduced motion:** Use the existing instant fallback; never animate travel.
- **Station removed mid-transfer:** Cancel the arc and snap the visible state to the final load/deliver result; no orphan mesh.
- **Ride stopped mid-transfer:** Cancel and snap; do not leave a crate halfway between endpoints.
- **Station moved mid-ride:** Resolve the platform endpoint from the station's current cell; if it disappears, cancel-and-snap.
- **Pile full:** Keep `MAX_DELIVERED_CRATES = 8`; a delivery still counts and celebrates, and the arc terminates at the last visible slot.
- **No station:** No transfer is attempted; existing station-less behavior is unchanged.
- **Reload during transfer:** Snapshot state is already final; on boot the visible state snaps to final, with no persisted animation progress.
- **One active ride only:** `src/state/ride.ts` caps rides at one train; no global queue or per-train lock is needed.
- **Tablet and phone parity:** Same visual contract on both profiles; no profile-only text or gesture.

## Dependencies

- **Tracks:** none.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** "Natural" means visible causal continuity between platform slot and wagon bed, not realistic physics; a short gentle arc is enough for a toddler to follow.
- **Assumption:** The existing `station_crate_N` platform slots and `cargo_crate` wagon meshes are the correct endpoints.
- **Assumption:** There is exactly one active ride at a time (`src/state/ride.ts:43-45`), so transfers are sequential and need no concurrency lock.
- **Assumption:** The delivered pile remains capped at eight; the arc ending on a full pile is cosmetic only.
- **Assumption:** This is qualitative parent feedback. No child was timed, no affected-child count is asserted, and no v1.0 gate is claimed.
- **Assumption:** No release version bump is included; this change lands in normal mainline work and is picked up by the next release track.

## References

- `conductor/archive/clarity-audit_20261110/report.md` — informal parent feedback: station cargo pickup/delivery does not look natural.
- `src/core/cargo.ts` — pure cargo data helpers and `MAX_DELIVERED_CRATES`.
- `src/scene/rig-cargo.ts` — current instant wagon crate pop/hide and delivery hand-off.
- `src/scene/track-placement.ts:188-201` — station platform crate slot visibility sync.
- `src/state/ride.ts:43-45` — single active train assumption.
- `e2e/cargo.spec.ts` — existing end-to-end cargo loop and persistence coverage.
- `conductor/product-guidelines.md` — no-reading, touch/drag-only, autosave, and parent-gate rules.
