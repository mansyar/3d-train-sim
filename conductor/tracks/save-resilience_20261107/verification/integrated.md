# Integrated verification — Save Resilience

> Track: `save-resilience_20261107`
> Branch: `fix/save-resilience_20261107`
> Date: 2026-11-07
> Head at verification: `e89349f` (all four phases verified)

## Scope

The track changed three layers: snapshot parsing (`src/core/save.ts`), storage
(`src/state/persistence.ts`), and the parent-facing recovery note
(`src/core/recovery.ts`, `src/main.ts`, `src/ui/app.ts`,
`src/ui/parent-gate.ts`, `src/style.css`). This run checks the whole track
together, not one phase at a time.

## Commands and results

| Command | Result |
| --- | --- |
| `pnpm check` | Pass — Biome 163 files, `tsc --noEmit` clean, Vitest 42 files / 784 tests |
| `pnpm test:coverage` | Pass — statements 97.26%, branches 90.94%, functions 98.03%, lines 99.42% (gate 80% on `src/core` + `src/state`) |
| `pnpm build` | Pass — 174 precache entries, 10,540.57 KiB; existing chunk-size warning unchanged |
| `pnpm exec playwright test e2e/save-recovery.spec.ts` | Pass — 8/8 across `tablet` + `phone` |
| `pnpm exec playwright test` (full suite) | 153 passed, 2 failed, 14.5 min — both `Page crashed` on `phone` (see below) |
| Rerun of the two failures | Pass — 8/8 in 1.6 min |

## The two full-suite failures

- `e2e/tunnel.spec.ts:30` and `e2e/wagon-workshop.spec.ts:149`, both `phone`,
  both `page.waitForTimeout: Page crashed` after roughly 14 minutes of the
  shared dev server under two workers.
- Both specs pass in isolation, together, on both projects (8/8, 1.6 min).
- This matches the documented `e2e/README.md` fingerprint: higher worker counts
  and long soak runs hammer the single shared dev server and produce real
  renderer crashes; the README's rule is to rerun the failed spec before
  investigating.
- No save-recovery spec crashed, and neither failure touches persistence code.
  CI on Ubuntu remains the release authority (tech-stack, "CI").

## Acceptance criteria across the whole track

| AC | Phase | Proof |
| --- | --- | --- |
| AC-1 partial snapshot keeps valid toys | 1, 4 | 10-valid/1-invalid unit test; browser seeds 3 valid + 1 unknown type and gets exactly `piece-1..3` |
| AC-2 one bad entry does not discard the meadow | 1 | `parseWorldSnapshot` unit tests; `deserializeWorld` keeps its contract |
| AC-3 corrupt `current` restores `previous` | 2, 4 | Unit fallback tests; browser seeds `current: 'garbage'` + valid `previous` and gets `piece-10`, `piece-11` |
| AC-4 save promotes only readable payloads | 2 | Transaction test: unreadable prior is never promoted |
| AC-5 next save after a restore writes clean data | 2 | Restore-then-save unit test |
| AC-6 duplicates resolve keep-first | 1 | Unit tests for duplicate cells and ids |
| AC-7 parent note appears and dismisses | 3, 4 | Formatter unit tests; browser holds the real 2 s gate, asserts the singular text, dismisses, re-arms, still hidden |
| AC-8 both slots unreadable seeds the starter | 1, 2, 4 | Unit fresh path; browser asserts the starter ids with no console errors |
| AC-9 v1/v2/v3 snapshots still load | 1 | Fixtures per version, status `clean` |

## Residual risk

- No real iPad/Android device was used. The note's styling and the 2 s hold were
  verified only in emulated WebKit/Chromium; the manual-device loop stays
  human-only.
- IndexedDB eviction (the original disaster) is out of scope for this track; it
  is covered by `world-portability_20261107` and `runtime-guarantees_20261107`
  in the roadmap.
- Full-suite stability under local load is unchanged by this track; the two
  crashes reproduce the known soak fingerprint, not a new regression.

## Verdict

Every acceptance criterion has unit-level and (for the boot paths) browser-level
evidence. The track is integrated and ready for review.
