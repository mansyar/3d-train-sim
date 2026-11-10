# Phase 3 evidence — Persistence, migration, measurement

- Track: progressive-disclosure_20261110 — Progressive Disclosure
- Phase: 3 — Persistence, migration, measurement
- Date: 2026-11-10
- Branch: feat/progressive-disclosure_20261110
- Base: 2e98eb7694a28fe0fa766c66bd9d7789c4f7cefd
- Head: 1e1e3dc (test commit; code commit 6da6809)
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| static+unit | `pnpm check` (biome + tsc + vitest) | 0 | 186 files clean; 54 test files, 938 tests passed |
| coverage | `pnpm test:coverage` | 0 | core 97.63% stmts, state 94.30% stmts (gate ≥80%); world.ts 93.77, save.ts 93.07, persistence.ts 91.80 |
| e2e | `pnpm exec playwright test e2e/disclosure.spec.ts` | 0 | 3 passed (tablet project, 1.4 min); config runs new specs on tablet only |

Two verification attempts were used (retry budget 2): the first run failed on a
spec bug (a Node-side helper called inside `page.evaluate`); the inline-cast
fix passed on the second run. No product code changed between attempts.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| FR-4 | Unlock flag + ride count persist in the world save + autosave; reload restores exactly; old saves load as fresh-locked without crash or piece loss | `save.ts`: optional `disclosure` snapshot field, omitted-when-fresh so pre-tier saves parse unchanged (`parseWorldSnapshot` untouched, salvage rules intact); `persistence.ts snapshotOf` carries `world.disclosure()` on every autosave; e2e test 1 reloads with the tier unlocked | pass |
| FR-5 | Pre-tier worlds containing advanced pieces unlock on load with pieces kept; worlds without them keep stored state | `main.ts` boot: `parseDisclosureState(snapshot.disclosure)` + `applyGrandfather` over validated world kinds; `world.ts applyPreset`/`importWorld` grandfather incoming advanced kinds (never relock, never touch pieces); e2e test 2 reloads a stored `switch-3way` world unlocked with `pieces == ['switch-3way']` | pass |
| FR-7 | Parent-gated full reset clears the flag and the count back to fresh | `world.reset()` restores `createDisclosureState()`; e2e test 2 holds + confirms the gate, then asserts 0 pieces and a hidden station slot | pass |
| AC-5 | Silent static reveal under muted or reduced-motion (unit or e2e) | e2e test 3 (reduced-motion emulated pre-boot, muted): tier reveals, `.drawer-tab.pop` count is 0, console clean; code path `celebrateUnlock` returns early on `muted \|\| prefersStill` (unchanged Phase-2 logic, still covered by its unit tests) | pass |
| AC-6 | Audit-comparison notes: fields + location recorded, no fabricated numbers | See “Audit-comparison notes” below | pass |
| NFR-1 | core+state coverage ≥80% | `pnpm test:coverage`: core 97.63%, state 94.30% | pass |
| NFR-2 | No new network calls, nothing added to the ride hot path, negligible precache impact | No new imports beyond `core/disclosure` (already bundled); e2e test 1 asserts zero external requests; `recordRide` is a pure state step + notify on the existing subscription channel | pass |
| NFR-3 | Reduced-motion path keeps working after persistence | e2e test 3 covers the boot path only for fresh state; persistence re-gating is silent by construction (store notification → `applyGating`, no `celebrateUnlock` call), and Phase-2 reduced-motion unit tests still pass | pass |
| NFR-4 | No piece loss in any migration path | `applyGrandfather` never touches pieces (Phase-1 unit-tested); e2e test 2 asserts the grandfathered piece survives the round trip; old-save salvage rules untouched | pass |

## Evidence paths

- `e2e/disclosure.spec.ts` (3 tests: locked→3 rides→unlocked→reload; reset→grandfather; muted+reduced-motion)
- `src/core/save.ts` (optional `disclosure` field + 8th `serializeWorld` param)
- `src/state/world.ts` (store owns `disclosure`/`recordRide`/`restoreDisclosure`; reset clears; presets/imports grandfather)
- `src/state/persistence.ts`, `src/ui/toy-drawer.ts`, `src/main.ts` (deviations, below)
- `src/ui/toy-drawer.test.ts` (harness mock extended to the new store contract)

## Audit-comparison notes (AC-6 / P3.T2.2)

No baseline numbers are recorded here because there is nothing to compare
against yet: `clarity-audit_20261110` does not exist, so no baseline was
measured and none is invented.

- Fields the clarity audit will compare: **time-to-first-ride** and
  **unassisted session length** (the v0.9.0 gate: 3/3 kids first ride <60s,
  one 10+ min session).
- Cohort: **3 kids aged 2–4**, same cohort or same protocol on both sides.
- App-side recordability: the app records **no telemetry by design**
  (product guideline: nothing leaves the device), so both fields require
  **human observation during the toddler test** — no automated proxy exists
  or is invented here.
- Location: the comparison will be documented in the
  `clarity-audit_20261110` track's comparison artifact once that track lands
  (dependency: it must merge first); this section is the recorded contract
  until then.

## Deviations

Outside `Touches`, the phase goal required four minimal changes:

1. `src/state/persistence.ts` — `WorldReader` gains `disclosure()` and
   `snapshotOf` passes it as the 8th `serializeWorld` arg, so mute/day-phase
   saves carry (never clobber) the flag.
2. `src/ui/toy-drawer.ts` — the drawer delegates to `world.recordRide()` /
   `world.disclosure()` and re-gates on the store subscription instead of
   owning session state (the only way the count can autosave).
3. `src/main.ts` — boot restores via `parseDisclosureState` + grandfather
   over validated world kinds (fresh seeds never pass through, so the seeded
   oval stays locked per FR-1/AC-1).
4. `src/ui/toy-drawer.test.ts` — the Phase-2 harness mock implements the
   extended store contract with a real `DisclosureState` (test-only change).

Grandfather scope (deliberate, no product question needed): it fires wherever
a world arrives from outside current-session authorship — stored snapshots
(boot, incl. previous-slot restores), gallery presets, imported files — and
never in `hydrate` (fresh seed) or `undo` (undo never removes the unlock).

## Notes

- `serializeWorld` callers needing no disclosure pass nothing: the field is
  omitted-when-fresh, so existing `toEqual` save-shape tests pass unchanged.
- Coverage gap known: `world.ts` lines 343–352 (`recordRide` /
  `restoreDisclosure`) are vitest-uncovered — exercised only by the new e2e
  spec. State still sits at 94.30%, far above the 80% gate.
- Follow-up for a later track (not this phase): the seeded `cozyOval` parks
  a station while locked — intended per FR-1, and the e2e suite now pins it.
