# Local Insights — Implementation Plan

> **Branch:** `feat/local-insights_20261111`
> **Base:** `main` @ `e86be96aef2f64ca31102294022e9fdfeaa6b6d2`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Insights model and clock rules

- **Goal:** Pure logic records sessions, longest session, resets, unclean exits and save outcomes with test-first proof and no storage or DOM dependency.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, NFR-1, NFR-3, NFR-5, AC-1, AC-2, AC-3, AC-4, AC-8
- **Touches:** `src/core/insights.ts`, `src/core/insights.test.ts`
- **Verification:** `pnpm check`
- **Status:** verified

- [x] **P1.T1: Red — write failing tests for the insights model and clock rules** — covers: FR-1, FR-2, FR-3, FR-4, NFR-1, AC-1, AC-2, AC-3, AC-4, AC-8
  - [x] **P1.T1.1: Session clock cases** — foreground start/hide end, duplicate visible, zero-duration guard, longest-session update.
  - [x] **P1.T1.2: Counter cases** — reset increment, dirty-boot increment and clean-hide clear, last save outcome, unavailable estimate, negative-duration guard.
- [x] **P1.T2: Green — implement the pure insights model** — covers: FR-1, FR-2, FR-3, FR-4, NFR-1, NFR-3, NFR-5, AC-1, AC-2, AC-3, AC-4
  - [x] **P1.T2.1: State shape and reducers** — counters, longest duration, save outcome, plain-word formatting helpers.

**Result:** verified
**Checkpoint:** 3315635
**Evidence:** conductor/tracks/local-insights_20261111/verification/phase-1.md
**Note:** No squash — the active goal prohibits `reset`; the reported Red, Green and evidence commits are retained.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/local-insights_20261111/verification/phase-1.md
-->

## Phase 2: Local persistence and capture wiring

- **Goal:** Counters persist in a separate IndexedDB store and all boundary hooks record sessions, resets, unclean exits and save outcomes without touching the world snapshot.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-7, NFR-2, NFR-3, NFR-5, AC-1, AC-2, AC-3, AC-4, AC-6
- **Touches:** `src/state/insights-store.ts`, `src/state/insights-store.test.ts`, `src/state/persistence.ts`, `src/state/persistence.test.ts`, `src/main.ts`, `src/state/world.ts`, `src/state/world.test.ts`
- **Verification:** `pnpm check`
- **Status:** verified

- [x] **P2.T1: Add the separate insights store and database migration** — covers: FR-2, FR-5, FR-7, NFR-5, AC-2, AC-6
  - [x] **P2.T1.1: Extend the existing database to version 2 with an `insights` object store** — load/save helpers never read or write world snapshot keys.
- [x] **P2.T2: Wire the capture boundaries** — covers: FR-1, FR-2, FR-3, FR-4, NFR-2, NFR-3, AC-1, AC-2, AC-3, AC-4
  - [x] **P2.T2.1: Session and unclean-exit markers** — boot marker, visibility/unload session close, clean-hide clear.
  - [x] **P2.T2.2: Reset hook, save outcome and quota probe** — reset increments the counter; last save outcome and estimate are recorded on tray open.

**Result:** verified — v2 idempotent dual-store migration, defensive never-throwing load/save, `onReset` hook and boundary-only capture in `main.ts`; `pnpm check` exit 0 (Biome 190 files, tsc clean, Vitest 56 files / 975 tests). No code outside amended Touches; no network/identifier additions.
**Checkpoint:** 302643e
**Evidence:** conductor/tracks/local-insights_20261111/verification/phase-2.md

## Phase 3: Gated panel, Playwright journey and docs

- **Goal:** Parents see the five local values only after the hold gate, with an e2e proof and shipped docs.
- **Depends on:** Phase 2
- **Covers:** FR-4, FR-6, FR-7, FR-8, NFR-2, NFR-4, NFR-5, AC-4, AC-5, AC-6, AC-7, AC-8
- **Touches:** `src/ui/app.ts`, `src/ui/parent-gate.ts`, `src/style.css`, `e2e/insights.spec.ts`, `conductor/product.md`, `README.md`, `CHANGELOG.md`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/insights.spec.ts`
- **Status:** pending

- [ ] **P3.T1: Add the read-only panel inside the parent tray** — covers: FR-4, FR-6, NFR-4, NFR-5, AC-4, AC-5
  - [ ] **P3.T1.1: Markup and styles** — text-only rows for sessions, longest, resets, unexpected closes and storage health; no kid-facing control.
- [ ] **P3.T2: Prove the gate in Playwright** — covers: FR-6, NFR-4, AC-5, AC-6
  - [ ] **P3.T2.1: Journey** — values hidden before the hold, visible after it, no network requests added.
- [ ] **P3.T3: Sync roadmap and parent docs** — covers: FR-8, AC-7

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 3
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
