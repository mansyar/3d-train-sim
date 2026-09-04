# Spec — Wagon Workshop

**Track ID:** `wagon-workshop_20260904` · **Type:** Feature · **Branch:** `track/wagon-workshop_20260904`
**Status:** Confirmed — ready for planning.

## Overview

Today every locomotive (`steam`, `diesel`, `tram` in `src/core/trains.ts`)
pulls the same two bundled wagons (lead `train-carriage-lumber` + rear
`train-carriage-box` per `src/core/wagons.ts:19-22`) through the same
cargo loop (`src/core/cargo.ts`: load crates at the first station,
confetti-deliver at the next, platform keeps up to 8 crates persisted).

The Kenney kit already ships the variety in-repo
(`public/assets/train-kit/`): coal, tank, container-red/blue, and more —
never reaching the meadow. Wagon Workshop unlocks that variety behind an
icon-only wagon row in the train drawer so each kid can dress THEIR
freight. Same autonomous ride, same cargo gameplay — purely cosmetic,
no reading, no fail states, no new controls while riding.

Closes the `product.md:53` roadmap remainder: "colors/other variants
still roadmap" under the shipped cargo-wagons line.

## Confirmed Decisions

- **Per-train consist:** each of the 3 locos remembers its own wagon
  pair (celebrates "MY train", matches per-train whistle personalities,
  composes with up-to-4 concurrent rides).
- **Pair presets, 4 total:** one tap applies a curated lead+rear pair —
  no invalid combos, fewest taps.
- **V1 lineup:** Classic (lumber+box, the default) · Coal duo · Tank
  duo · Container red+blue. Distinct silhouettes, all in-repo GLBs.
- **Drawer home:** wagon row inside the train drawer (`src/ui/app.ts`
  `TRAIN_KINDS` area), icon-only chunky SVGs, ≥64px targets, pop+ding
  <100ms, mute-respecting, auto-hidden mid-ride with the drawer.
- **Memory:** additive save field per-train, persisted across reloads;
  pre-workshop worlds open as Classic; no version bump if the additive
  shape allows.
- **Cargo untouched:** crate load/deliver/confetti/8-crate platform
  behavior identical regardless of wagon skin.

## Functional Requirements

- **FR1 — Wagon row in train drawer.** Four icon-only preset buttons
  (Classic / Coal / Tank / Container) sit under the loco picker. One
  tap applies to the currently selected loco with pop+ding (<100ms,
  silent when muted). Hidden mid-ride with the rest of the drawer.
- **FR2 — Per-train consist model (pure core).** Wagon choice lives in
  `src/core/` (TDD, >80% coverage): preset type, per-train mapping
  (`steam`/`diesel`/`tram` → preset), default Classic. Session state +
  persisted.
- **FR3 — Ride unchanged.** Chosen wagons load via `load-wagons.ts`
  and follow the engine through straights, curves, crossings, bridges,
  tunnels, hills, and switches with today's spacing — no popping,
  no derails, dead-end shuttles included.
- **FR4 — Saves stay whole.** Additive field only; old worlds load
  exactly as Classic; workshop worlds round-trip through
  `src/core/save.ts` + `src/state/persistence.ts`; choice survives
  reload per-train.
- **FR5 — Guidelines compliance.** Icon-only (no kid-facing text),
  ≥64px targets, reduced-motion safe (no camera/particle changes),
  works on tablet + phone touch viewports.

## Non-Functional Requirements

- New logic in `src/core/` is pure TypeScript, TDD'd, >80% coverage,
  zero `three.js` coupling per the `tech-stack.md` boundary rule.
- No per-frame allocations in ride changes; precached GLBs only, no
  runtime network; 60 FPS preserved; cold load <5s; PWA precache
  weight checked against the 6MB cap.
- Kid UX per `product-guidelines.md`: every preset rides every
  topology — no fail states, instant forgiving feedback.

## Acceptance Criteria

1. Kid selects a loco, taps Coal — wagons swap with pop+ding (<100ms).
2. Press ▶ — chosen consist rides a loop, a dead-end shuttle, a
   tunnel, a hill run, and a switch branch with wheels on rails and
   no popping.
3. Cargo still loads at the first station and confetti-delivers at the
   next; the platform keeps up to 8 crates regardless of wagon skin.
4. Reload restores each loco's chosen consist; a pre-workshop save
   opens as Classic everywhere.
5. `pnpm check` green (biome + `tsc --noEmit` + vitest) plus a new
   Playwright spec (pick preset → ride → assert consist → reload
   restores → zero external requests, clean console, tablet + phone).

## Out of Scope

- New locomotives (unused kit engines stay parked; wagons only).
- Independent lead/rear pickers or custom painters (pairs only).
- Wagon physics, capacities, or gameplay effects (cosmetic only).
- Crate restyling to match wagons; loco-specific whistle samples;
  crossing/bridge sounds (separate soundscape track).
- Motorized/lever switching; elevation-combined wagon geometry.
- More than 4 presets (flatbed/dirt/wood stay parked for a follow-up).
