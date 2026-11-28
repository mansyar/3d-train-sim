# Review — 20261128-longer-trains

## Verdict

**PASS** (round 1, reviewer `ses_dde899022ffex7qNC70RoeU7ZI`).

Longer-trains fully implements FR-1–FR-8, NFR-1–NFR-6 and AC-1–AC-7 with
additive-only persistence, count-agnostic motion/cargo paths, and gated
drawer UI.

## Findings (2 Low — no fix round; below the medium block threshold)

- **F1 (Low)** `src/state/world.ts:290-300` — `selectWagonOutfit` invalid-preset
  branch resets the slot to classic without `notify()`; unreachable from the
  drawer (only valid presets pass through), stale mesh only until the next
  notified mutation. Fix if touched: notify after reset, or return false
  before mutating when already classic.
- **F2 (Low)** `src/ui/train-picker.ts:328` — `wagonTally.dataset.count` is
  written but never read (`textContent` is the live tally). Dead write; remove
  or use as tally source when next editing the drawer.

## History

| Round | Verdict | Notes |
|------:|---------|-------|
| 1 | PASS | 2 Low nits, no requirement gaps, no fix round needed |

## Doc sync

`none` — code-only feature track; no product/workflow/tech-stack/guideline changes.
