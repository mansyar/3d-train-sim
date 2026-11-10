# Phase 2 verification — Toybox gating + celebration

- Track: progressive-disclosure_20261110 — Progressive Disclosure
- Phase: 2 — Toybox gating + celebration
- Date: 2026-11-10
- Branch: feat/progressive-disclosure_20261110
- Base: 630adb5dea74540c21d3c1571f4ccdb3c4a1adc6
- Head: 53d0b01f7d4be610df9165efe478893a1d133928
- Result: verified

## What changed

- `src/core/drawer.ts` — `drawerTabs()` accepts an optional `DisclosureState`.
  Locked state filters the advanced slots out of the Adventure and Town tabs;
  omitted (or unlocked) state returns the full toybox exactly as before.
- `src/ui/toy-drawer.ts` — owns a `DisclosureState` (fresh install = locked).
  While locked, the advanced slots hide via `hidden` (never the MAX_PIECES
  dimming style). `notifyRideCompleted()` counts one completed ride and, on
  the unlocking (3rd) ride, reveals the slots with an icon-only celebration:
  Adventure + Town tabs bounce (reused `ride-pop`, restart-safe) + a happy
  `audio.ding()`. Muted or reduced-motion hands get the same unlocked toybox
  revealed silently and still (spec AC-5). The pointerdown tap path is
  untouched. Returns `disclosureState()` (defensive copy) for tests/Phase 3.
- `src/ui/toy-drawer.test.ts` (new) — fake-DOM harness (node has no browser
  DOM) proving gating, exact-once celebration, mute/reduced-motion silence,
  cap-dimming preservation, and instant tap-to-drag.
- `src/core/drawer.test.ts` — locked hides the 3 advanced slots and keeps
  every basics kind in order; unlocked renders all slots exactly as today.
- Deviations (minimal, outside Touches): `src/ui/app.ts` passes `audio` +
  `prefersStill` into the drawer and counts one completed ride per
  riding→idle transition (empty meadows never enter riding mode, so they
  never count; no pause/resume exists to double-count). `src/style.css`
  adds `.drawer-tab.pop` (reuses `ride-pop`), explicit
  `.piece-slot[hidden], .scenery-slot[hidden]` guards, and the
  reduced-motion `animation: none` cover. No `src/state/ride.ts` change was
  needed — the scene's existing ride-mode push already distinguishes real
  rides from refused starts.

## Commands

| Layer | Command | Exit | Summary |
| ----- | ------- | ---- | ------- |
| lint | `pnpm exec biome check .` | 0 | 185 files, no findings (one import-order + one format nit fixed, retry 1 of 2) |
| type | `pnpm exec tsc --noEmit` | 0 | clean |
| unit | `pnpm test` | 0 | 54 files, 938 tests passed (928 before + 10 new) |
| gate | `pnpm test:coverage` | 0 | core+state 97.3% stmts / 90.5% branches / 97.9% funcs / 99.4% lines — above the 80% bar |
| verify | `pnpm check` | 0 | biome + tsc + vitest, all green |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| -- | --------- | -------- | ------ |
| FR-2 / P2.T1.1 | Locked toybox renders no advanced slots in either tab; unlocked renders all exactly as today | `drawer.test.ts` locked/unlocked gating tests; `toy-drawer.test.ts` hidden-while-locked + reveal-on-3rd-ride tests | pass |
| FR-2 / P2.T1.2 | MAX_PIECES cap dimming unchanged (still means "board is full") | `toy-drawer.test.ts` cap-dimming test: full board dims visible slots while advanced stay hidden; existing cap/gating tests still green | pass |
| FR-6 / P2.T2.1 | 3rd completed ride reveals with bounce + happy ding; silent + still when muted or reduced-motion; no text/labels | `toy-drawer.test.ts` celebration tests (ding ×1 exactly on unlock, pop only on Adventure/Town; zero ding/animation when muted or prefersStill) | pass |
| P2.T2.2 | Tap feedback stays sub-100 ms (nothing added to pointerdown) | pointerdown handler byte-identical; test asserts pointerdown → `beginDrag` fires and dimmed slots refuse; reveal work happens only in `notifyRideCompleted` (ride-end), never in the tap path | pass |
| NFR-1 | `src/core` + `src/state` coverage ≥ 80% | `pnpm test:coverage`: 97.3 / 90.5 / 97.9 / 99.4 | pass |
| NFR-3 | Reduced-motion users get the same unlocked content with zero animation | reduced-motion test: all slots revealed, no ding, no pop; CSS `animation: none` cover for `.drawer-tab.pop` | pass |
| AC-4 | Gating + celebration proven with unit/integration tests (e2e is Phase 3's job) | 10 new tests: 3 in `drawer.test.ts`, 7 in `toy-drawer.test.ts` | pass |

## Evidence paths

- `src/core/drawer.ts`, `src/core/drawer.test.ts`
- `src/ui/toy-drawer.ts`, `src/ui/toy-drawer.test.ts`
- Deviations: `src/ui/app.ts`, `src/style.css`
- Commits: `24fd029` drawer gating, `9bb3fb4` toybox gating + celebration,
  `53d0b01` ride-end wiring

## Deviations

- `src/ui/app.ts` (outside Touches): 3-line ride-end hook + 2 dep passes.
  Required — the drawer cannot see ride mode otherwise; smallest possible
  wiring on the existing `subscribeRideMode` push.
- `src/style.css` (outside Touches): `.drawer-tab.pop` rule reusing
  `ride-pop`, `[hidden]` display guards, reduced-motion cover. Required —
  the celebration cannot animate or guarantee hidden slots without it.
- No `src/state/ride.ts` change: the anticipated hook proved unnecessary.

## Notes

- Design decision (spec AC-5 over ride-controls precedent): the unlock
  celebration is silent under reduced motion, not just still — "silent
  static reveal with mute on or reduced motion". `audio.ding()` stays
  mute-respecting by construction; the drawer additionally guards
  `isMuted()` so the silent-reveal promise holds even with a mock box.
- Ride counting: one count per riding→idle transition at ride end, so an
  unlock never interrupts a running train; mid-ride soft-stops from edits
  also end the riding session and count (no pause/resume exists to
  double-count; Phase 3 e2e pins the ⏹/natural-end paths).
- Session state: `DisclosureState` lives in the toy-drawer (the existing
  owner of drawer UI state) for Phase 2; Phase 3 persists it (world save +
  grandfather) per the plan.

## Primary verification (4.7)

- Date: 2026-11-10
- Checkpoint: 5155d72
- Tree: clean (`git status --porcelain` empty).
- Diff `630adb5..HEAD`: `src/core/drawer.ts`, `src/core/drawer.test.ts`,
  `src/ui/toy-drawer.ts`, `src/ui/toy-drawer.test.ts` (Touches + tests),
  `src/ui/app.ts` + `src/style.css` (recorded deviations),
  `conductor/tracks/progressive-disclosure_20261110/verification/phase-2.md`
  (evidence).
- Commands: `pnpm check` exit 0 (biome clean, tsc clean, 54 test files /
  938 tests pass — 928 before + 10 new). Subagent coverage run: core+state
  97.3 / 90.5 / 97.9 / 99.4 — above the 80% gate.
- AC comparison: FR-2/P2.T1.1, FR-2/P2.T1.2, FR-6/P2.T2.1, P2.T2.2, NFR-1,
  NFR-3, AC-4 all pass per evidence table; deviations reviewed and accepted
  (smallest possible wiring, no ride-controller change needed).
