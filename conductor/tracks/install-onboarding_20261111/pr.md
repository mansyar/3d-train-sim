## Summary

Families on iPad or iPhone now get a short "Add to Home Screen" hint inside the
existing 2-second parent tray — never in the toddler UI. A pure standalone
classifier hides the hint entirely once installed; dismissal is saved in the
existing world snapshot and returns after a world reset. No telemetry, new
storage keys, or viewport-policy changes.

## Track

- **ID:** `install-onboarding_20261111`
- **Type:** `feature`
- **Spec:** [`conductor/archive/install-onboarding_20261111/spec.md`](conductor/archive/install-onboarding_20261111/spec.md)
- **Plan:** [`conductor/archive/install-onboarding_20261111/plan.md`](conductor/archive/install-onboarding_20261111/plan.md)
- **Review:** [`conductor/archive/install-onboarding_20261111/review.md`](conductor/archive/install-onboarding_20261111/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Classifier and preference data layer | Pure install-mode classifier and persisted dismissal flag | verified | `865e694` | Injectable signals; full-snapshot saves stay non-fatal |
| 2: Gated tray hint and wiring | Hint only in the 2 s-hold tray when browsing and not dismissed | verified | `f840407` | Runtime media-query change handling; no kid-UI changes |
| 3: E2E verification | Browser proof of gating, persistence, reset, and a11y | verified | `290646a` | One authorized rework in `parent-gate.ts` (dismiss binding + axe-clean label) |

## Requirements

- [x] `FR-1` — Classify installed vs browser from injectable standalone signals (`src/core/install-mode.test.ts`)
- [x] `FR-2` — No hint at all when installed (`e2e/install-onboarding.spec.ts`)
- [x] `FR-3` — Icon-led parent hint with iOS Share → Add to Home Screen instruction (`e2e/install-onboarding.spec.ts`)
- [x] `FR-4` — Hint lives only in the parent tray; kid shell unchanged (`e2e/install-onboarding.spec.ts`)
- [x] `FR-5` — Dismissal persists across reload, clears on reset (`save.test.ts`, `persistence.test.ts`, e2e)
- [x] `FR-6` — Rejected snapshot save is non-fatal (`src/state/persistence.test.ts`)
- [x] `NFR-1` — 80% coverage gate holds on `src/core` + `src/state`
- [x] `NFR-2` — No new permissions, telemetry, network, storage keys, or UA sniffing
- [x] `NFR-3` — Parent-tray styling, labelled dismiss control, no new axe violations
- [x] `NFR-4` — `user-scalable=no` / parent-only zoom policy unchanged
- [x] `AC-1` — Classifier unit cases, including missing APIs and media change
- [x] `AC-2` — Standalone emulation renders no hint element
- [x] `AC-3` — No hint before hold; icon and instruction after hold
- [x] `AC-4` — Hint nested in `.preset-tray`; kid shell DOM unchanged
- [x] `AC-5` — Dismiss → reload → hidden; reset → hint returns
- [x] `AC-6` — Rejected save leaves dismissal resolved and throws nothing

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| lint | `pnpm exec biome check .` | pass | 195 files, no fixes |
| typecheck | `pnpm exec tsc --noEmit` | pass | clean |
| unit | `pnpm test` | pass | 57 files / 1009 tests |
| coverage | `pnpm test:coverage` | pass | 97.05% stmts / 91.19% branches / 97.39% funcs / 98.86% lines |
| build | `pnpm build` | pass | Vite + PWA service worker |
| e2e | `pnpm exec playwright test` | pass | 68 passed, 1 pre-existing `@ci` skip |

`conductor/archive/install-onboarding_20261111/verification/integrated.md`

## Media

![Parent hold reveals the install hint; Dismiss removes it](.conductor/media/install-onboarding_20261111/install-hint.gif)

Three-frame GIF (kid shell → 2 s parent hold with icon, instruction and Dismiss → hint gone), captured at `05a73d4` on an iPad Mini viewport.

## Review

- **Verdict:** `PASS`
- **Rounds:** 1
- **Fixed:** 0 findings (one authorized phase-3 rework fix was completed before review)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- Minimal source fix in `src/ui/parent-gate.ts` outside the phase 3 `Touches` list: bound the dismiss button on the boot-rendered hint (AC-5) and changed its visible text from "OK" to "Dismiss" so axe's `label-content-name-mismatch` clears (NFR-3). Explicitly authorized rework, documented in the phase 3 evidence and accepted by the primary.
- No real-device iPad Safari check by design (settled at spec interview); detection relies on `(display-mode: standalone)` and `navigator.standalone` only.

## Follow-ups

- none

## Rollback

```bash
# Squash commit
git revert --no-edit <squash-commit>
```

The hint flag is an optional field in an existing world snapshot; reverting the
code leaves old snapshots valid and hides the hint entirely. No migration or
feature flag to unwind.
