# Specification — Parent Reset & Mute Memory

**Track ID:** `parent-reset-and-mute-memory`
**Type:** Feature

## Overview

Tiny Tracks autosaves the world but offers no way to clear it, and the sound
toggle forgets its state on every reload. This track adds a parent-gated full
factory reset — track, scenery, and train selection return to defaults — and
persists the global mute preference inside the existing versioned world
snapshot. No new assets, dependencies, or network calls.

## Functional Requirements

1. **Save format extension — `src/core/save.ts`**
   - Extend the versioned JSON-safe snapshot with an optional
     device-preferences object holding the global mute state.
   - Snapshots without preferences (existing saves) deserialize with the
     sound-on default; invalid or unknown preference values also fall back
     safely to sound-on rather than throwing.
   - Serialization stays pure TypeScript: no Three.js or browser APIs.

2. **Mute persistence — `src/state/persistence.ts` + `src/audio/`**
   - On boot, restore the persisted mute state with world hydration; the
     sound-box toggle reflects it immediately.
   - Every mute change persists exactly once, with the same non-fatal failure
     treatment as world mutations.
   - Mute restore must not depend on the iOS/browser audio unlock gesture
     (applying Howler's global mute is enough).

3. **World reset — `src/state/world.ts`**
   - Provide a controlled reset path that removes all track pieces and
     scenery, frees occupancy and capacity, and restores the default steam
     locomotive.
   - If a ride is active, reset gently stops the ride first, reusing the
     established gentle-stop pattern from train swapping.
   - After a reset, exactly one persistence notification writes the fresh
     default world — no per-item intermediate saves.
   - Reset on an already-empty world is safe and produces the same single save.

4. **Parent gate UI — `src/ui/app.ts`**
   - A visually muted corner control (≥64px touch target) starts the gate:
     press-and-hold for ~2 seconds with a visible progress fill; small finger
     drift does not cancel, releasing early does.
   - On a successful hold, an icon-only confirm affordance appears (with
     accessible labels for parents); confirming executes the reset, and
     tapping elsewhere dismisses the confirm step silently.
   - Reset feedback is celebratory, never punishing: pieces scale down with a
     soft pop and the existing happy placement ding plays.
   - No visible text anywhere in the gate; nothing triggers web navigation or
     system dialogs.
   - The progress fill and clear animation respect `prefers-reduced-motion`.

5. **Mute toggle memory — `src/ui/app.ts`**
   - The 🔊/🔇 toggle keeps its existing instant, one-tap behavior, but the
     state now survives reload.
   - The world reset never touches the mute state; sound preference belongs
     to the parent, the world belongs to the kid.

6. **Testing**
   - Unit (TDD, logic-bearing): save round-trip with preferences; missing/
     invalid preference fallbacks; world reset state (occupancy freed, default
     train restored, exactly one persistence notification); gentle-stop-before-
     clear ordering; mute persistence trigger and boot restore.
   - Playwright smoke: mute → reload → still muted; full gate flow (hold →
     confirm) clears a placed piece and reverts the train to steam; early
     release cancels; empty world persists across reload; no console errors
     or external requests.

## Non-Functional Requirements

- No new dependencies, assets, or runtime network requests; IndexedDB only.
- Preserve the 60 FPS target; no per-frame allocations in the render loop.
- Touch-first: pointer events only, no hover or precision dependencies.
- No fail states: gate, reset, and persistence failures never surface errors
  to the kid.
- New logic-bearing code in `src/core/` and `src/state/` targets >80% coverage.
- Existing gates stay green: Biome, `tsc --noEmit`, Vitest, Playwright smoke.

## Acceptance Criteria

- A parent can fully clear the world via hold → confirm; toddler-style taps,
  quick presses, and early releases all cancel silently.
- After reset: empty meadow, default steam locomotive, one saved default
  world, and the empty world survives reload.
- Confirming a reset mid-ride gently stops the train before clearing, with no
  visual glitches or console errors.
- Mute survives reload; old or malformed snapshots start with sound on and a
  valid world.
- The clear animation pops with the placement ding; reduced-motion is honored.
- The gate is icon-only with aria-labels; no text appears in the kid UI.
- Existing placement, ride, audio, and save/load behavior remains green.
- `pnpm check` and Playwright smoke tests pass with no external requests.

## Out of Scope

- Undo/history, multiple save slots, world export/import, cloud sync.
- Any other parent-gated settings beyond reset (no menu, no localization).
- Resetting the device's mute preference via the world reset.
- "Recently cleared" recovery or timed backups.
- Changes to pathing, track graph, placement rules, ride motion, or scene
  rendering beyond the clear/pop animation.
