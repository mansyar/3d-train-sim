# Spec — Starter Railway Magic

**Track ID:** `starter-railway_20260903` · **Type:** Feature · **Branch:** `track/starter-railway_20260903`

## Overview

Fresh installs boot to empty grass: `main.ts` hydrates the world only when
`loadWorldSnapshot()` resolves a snapshot, so a true first boot (empty
IndexedDB, storage error) leaves the toddler facing a blank meadow with no
invitation to play. The Toddler Test — a 2–4 year-old playing unassisted for
10+ minutes — fails before it starts.

This track gives every first run a rideable **Cozy Oval** (closed loop +
station + a few nature toys, train ready) and adds a **parent-gated 3-preset
gallery** so a grown-up can reload a starter after building chaos. The starter
is an ordinary world from the moment it lands: autosaved, fully editable,
trashable, and undoable. Picking a gallery preset replaces the world as one
undoable mutation.

Explicitly deferred by `ride-toybox-flow_20260903` ("Starter worlds ...
out of scope") — this is its natural follow-up.

## Functional Requirements

**FR1 — First-run starter.** When `loadWorldSnapshot()` resolves `null`
(true first boot: no snapshot, corrupt store, storage error), the app
hydrates a Cozy Oval instead of an empty world:

- Closed loop of straights + corners, centered clear of the river
  (every cell validated by `terrainErrorFor` / `isWater` — dry land only).
- 1 station on a dry cell adjacent to the loop, 2 trees + 1 house on dry
  land, all within the 16×16 meadow and well under the 64-toy cap.
- Train: the `steam` default (today's `deserializeWorld` fallback); the kid
  can still switch locomotives in the train drawer.
- The loop is closed, so the first ▶ tap rides instantly — the existing
  ride-ready pulse and loop-closure ding fire exactly as they do for a
  hand-built oval.

**FR2 — Parent-gated gallery.** The long-press parent gate gains a preset
picker with 3 icon-only choices (no text, no new gestures):

1. **Cozy Oval** — the FR1 default, reloadable.
2. **Station Village** — oval + houses + pig/sheep critters.
3. **River Crossing** — oval spanning the water with 1–2 trestle bridges.

Rules for all presets: closed loops (rideable in one tap), ≤ ~20 toys,
land-safe except bridges over water, no hills / switches / tunnels
(adventure pieces stay hand-placed). The picker lives inside the armed
confirm step of the gate — a toddler's taps can never reach it.

**FR3 — Undoable replace.** Applying a preset replaces the world as ONE
mutation and arms the single-undo ↩️, so one tap restores the prior build —
pieces, scenery, selected train, and delivery ledger — exactly. Gallery
hydration clears in-progress edit undo state the same way `hydrate()` does
today (one pending inverse at a time, never stacked).

**FR4 — Ordinary-world persistence.** Starter and gallery worlds serialize
through today's `serializeWorld` (snapshot v3 — no version bump, no
migration). Once a snapshot exists, subsequent boots restore the kid's world
exactly; the starter never reappears on its own. Parent reset clears to an
EMPTY meadow (not the starter) as today; the gallery re-applies a starter
on demand.

**FR5 — No new celebration.** First ▶ on a starter reuses the ride-ready
pulse and loop-closure ding only. Muted → silent. `prefers-reduced-motion`
→ still (no pulse/pop classes), per the ride-flow precedent.

## Non-Functional Requirements

- Preset builders are pure functions in `src/core/` (no three.js) — TDD'd,
  >80% coverage on new logic, zero scene coupling.
- World-store replace logic lives in `src/state/` — TDD'd like FR1.
- Zero per-frame cost: seeding and gallery-apply run at boot/tap time only;
  no render-loop allocations, no quality-tier changes.
- No new GLB downloads, no new audio, no network at runtime (airplane-mode
  safe, nothing leaves the device).
- Kid UX per `product-guidelines.md`: icon-only, tap + drag only, ≥64px
  targets, every touch answered in <100ms, no fail states — every preset
  rides, dead ends impossible by construction (closed loops).
- 60 FPS on mid-spec tablets preserved.

## Acceptance Criteria

1. Wiped IndexedDB → boot shows the Cozy Oval; one ▶ tap rides a loop with
   station pause; clean console.
2. Reload keeps the kid's world exactly; the starter never overwrites an
   existing snapshot.
3. Each of the 3 gallery presets (behind the gate) applies and rides with
   one ▶ tap; kid-side UI can never open the picker.
4. Gallery apply → ↩️ restores the prior build (pieces, scenery, train,
   deliveries) exactly.
5. Parent reset → empty meadow (not starter).
6. Mute silences the loop ding; reduced-motion shows no pulse/pop.
7. `pnpm check` (biome + typecheck + vitest) and the Playwright suite stay
   green, including new starter specs; manual tablet check passes.

## Out of Scope

- Adventure pieces in presets (hills, tunnels, switches, slope runs).
- A 4th preset or a kid-visible gallery tab / toybox section.
- Ephemeral-until-edited behavior (template reappearing each boot).
- New sounds, confetti, or celebration choreography.
- Save-schema bump or migration.
- Re-seeding the starter after a parent reset.
