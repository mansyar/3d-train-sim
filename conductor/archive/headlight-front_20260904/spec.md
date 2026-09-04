# Spec — Headlight Front

**Track ID:** `headlight-front_20260904` · **Type:** Bug (scene) · **Branch:** `track/headlight-front_20260904`

## Overview

At night the locomotive's headlight lamp + beam ride at the back of the engine (cab end) instead of the nose, so the beam points backwards down-track.

**Root cause (diagnosed 2026-09-04):** `src/scene/headlight.ts:24` claims the engine's authored front faces `-Z` and parks the lamp at `(0, 1.0, -1.55)`, spot at `(0, 1.1, -1.5)`, aim `(0, 0.2, -9)`. `src/scene/ride-motion.ts:31,49-50,501` disagrees: `MODEL_YAW_OFFSET = Math.PI` with the comment that the authored front faces `+Z`, and `poseAt` yaws by `atan2(-tx,-tz) + PI` so local `+Z` points down-track. GLB vertex analysis of `public/assets/train-kit/train-locomotive-a.glb` confirms `+Z` is the nose (narrow chimney stack `|X|<0.15` tall at `Z 0.21..1.02`) and `-Z` is the cab (wide `X ±0.64` tall at `Z -1.2..0.2`). The headlight child at local `-Z` therefore rotates with the engine to world-backwards.

## Functional Requirements

1. **FR1 — Lamp on the nose.** `lamp.position` moves to `(0, 1.0, +1.55)`.
2. **FR2 — Beam forward.** `spot.position` moves to `(0, 1.1, +1.5)` and `aim` to `(0, 0.2, +9)`.
3. **FR3 — Fix the stale comment.** The `-Z front` comment cites `+Z` front + `MODEL_YAW_OFFSET` instead.
4. **FR4 — Shared fix.** One change in `attachHeadlight` covers steam/diesel/tram (uniform yaw offset; steam proves the convention).

## Acceptance Criteria

- **AC1:** On a night ride the emissive lens sits on the nose and the warm cone leads the engine, not the wagons.
- **AC2:** Travel, wagon spacing (`parkFollowersBehind`, `FOLLOWER_GAP`), and shuttle/brake behavior are unchanged.
- **AC3:** `tsc --noEmit`, `biome check`, and the smoke path (dev boot, no console errors) stay green.

## Out of Scope

- Beam brightness/range/angle retuning (`SPOT_*` constants stay as is).
- Unit tests — `headlight.ts` is non-logic scene wiring per `workflow.md` (smoke + manual verification).
- Diesel/tram authored-facing re-verification beyond the shared convention; core/state/UI/save changes.
