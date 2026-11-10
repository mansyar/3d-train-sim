# Progressive Disclosure

## Summary

First-run toddlers now get a basics-only toybox: the full Rails tab,
Adventure minus three-way / double-slip, Town minus station, plus all of
Nature and Critters. Three completed rides unlock the advanced tier
(`switch-3way`, `switch-slip`, and the cargo-loop `station`) with an
icon-only bounce-and-ding celebration. No reading, no fail states, no data
loss. The unlock persists in the world save, survives reload, and
parent-gated full reset clears it back to basics. Pre-tier worlds already
containing an advanced piece auto-unlock on load with every piece kept.

Depends on `clarity-audit_20261110` for the baseline comparison (that track
does not exist yet); this track records the comparison fields, not numbers.

## Track

- Spec: [`./spec.md`](./spec.md)
- Plan: [`./plan.md`](./plan.md)
- Review: [`./review.md`](./review.md)

### What happened

| Phase | Checkpoint | Result |
|---|---|---|
| 1. Tier model (logic) | `cea0533` | `src/core/disclosure.ts` pure model (selector, counter, grandfather, tolerant parse); 21 unit tests TDD Red→Green; `pnpm check` green (53 files / 928 tests) |
| 2. Toybox gating + celebration | `5155d72` | `drawerTabs(state)` filter, hidden (never dimmed) slots, 3rd-ride bounce+ding (exact-once, mute/RM silent); 10 new tests; deviations `src/ui/app.ts` ride hook + `src/style.css` celebration guards |
| 3. Persistence, migration, measurement | `f62000d` | `disclosure` world field (omitted-when-fresh), `recordRide`/`restoreDisclosure` store steps, boot-restore + preset/import grandfather (never hydrate/undo), parent reset clears; new `e2e/disclosure.spec.ts` 3 passed tablet |
| Docs sync | `9df8c95` | product.md Shipped marker; README toybox-stations wording; CHANGELOG `[Unreleased]` entry |

## Requirements

- [x] FR-1 fresh install shows basics tier only
- [x] FR-2 advanced kinds hidden while locked
- [x] FR-3 3rd completed ride triggers unlock
- [x] FR-4 unlock persists + survives reload
- [x] FR-5 pre-tier world with advanced piece auto-unlocks, pieces kept
- [x] FR-6 icon-only celebration, mute/RM respected, taps <100ms
- [x] FR-7 parent reset clears flag
- [x] NFR-1 no perf regression, core/state coverage ≥80%
- [x] NFR-2 privacy: nothing leaves the device, zero external requests asserted
- [x] NFR-3 a11y: no reading, reduced-motion static reveal
- [x] NFR-4 reliability: salvage rules intact, never deletes a piece

## Verification

| Check | Command | Result |
|---|---|---|
| Static + types + unit | `pnpm check` | pass — biome 186 files, tsc, 54 files / 938 tests |
| Coverage | `pnpm test:coverage` | pass — 96.85 / 90.25 / 97.42 / 98.85 (core ~97.6, state 94.30/81.81) |
| E2E (track) | `pnpm exec playwright test e2e/disclosure.spec.ts` | pass — 3 passed, tablet |
| Build | `pnpm build` | pass — PWA precache 178 |
| CI | `gh pr checks` | see checks on this pull request |

## Media

Non-visual behaviour change (drawer tiers + celebration). E2E disclosure
spec is the proof (locked → 3 rides → unlocked → reload; reset → basics;
grandfather intact; muted + reduced-motion static reveal).

## Review

PASS, 0 rounds — clean review, no findings (ses_e3bda2eb8ffeQn6E2oztNmp7xS).

## Deviations and risks

- `src/ui/app.ts` passes audio + prefersStill into the drawer and counts one
  completed ride per riding→idle transition (smallest ride wiring).
- `src/style.css` celebration `.drawer-tab.pop` + `[hidden]` guards +
  reduced-motion cover.
- Phase 3: `src/state/persistence.ts` (WorldReader), `src/ui/toy-drawer.ts`
  (store delegation), `src/main.ts` (boot restore), test-only additions.
- `src/state/world.ts` 343–352 vitest-uncovered; covered behaviorally by e2e.

## Follow-ups

- `clarity-audit_20261110` baseline comparison (fields recorded in
  verification/phase-3.md; human-observed, lands in that track). No issue
  filed — the track does not exist yet.

## Rollback

`git revert` the squash commit. Save-shape change is backward compatible
(optional field, omitted-when-fresh); old saves load as fresh-locked, then
grandfather applies.
