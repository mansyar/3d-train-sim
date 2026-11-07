# Parity ledger — `e2e-cost_20261108`

Every test that existed at the track's base (`cb9a6c4`) is accounted for here: either it survives inside
a merged journey, or it is untouched and still stands alone. Every assertion that was removed outright is
paired with the unit test that proves the same behaviour.

Base: **96 tablet tests in 27 files**. Head: **49 tablet tests in 20 files** (57 runs: 49 tablet + 7 phone
+ 1 prod).

## The accounting

| Bucket | Originals | Now | Documented in |
|---|---|---|---|
| Mechanical clusters (switches, hills, river, cargo, tunnel, crossing gate) | 29 | 12 | `verification/phase-2.md` → Parity table |
| `smoke.spec.ts` | 20 | 9 | `verification/phase-3.md` → parity table |
| New modules + galleries (portability, recovery, guarantees, starter, park-spot, delight, sun-moon, toybox) | 38 | 19 | `verification/phase-4.md` → Parity table |
| Untouched | 9 | 9 | below |
| **Total** | **96** | **49** | |

## Untouched (9)

| File | Tests | Why it was not merged |
|---|---|---|
| `hill-pace.spec.ts` | 4 | Each test measures a different grade at a different pace; the numbers are the point, and sharing a boot would let one ride's speed settle into the next. |
| `undo.spec.ts` | 2 | Already two tests, one placement and one trash-plus-reload; nothing duplicated. |
| `music-box.spec.ts` | 1 | One test, one boot. |
| `fleet.spec.ts` | 1 | One test, one boot. |
| `phone-shell.spec.ts` | 1 | One test, one boot, and the only layout witness in the phone lane. |

## Assertion economics

`expect(` per file, base → head (`git show cb9a6c4:e2e/<file>` vs the working tree):

| File | Base | Head | Note |
|---|---|---|---|
| `switches.spec.ts` (+4 deleted siblings) | 68 | **74** | Grow: each merged ride now also witnesses `switchPose` before/after, which its own file never did |
| `cargo.spec.ts` (+`wagon-workshop`) | 25 | **21** | −4: the `restored ?? 0` / `count ?? -1` pairs became direct post-reload reads |
| `river.spec.ts` (+`river-life`) | 25 | **23** | −2: duplicated screenshot-diff plumbing folded |
| `hills.spec.ts` (+`hills-phase2`) | 15 | **11** | −4: `is-riding` and console checks now once per journey |
| `tunnel.spec.ts` | 9 | **9** | None |
| `crossing-gate.spec.ts` | 11 | **11** | None |
| `smoke.spec.ts` | 101 | **94** | −7: per-test console/external pairs deduped into one per journey |
| `world-portability.spec.ts` | 89 | **65** | −24: three refusal permutations unit-owned, plus dedupe |
| `save-recovery.spec.ts` | 25 | **20** | −5: three corruption classes unit-owned, plus dedupe |
| `runtime-guarantees.spec.ts` | 33 | **33** | None |
| `starter-railway.spec.ts` | 21 | **21** | None |
| `park-spot.spec.ts` | 14 | **12** | −2: dedupe |
| `delight-toys.spec.ts` | 6 | **5** | −1: dedupe |
| `sun-moon.spec.ts` | 13 | **13** | None |
| `ride-toybox-flow.spec.ts` | 26 | **25** | −1: dedupe across the merged pair |
| deleted files | 91 | — | moved into the cluster files above |

Suite totals: `expect(` **544 → 500**, `waitForTimeout` **132 → 117**. The wait drop is removed boot and
settle pairs; no wait was shortened, no poll widened and no timeout lowered anywhere in the track.

## Dropped outright, with witness

Only six assertions were removed rather than carried or deduped. Each names a unit test that proves the
same behaviour, and each witness was grepped in `src/` at the head (P6.T1.2).

| Removed | Original | Witness | Found at |
|---|---|---|---|
| Oversized-file test: instrumented read counters, 1 048 577-byte file, `too big` note, zero reads, export unchanged | `world-portability` > an oversized file is refused and changes nothing | `readImport size guard > refuses a file one byte over the cap without carrying a world`; `readImport size guard > checks size before parsing`; `readImport refusal > leaves no world behind on a refusal` | `src/core/portable.test.ts:124`, `:130`, `:149` — and, **not** witnessed: the sentence a parent sees for a `too-large` import (`src/ui/parent-gate.ts:187`, used at `:270`) is no longer asserted in either suite |
| `{"version": 99}` refusal | `world-portability` > unreadable files are refused and change nothing | `readImport refusal > refuses %j without carrying a world` (the version-99 case) | `src/core/portable.test.ts:137` (it.each) |
| `[]` refusal | same | same case list | `src/core/portable.test.ts:137` |
| Empty-salvage restore boot | `save-recovery` > a boot ignores an empty salvage and restores the previous save | `indexeddb storage > restores the previous world when current is only an empty salvage`; `never promotes an empty salvage over a good previous`; the note copy in `recoveryNotice > reports a restored backup calmly, without counts` | `src/state/persistence.test.ts:506`, `:520`; `src/core/recovery.test.ts:14` |
| Duplicate-only salvage boot | `save-recovery` > a duplicate-only salvage still tells a grown-up | `snapshot recovery - malformed entries never destroy valid work > keeps the first claimant of a duplicated cell and counts the later ones`; `recoveryNotice > reports a duplicate-only salvage in the singular` | `src/core/save.test.ts:214`; `src/core/recovery.test.ts:48` |
| Both-slots-unreadable fresh boot | `save-recovery` > both unreadable slots seed the starter meadow without a console error | `indexeddb storage > falls back to fresh when both slots are unreadable or missing`; `snapshot recovery tests — > never throws and always reports a defined status for hostile input` | `src/state/persistence.test.ts:550`; `src/core/save.test.ts:494` |

**Why the browser half of each is safe to lose.** In every case the removed browser test proved a
*judgement* (does this input produce a world, a refusal, or a fallback?) and the judgement is pure — it
lives in `src/core` and is exercised without a DOM. What the browser could add is the wiring, and the
wiring is still proven once by a sibling that boots the same code path: the surviving malformed-JSON
refusal, the surviving restored boot, and the surviving salvage boot each assert the note text and the
untouched world in a real browser. No test was removed whose subject existed only in the browser.

## What this ledger does not claim

- It does not claim 49 tests are as thorough as 96 *runs*: fewer boots means less repeated wiring proof.
  The claim is that each behaviour keeps a witness and each lock keeps its door — the sum of distinct
  behaviours is unchanged, the number of times each is re-proved is smaller by design.
- It does not claim every *sentence* survived. The `too-large` note a parent reads is now unwitnessed
  (the core refusal is not), because the browser test that asserted it was one of the six drops. That is
  recorded as debt rather than glossed: a copy change there would ship unnoticed.
- It does not claim the phone lane covers the whole suite. It covers three allowlisted files, which is
  what FR-3 asks for and what AC-4 measures.
