# Specification — Autosave & World Restore

**Track ID:** `autosave-world-restore`
**Type:** Feature

## Overview

Tiny Tracks currently keeps the world only in memory, so a reload loses the
child's work. This track adds silent, local autosave and startup restoration for
the complete meadow: track pieces and scenery. The feature must remain fully
offline, preserve the toddler-friendly interaction model, and never expose a
failure state when persistence is unavailable or data is malformed.

## Functional Requirements

1. **Pure world serialization — `src/core/save.ts`:**
   - Serialize track pieces and scenery into a versioned, JSON-safe snapshot.
   - Deserialize valid snapshots back into world data without importing
     Three.js or browser APIs.
   - Reject malformed, unknown-version, out-of-bounds, duplicate-cell, and
     over-capacity data safely by returning an empty/default result rather than
     throwing into the kid-facing app.
   - Preserve IDs, piece/scenery kinds, cells, and rotations exactly.
2. **IndexedDB persistence — `src/state/` or `src/core/`:**
   - Use the existing `idb` dependency and one `worlds` object store as defined
     by the tech stack.
   - Save after every successful world mutation, including placement,
     relocation, and removal of either tracks or scenery.
   - Keep persistence local-only; no network calls, accounts, identifiers, or
     analytics.
   - Treat storage failures as non-fatal so the app remains usable.
3. **Startup restoration — `src/main.ts`:**
   - Load the latest saved snapshot before or during scene initialization.
   - Restore the exact saved world without emitting duplicate or visible
     intermediate mutations where practical.
   - Start with an empty world when no snapshot exists or when stored data is
     invalid/unavailable.
4. **World-store integration — `src/state/world.ts`:**
   - Provide a controlled hydration path for valid persisted pieces and scenery.
   - Continue enforcing shared occupancy, bounds, and 64-item capacity rules
     after restoration.
   - Ensure future mutations notify the persistence subscriber exactly once.

## Non-Functional Requirements

- No runtime network requests beyond the app's existing local asset loading.
- >80% unit coverage for serialization, validation, and persistence-trigger
  logic.
- TDD first for pure serialization and state behavior; UI/boot wiring is
  covered by Playwright smoke tests and manual verification.
- Persistence must not block interaction or introduce noticeable startup lag.
- Corrupt storage must never crash the app or present an error/fail state to a
  toddler.
- Follow the existing TypeScript, Biome, vanilla DOM, and IndexedDB conventions.

## Acceptance Criteria

- A user places track and scenery, reloads the app, and sees the same world in
  the same cells, rotations, and item order.
- Moving or removing an item, then reloading, restores the latest state rather
  than the previous state.
- Empty first launch works without a saved record.
- Corrupt, incompatible, or over-capacity stored data starts safely with an
  empty/default world and no uncaught console error.
- Ride behavior remains unchanged: scenery is non-conductive, and restored track
  can be ridden normally.
- Unit tests cover valid round trips and invalid snapshots; Playwright verifies
  persistence across reload and asserts no console errors or external requests.
- Full local gates pass: `pnpm check` and `pnpm exec playwright test`.

## Out of Scope

- Cloud sync, accounts, exports/imports, multiple save slots, undo/history, and
  cross-device synchronization.
- Parent-gated reset/clear UI; that is a separate track.
- Changes to track graph, path solving, train physics, scenery assets, or ride
  UX except where required to restore the existing world.
