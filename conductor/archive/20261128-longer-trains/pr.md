# feat(scene): RM-005 Longer trains — free add-a-wagon to max 4

Kids can grow any consist from the classic pair to four wagons: a compact `+`
slot in the trains drawer, loop-fit gating (dimmed when the loop is too short),
per-wagon preset dressing, tap-last-to-remove, full cargo on extras, persisted
length + outfits, and parent-gated reset returns to the classic pair.

## Phases

| Phase | Product commit | Coverage |
|-------|---------------|----------|
| 1 — Length model + fit rule | `a9881d7` | store 1..4 uniform, 4-slot outfit rack, pure `consistFitsLoop`, additive save + portable export |
| 2 — Drawer wagon controls | `7fd7e04` | chips + tally + gated `+`, select-for-dress, tap-last remove, min-one guard |
| 3 — Scene consist + cargo | `d1a95ed` | per-slot outfits, extras inherit loco paint, generic cargo/load/deliver, 4-wagon dead-end + switch proofs |
| 4 — Dress persistence + reset | `b4136f9` | watcher with byte-identical guard, restore-before-watchers, reset-to-pair, livery contract (A5) |
| 5 — Evidence + hardening | `017d77a` | committed PNG + GIF bundle, full matrix proof |

## Requirements

FR-1–FR-8, NFR-1–NFR-6, AC-1–AC-7 all covered and evidenced
(`verification/phase-5.md`, `evidence/` bundle, `verification/integrated.md`).

## Verification

- `pnpm check`: biome clean, tsc clean, 63 files / 1124 vitest tests passed
- `pnpm test:coverage`: 97.19% / 91.9% / 97.31% / 98.95% (gate 80%)
- `pnpm build`: 126 modules, precache 178 entries (no new assets)
- Full tablet matrix: 110 passed / 1 skipped / 0 failed
- Manual-device layer skipped per standing human-only rule

## Media

![Four-wagon consist overview](https://github.com/user-attachments/assets/3c94476b-9db6-445b-b2bd-dcf12a7e25d3)
![Greeting-style cycle of a longer consist at work](https://github.com/user-attachments/assets/9c77bfe4-38c5-4b70-839b-75e70fe8c3f8)

## Review

Round 1 **PASS** — 2 Low nits recorded in `review.md`, no fix round needed:
F1 `world.ts` invalid-preset branch skips `notify()` (unreachable from UI);
F2 dead `wagonTally.dataset.count` write. Both are touch-if-needed cleanups.

## Deviations

- `src/core/portable.ts` additive-only export fields (only portable writer).
- P5 test-only drawer-spec alignment to FR-7 reset-to-pair + unit-covered fit rule.
- P4 TDD home `persistence.test.ts`; 3-line DEV-only `bodyHex` consist witness.
- A5: extras inherit loco paint scene-side; `classic` doubles as not-chosen sentinel.

## Rollback

Revert the merge commit: drawer, store, scene, and save changes are additive
behind the classic-pair default; snapshots without consist fields load unchanged.

