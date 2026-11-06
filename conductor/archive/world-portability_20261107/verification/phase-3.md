# Phase 3 — Browser proof

- **Track:** `world-portability_20261107`
- **Phase:** 3
- **Date:** 2026-11-07
- **Branch:** `feat/world-portability_20261107`
- **Base commit:** `c2cd2092cfa3ce3ffbb54bf5ee332793958c69b8`
- **Head commit (code):** `2504f14d708e6f8f79bff3de4083996ff495713b`
- **Result:** verified

Playwright proves the round trip, the three refusal paths, undo, the mid-ride
import and gate reachability on both shipped form factors (touch-emulated WebKit
on iPad Mini and iPhone 13). No `src/**`, `e2e/helpers.ts` or other Conductor
document changed.

## Command

```sh
pnpm exec playwright test e2e/world-portability.spec.ts
```

| Run | Exit | Result |
| --- | --- | --- |
| 1 (pre-format, exploratory) | 0 | 18 passed (53.4 s) |
| 2 (post-format) | 0 | 18 passed (47.2 s) |
| 3 (final, `[]` refusal added — authoritative) | 0 | 18 passed (50.1 s) |

The run was executed exactly as written, in the foreground, with the config's two
workers. Run 1 was green but predated a `pnpm check` phrasing: Biome flagged
three formatting-only wraps in the new spec, so the file was reformatted by hand
to Biome's output and the command was re-run. Run 2 is that post-format run.
Primary verification then found AC-5's `[]` input unproven (bad JSON and a bad
`version` were covered, but not a JSON array that parses and is rejected as a
non-record), so the unreadable test gained a third attempt and the command was
re-run. Run 3 is the evidence; the only change since run 2 is that third attempt.

## Pass/fail per project

| Project | Passed | Failed | Skipped |
| --- | --- | --- | --- |
| `tablet` (iPad Mini) | 9 | 0 | 0 |
| `phone` (iPhone 13) | 9 | 0 | 0 |

Nine tests × two projects = 18. No retries were configured, triggered, or needed.

## Acceptance criteria → proof

The brief's task parentheticals for T1.3/T1.4/T1.5 name AC-9/AC-6/AC-4, while
`spec.md`'s numbering puts AC-3 on the empty meadow, AC-4 on the oversized file,
AC-6 on a valid replacement and AC-9 on the salvage note. The table maps each AC
to the test that actually exercises the spec's criterion (see Deviations).

| AC | Criterion (short) | Proving test |
| --- | --- | --- |
| AC-1 | Export is named `tiny-tracks-YYYY-MM-DD.json` and carries the world | `saving writes the starter meadow as a dated v3 file` |
| AC-3 | An empty meadow exports and re-imports empty | `an empty meadow saves and re-imports empty` |
| AC-4 | A file over 1 MB is refused with a note and no state change | `an oversized file is refused and changes nothing` |
| AC-5 | `{'not a meadow'`, `{"version":99,…}` and `[]` are each refused, no change | `unreadable files are refused and change nothing` |
| AC-6 | A valid file replaces the world; ids/rotations/cells survive | `a saved meadow re-imports byte for byte` |
| AC-7 | Undo after an import restores the pre-import meadow | `undo puts the pre-import meadow back` |
| AC-8 | Import while the train runs stops the ride before the world changes | `importing mid-ride stops the train before the meadow changes` |
| AC-9 | A salvaged file loads its valid toys and states the skipped count | `a salvaged file keeps its valid toys and names the broken one` |
| AC-10 | Neither file control is reachable/activatable before the 2 s hold | `save and load stay out of reach until the parent gate is held` |

What each test actually asserts, beyond the AC line:

- **AC-10** — on a fresh boot `.preset-tray`, `.portable-export` and
  `.portable-import` are hidden; after the 2 s hold (`.parent-gate` gains
  `is-confirm`) all three are visible. The controls live inside the `hidden` tray,
  so visibility is reachability.
- **AC-1** — `__tinyTracksExport()` name matches
  `/^tiny-tracks-\d{4}-\d{2}-\d{2}\.json$/`; parsed JSON has `version: 3`, array
  `pieces`/`scenery`, no `preferences` key, and piece ids equal
  `__tinyTracksWorld.pieces()` ids. Clicking `.portable-export` then shows
  `Saved <same name>`.
- **AC-3** — after `clearMeadow`, the export parses to empty arrays; importing that
  file shows exactly `Loaded the meadow.` (no skip sentence), the store holds zero
  pieces and scenery, and `.ride-toggle` is disabled.
- **AC-4** — a `1_048_577`-byte buffer of spaces shows
  `That file is too big to be a meadow. Tiny Tracks saves stay under 1 MB.` and
  the export string is byte-identical before and after.
- **AC-5** — three payloads, three separate imports, each showing
  `That file is not a Tiny Tracks meadow, so nothing changed.` and leaving the
  export string unchanged: malformed JSON (`{'not a meadow'`, a syntax error), a
  well-formed snapshot with an unsupported `version: 99`, and `[]`, which is valid
  JSON that parses to a non-record and is refused by the snapshot judgement. Each
  pair of attempts is separated by dismissing the tray via a rail control, then
  re-arming it with `.portable-note` asserted hidden, so no refusal can pass on
  stale text.
- **AC-6** — export from the starter meadow, `clearMeadow`, import the captured
  string; note is `Loaded the meadow.`, `pieces()`/`scenery()` ids and cells equal
  the captured snapshot's in order, and the re-export is **byte-identical** to the
  first (`toBe` on the whole JSON string), which also proves rotations, train and
  consist survive.
- **AC-7** — import a two-straight world over the starter oval, then one
  `.undo-toggle` tap restores the starter ids exactly.
- **AC-8** — the ride is started (`.ride-toggle` gains `is-riding`, aria
  `Stop the train`), the gate is held **during** the ride, an import lands, and
  both the ▶ face/aria return and the imported ids are in the store.
- **AC-9** — the starter snapshot plus one entry with an unknown `type` shows
  `Loaded the meadow. Skipped 1 broken toy.` and every valid piece and scenery id
  and cell lands.

Every test asserts `expect(consoleErrors).toEqual([])` through
`watchConsoleErrors(page)` at the end. The known three.js `PCFSoftShadowMap`
deprecation line is `console.warn`, not `error`, and the WebKit blob noise filter
in `e2e/helpers.ts` was not extended.

## Fixtures used

All fixtures are inline in the spec (no new files, no artifacts):

| Fixture | Shape | Used by |
| --- | --- | --- |
| Starter meadow export | captured at runtime via `__tinyTracksExport()` (v3, 10 pieces / 4 scenery on a fresh boot) | AC-1, AC-6, AC-9 |
| `alternateSnapshot` | `{version: 3, pieces: [straight (2,6), straight (2,7)], scenery: []}` | AC-7, AC-8 |
| Salvage payload | starter snapshot + `{id: 'piece-broken', type: 'not-a-toy', cell: {x: 7, y: 7}, rotation: 0}` | AC-9 |
| Oversized payload | `Buffer.alloc(1_048_577, 0x20)` (one byte over `MAX_IMPORT_BYTES`) | AC-4 |
| Unreadable payloads | `{'not a meadow'`, `{"version":99,"pieces":[],"scenery":[]}` and `[]` | AC-5 |

## Timeouts

Per-test budgets follow the real-time choreography rule in `e2e/README.md`:
first test 120 s (cold transform), round-trip/unreadable/ride 90 s, the rest 60 s.
The gate hold waits on `is-confirm` (20 s ceiling), never a fixed sleep; imports
wait on the note text, never a delay.

## Retries

None. All three runs were fully green; no test was re-run individually.

## Deviations

- **AC numbering in the brief.** The brief labels P3.T1.3 "(AC-9)",
  P3.T1.4 "(AC-6 with skips)" and P3.T1.5 "(AC-4)", which is the reverse of
  `spec.md` for AC-4/AC-6/AC-9. The tests implement exactly the behaviours the
  brief describes; the table above maps each AC to the test that proves the
  spec's criterion.
- **Dismissing the armed tray in the unreadable test.** The brief does not
  prescribe a dismissal, but all three refusal notes are the same string, so the
  test dismisses via `.mute-toggle` (a rail control) rather than tapping the
  meadow — a stray meadow tap can rotate a placed toy and would invalidate the
  "world unchanged" assertion. Mute is a device preference and is not serialised
  by `buildExport`, so the export comparison stays meaningful, and the tray is
  re-armed before each later attempt with `.portable-note` asserted hidden first.
- **AC-5's `[]` input was only proven after primary verification.** The first
  cut proved the malformed-JSON path and the bad-`version` path but not `[]`,
  which is valid JSON that parses and is then refused as a non-record — a distinct
  branch. The unreadable test now covers all three inputs; run 3 above is the
  evidence.
- **No shared helper changed.** The hold helper is duplicated from
  `save-recovery.spec.ts` inside the new file (per the brief's stop-and-report
  rule for `e2e/helpers.ts`); `clearMeadow` and `watchConsoleErrors` are imported
  unchanged.
- No other deviation; the only file touched is `e2e/world-portability.spec.ts`.

## Files changed

| File | Change |
| --- | --- |
| `e2e/world-portability.spec.ts` | New. Nine Playwright tests over both device projects covering AC-1, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, each with a zero-console-error assertion. AC-5 covers three distinct refusal branches: malformed JSON, an unsupported `version`, and a non-record `[]`. |

## Extra check (not the phase command)

`pnpm check` (the project's configured Biome + `tsc --noEmit` + Vitest gate) was
run after formatting and again after the third AC-5 attempt: exit 0 both times —
Biome clean over 167 files, `tsc` clean, Vitest 43 files / 820 tests passed. The
first run caught the three formatting wraps noted above; the second confirms the
`[]` addition needs no reformatting. It is supporting evidence, not the phase
verdict.

## Primary verification

- HEAD at verification: `7d53bfe`; working tree clean.
- `pnpm exec playwright test e2e/world-portability.spec.ts` re-run by the primary
  agent: exit 0, **18 passed** (tablet 9, phone 9) in 50.0 s, no retries.
- `git diff --stat c2cd209..HEAD` = `e2e/world-portability.spec.ts` (359 lines) and
  this evidence file. No `src/**`, no `e2e/helpers.ts`.
- Spec review: every test waits for a state (`.is-confirm`, note text, ride class)
  rather than sleeping; the round trip asserts byte-identical re-export, so cell,
  rotation, id and consist loss would fail; refusals compare the full export
  string before and after, so "changes nothing" is proved, not inferred; AC-5 runs
  three distinct inputs (syntax error, unsupported version, non-record `[]`).
- Rework applied during verification: AC-5's `[]` branch was missing and was added
  after the subagent reported (`2504f14`), then the phase command was re-run.
- Deviation on AC labelling: this brief's task parentheticals mislabelled AC-4/
  AC-6/AC-9; the tests follow the spec's wording and the AC table above maps each
  criterion to its test.
