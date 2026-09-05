# Spec — Hills Phase 2: Bumps, Corners & Half-Height Cruises

- **Track:** `hills-phase2_20260904`
- **Type:** Feature · **Branch:** `track/hills-phase2_20260904`
- **Builds on:** `hills-ramps_20260903` (slope-up / hill / slope-down, `src/core/elevation.ts` auto-blend, Blender snow recipe)

## Overview

The meadow's elevation vocabulary grows from one hill run to a full roller-coaster set: gentle bumps (`bump-up` / `bump-down`), elevated corners / corner-ramps, and half-height cruise variants (a gentle lower crest). Kids compose dips, humps, banked turns and layered climbs with the same rule-free placement as hills. The train rides every new piece with the same gentle auto-blend at joints, the chase camera follows over the top, and winter dresses the new crests in snow crowns.

This closes the explicit elevation leftovers in `product.md` (`bump-up`/`bump-down`, elevated corners/corner-ramps, half-height cruise variants).

## Functional Requirements

1. **FR1 — New pieces:** `bump-up`, `bump-down`, elevated corner(s) / corner-ramp(s), half-height cruise variant(s) join the catalog (`src/core/pieces.ts`) as single-cell, 90°-rotatable pieces.
2. **FR2 — Placement anywhere like hills:** new pieces go anywhere a straight goes — dry land only (river stays for bridges), snap/rotate/delete like any track; height disagreements at joints ease gently via `elevation.ts` auto-blend (never a pop, never a fail state).
3. **FR3 — Playful dip ride:** bumps ride as a softer dip with a light crest pop reusing the existing soft pop/ding voice (mute-respecting, capped volume, no sudden/loud attack); corners and half-height cruises ride smooth at normal speed.
4. **FR4 — Camera follows:** chase camera follows over bumps/corners/cruises exactly like hills.
5. **FR5 — Rails-tab discovery:** new toys appear as chunky Rails-tab entries with generous touch targets (≥64px); no reading required.
6. **FR6 — Snow crowns:** new crests wear deterministic Blender snow shells in winter, melting when snow clears (tunnel/hill precedent, named-node contract).
7. **FR7 — Compose freely:** new pieces compose with loops, shuttling, switches/mirror-switches, tunnels, bridges, stations/cargo, multi-train (one train per component) unchanged.
8. **FR8 — Additive saves:** no save-schema version bump; old worlds load untouched.

## Non-Functional Requirements

- **Toddler guidelines:** no fail states, tap/drag only, instant feedback (<100ms pop), gentle motion (smoothstep easing, no shakes/flashes), big targets, high contrast, privacy (nothing leaves device, airplane-mode safe).
- **Performance:** 60 FPS target on mid-spec tablets; no per-frame allocations in ride loop; Blender assets < ~150 KB each.
- **Core purity:** `src/core` stays pure TS (no three.js); TDD with >80% coverage on new logic.

## Acceptance Criteria

- [ ] Each new piece places, rotates, deletes, undoes, autosaves and reloads.
- [ ] Train rides bumps/corners/cruises forward and shuttled back with no pops or derails; crest pop sounds only when unmuted.
- [ ] Camera follows over elevation; winter shows snow crowns; old saves open unchanged.
- [ ] Playwright e2e rides each new piece + reload with clean console; manual tablet touch check passes.

## Out of Scope

- Motorized / tappable switch levers, double-slip / 3-way pieces.
- New locomotives or wagon liveries beyond existing catalog.
- Save-format migration or parent-gate changes.
