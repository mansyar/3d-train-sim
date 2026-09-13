# Plan — Spare Train Park Spot Fix (`spare-train-park_20260913`)

Source of truth: `spec.md`. Phase A is logic-bearing (`src/core/`): TDD with
>80% coverage. Phase B is scene wiring: observable acceptance criteria verified
by the gates + Playwright + manual verification, no unit tests. Every task ends
with gates + a plan note + a commit (workflow steps 8–11).

Key constraint: the opener is created lazily by `syncRigs` (no rides + no rigs
+ no spares) and today's creation trigger (a locomotive/wagon template load)
can race world hydration. The fix gates creation on the world's first notify
(boot hydration), then poses the opener from the hydrated world. No re-parking
after creation (per spec FR4).

## Phase A — Park-spot chooser (pure core, TDD)

- [x] Task: Red — lock the chooser's rules with failing tests
  - [x] Define the API in `src/core/park-spot.ts`: `findParkSpot(pieces)` →
        `{ kind: 'rails', pieceId, from, to } | { kind: 'land', cell }` — total,
        never null
  - [x] `src/core/park-spot.test.ts`: cozy-oval → rail spot (dry, nearest heart
        on the loop); river-crossing → nearer bridge step loses to nearest dry
        step; big-far + small-near components → biggest wins; all-wet
        component → wet rail allowed; no pieces → nearest dry cell;
        determinism (shuffled input → same spot; explicit tie-break)
  - [x] Run `pnpm test` and confirm the new tests fail (Red)
- [x] Task: Green — implement `findParkSpot` (dae4480)
  - [x] Largest ride via `selectRideComponents(rideComponentsOf(pieces), 1)`;
        scan its path steps: dry (`isWater(piece.cell)`) first, then cell-center
        distance to the meadow heart (cell units); first-minimum tie-break
  - [x] Land fallback: scan meadow cells in deterministic order → dry +
        nearest heart
  - [x] Coverage check (`CI=true pnpm test -- --coverage`, >80% new module);
        gates (biome + tsc); commit + plan note
  - Notes: Added `src/core/park-spot.ts` — `findParkSpot(pieces)` returns
    `{ kind: 'rails', pieceId, from, to } | { kind: 'land', cell }`: the largest
    ride (`selectRideComponents(rideComponentsOf(pieces), 1)`) with a
    dry-preferred, nearest-to-heart step (first-minimum tie-break in walk
    order; wet steps allowed only when the whole component floats) and a
    nearest-dry-cell land fallback — deterministic and total. Tests:
    `src/core/park-spot.test.ts` (7 cases): cozy-oval parks at (3,7);
    river-crossing (6,8) — dry beats the nearer bridge (7,8); biggest of two
    components wins over a nearer small loop; bridges-only allows a wet step;
    hilltop switches (4,7); rotated/reversed determinism; empty world → land at
    (6,7). Red confirmed first (`Cannot find module './park-spot'`).
    Coverage 97.29% stmts / 100% lines on the new module. `pnpm check` green:
    biome + tsc + 683/683 vitest. Commit: dae4480.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase B — Boot wiring: opener + crate park on the chosen spot

- [ ] Task: World-ready gate + opener pose
  - [ ] Add the minimal ride-math seam in `ride-motion.ts` (e.g., export
        `stepEntryPose(piece, step)` → `{ x, z, yaw }`, built on
        `segmentForStep` + the internal `segmentPoint` and `MODEL_YAW_OFFSET` —
        no divergent pose math)
  - [ ] `train-fleet.ts`: pose the opener at creation from
        `findParkSpot(world.pieces())` + the seam, then `parkFollowersBehind`
        (wagons) — same as every resting spare
  - [ ] World-ready gate: the fleet's `world.subscribe` flips a flag on the
        first notify and runs one `syncRigs(rides.rides())`, so the opener is
        born from the hydrated world; never re-parked afterwards
  - [ ] Acceptance: fresh boot → opener on dry rails of the largest loop,
        nearest the heart; ▶ roll-on has no visible pop; empty saved world →
        dry land near the heart
- [ ] Task: Placeholder crate follows the spot
  - [ ] `init-scene.ts`: spawn the crate at the park spot from the current
        world; re-pose once on the first world notify (keeps `y = 0.75`, spin,
        first-train retirement unchanged)
  - [ ] Acceptance: slow-load visual shows the crate where the train will
        appear — never in the river
- [ ] Task: Regression proof — probes + e2e + manual + Unreleased note
  - [ ] Scene probes (`__tinyTracksScene`, DEV): `parkedSpot()` (opener
        descriptor + x/z while still a spare) and `primarySpot()` (riding
        train position)
  - [ ] `e2e/park-spot.spec.ts`: default boot → rails + dry; press ▶ →
        position continuity below threshold; empty-snapshot boot (IndexedDB
        seed) → land + dry (fall back to unit + documented manual if seeding
        proves brittle)
  - [ ] Manual: fresh-boot screenshot per starter (swap → reload) + empty
        world; smooth ▶ roll-on; console clean
  - [ ] `CHANGELOG.md`: one `### Fixed` line under `## [Unreleased]`
  - [ ] Gates: full suite (biome + tsc + vitest + Playwright)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
