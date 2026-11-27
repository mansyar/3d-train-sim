# A. Rituals — Deepen the Day/Weather Clock — Implementation Plan

> **Branch:** `feat/20261128-rituals-day-weather`
> **Base:** `main` @ `c368d22d1f83c6579c8187fdca3f650f4164192d`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Greeting director

- **Goal:** phase→greeting map + settle rule implemented under TDD with coverage
  gate green.
- **Depends on:** none
- **Covers:** FR-1, FR-8, NFR-5, NFR-6, AC-1
- **Touches:** `src/state/rituals.ts`, `src/state/rituals.test.ts`
- **Verification:** `pnpm test:coverage`
- **Status:** verified

- [x] **P1.T1: Red — failing tests for the phase→greeting map and settle rule** — covers: FR-1
  - [x] **P1.T1.1: Map cases for all five phases**
  - [x] **P1.T1.2: Settle cases — spam yields only the resting phase, single voice**
- [x] **P1.T2: Green — implement the director in `src/state`** — covers: FR-1, FR-8
- [x] **P1.T3: Frame-contract entry — one line per new system with its reason** — covers: NFR-6 (comment-only; runtime slot belongs to Phases 2–3, see verification/phase-1.md)

**Result:** verified
**Checkpoint:** d3099f0a225e5fb4ed2af6bac4420108041bb464
**Evidence:** conductor/tracks/20261128-rituals-day-weather/verification/phase-1.md

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261128-rituals-day-weather/verification/phase-1.md
-->

## Phase 2: Day greetings (dawn / morning / noon)

- **Goal:** dawn, morning, and noon greetings visible in-scene with per-phase
  screenshots.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-4, AC-2 (day), AC-3 (day)
- **Touches:** `src/scene/rituals/day.ts`, `src/scene/actors/*`, `src/scene/init-scene.ts`, `src/scene/frame-contract.ts`, `src/scene/frame-contract.test.ts`
- **Verification:** `pnpm exec playwright test`
- **Status:** verified

- [x] **P2.T1: Spike — actor authoring (procedural vs checked-in recipe), record the decision** — covers: Open question
  - [x] **P2.T1.1: Cap check against NFR-1 (pooled, capped counts) and NFR-3 (precache)**
- [x] **P2.T2: Dawn greeting — chorus critters wake and flutter near the track** — covers: FR-2
- [x] **P2.T3: Morning greeting — butterflies drift over the meadow** — covers: FR-3
- [x] **P2.T4: Noon greeting — full sun glow, critters liveliest** — covers: FR-4

**Result:** verified
**Checkpoint:** d35b17b1f1535c483280983a7a84681d523e959e
**Evidence:** conductor/tracks/20261128-rituals-day-weather/verification/phase-2.md

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261128-rituals-day-weather/verification/phase-2.md
-->

## Phase 3: Dusk and night greetings

- **Goal:** dusk and night greetings visible in-scene with per-phase screenshots.
- **Depends on:** Phase 2
- **Covers:** FR-5, FR-6, AC-2 (night), AC-3 (night)
- **Touches:** `src/scene/rituals/dusk-night.ts`, `src/scene/actors/*`, `src/scene/init-scene.ts`
- **Verification:** `pnpm exec playwright test`
- **Status:** verified

- [x] **P3.T1: Dusk greeting — windows warm, critters settle** — covers: FR-5
- [x] **P3.T2: Night greeting — fireflies rise, headlight on, lullaby hook** — covers: FR-6
- [x] **P3.T3: Reduced-motion resting-state hooks for all five greetings** — covers: FR-9

**Result:** verified
**Checkpoint:** c4500270207f445f349091146f24e44dbf310ef8
**Evidence:** conductor/tracks/20261128-rituals-day-weather/verification/phase-3.md

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261128-rituals-day-weather/verification/phase-3.md
-->

## Phase 4: Per-phase motifs

- **Goal:** five distinct synthesized motifs play through the existing Howler
  unlock path.
- **Depends on:** Phase 1
- **Covers:** FR-7, FR-10 (audio), NFR-2
- **Touches:** `src/audio/rituals.ts`, `src/audio/rituals.test.ts`
- **Verification:** `pnpm exec playwright test`
- **Status:** pending

- [ ] **P4.T1: Red — unit tests for motif definitions (distinct per phase, night = lullaby phrase)** — covers: FR-7
- [ ] **P4.T2: Green — implement motifs, wire night to the music-box lullaby phrase** — covers: FR-7
- [ ] **P4.T3: Unlock-path and instant-mute regression** — covers: FR-10

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261128-rituals-day-weather/verification/phase-4.md
-->

## Phase 5: Settle hardening and evidence

- **Goal:** spam-proof settle, resting states everywhere, full `pnpm check`
  green, evidence bundle committed.
- **Depends on:** Phase 2, Phase 3, Phase 4
- **Covers:** FR-8, FR-9, FR-10, NFR-1, NFR-2, NFR-3, NFR-4, AC-4, AC-5, AC-6, AC-7, AC-8
- **Touches:** `src/scene/rituals/*`, `src/state/rituals.ts`, `e2e/rituals*.spec.ts`
- **Verification:** `pnpm check`
- **Status:** pending

- [ ] **P5.T1: Reduced-motion e2e — every greeting frozen at resting state** — covers: FR-9, AC-6
- [ ] **P5.T2: Rapid-tap e2e — spam plays exactly one greeting for the settled phase** — covers: FR-8, AC-5
- [ ] **P5.T3: Offline/prod regression — no new dependency, no network, sun/moon unchanged** — covers: FR-10, AC-8
- [ ] **P5.T4: Evidence bundle — 5 screenshots + animated clip (format per plan assumption)** — covers: AC-3, AC-4

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261128-rituals-day-weather/verification/phase-5.md
-->
