# Phase 4 verification — Per-phase motifs

Track: `20261128-rituals-day-weather`
Branch: `feat/20261128-rituals-day-weather`
Phase base: `c18869f754fc6659deb13b6f790009487b725bf0`

## Goal

Five distinct synthesized motifs (FR-7), routed through the existing Howler
gesture-unlock path with instant mute (FR-10), with no new dependency, asset,
download or network call (NFR-2).

## P4.T1 — Red: motif definition tests

`src/audio/rituals.test.ts` (new, 9 tests) pins, before the implementation
landed: all five `Greeting` keys have a motif with a unique note signature;
night's notes are verbatim the `abc` (Twinkle) entry in `MELODIES`; phrases are
short; definitions contain no file/network strings; mute and suspension wind a
motif silently; unmuting lets it speak; the director subscription skips night;
lifecycle/disposal unsubscribe cleanly. Tests use a fake `AudioController` and
mock `createMusicBoxVoice` — no DOM, no real audio device.

## P4.T2 — Green: motifs + wiring

- `src/audio/rituals.ts` (new): `RITUAL_MOTIFS` is a
  `Readonly<Record<Greeting, RitualMotif>>` with four hand-authored short
  signatures (rising dawn chime, paired butterfly flutter, bright noon
  arpeggio, settling dusk descent) and night's lullaby taken from the
  songbook. `createRitualAudio({ audio, director })` owns one dedicated
  `createMusicBoxVoice`, plays the four day motifs from the settled director,
  and exposes `play/probe/suspend/resume/dispose`. Witness: `lastMotif`,
  `plays` (windings, including muted ones), `audiblePlays` (notes scheduled),
  `muted`, `suspended`.
- The dedicated voice means a passing train's music box cannot cut a greeting
  short; a new motif takes over the last phrase so phases never stack voices.
- Mute is instant: `audio.subscribe` mirrors the switch into the witness and
  the reused music box cuts any ringing phrase on the same notification. A
  muted or suspended phase still winds (the visual greeting never waits) but
  schedules no notes.
- `src/scene/init-scene.ts` (wiring only): constructs `createRitualAudio` from
  the one app-wide `AudioController` and the shared director; replaces the
  Phase 3 counted no-op with exactly one night hook —
  `registerLullabyHook(() => ritualAudio.play('night-fireflies'))`; day motifs
  come from the director, plus an explicit reduced-motion `play(greeting)` for
  non-night phases where the frame loop never ticks; adds
  `suspend()/resume()` to the existing pause lifecycle, `dispose()` to teardown,
  and `ritualAudio(): RitualAudioWitness` to the dev-only `SceneHandle`.

### Deviation from the brief's "Read first" paths

The brief names `src/audio/melodies.ts`; the actual songbook is
`src/core/melodies.ts` (`Melody`, `MELODIES`, `abc` Twinkle). No source file was
moved — only the import path used by the new module differs from the stale
brief reference.

## P4.T3 — Regression: unlock path + instant mute

`e2e/rituals-audio.spec.ts` (new) uses the dev `SceneHandle` witnesses and an
instrumented `AudioContext.resume` counter instead of a microphone; no audio
fixtures, no network. The spec runs under Chromium because this lane's headless
WebKit has no `AudioContext`. It proves: a motif may wind before a gesture but
nothing explicitly resumes audio; a real `.day-toggle` gesture resumes audio
through the existing unlock seam; the next motif is audible; clicking
`.mute-toggle` sets `aria-pressed` and the witness `muted` immediately, after
which motifs wind but `audiblePlays` does not move; unmuting restores audible
plays; night still has exactly one lullaby hook and fires it; console stays
clean. `watchConsoleErrors` supplies the existing WebKit `blob:` allowlist.

## Checks

- `pnpm check` (biome + tsc + vitest) → exit 0, 215 files checked, 62 test
  files / 1069 tests passed. Early runs exited 1 on biome import-sort/format
  findings in the new files and on a Red-phase missing module/import; all
  fixed by hand with `edit`. Harmless pre-existing Vite `configLoader: 'native'`
  warning.
- `pnpm exec playwright test e2e/rituals-audio.spec.ts --project=tablet` →
  exit 0, 1 passed (27.4 s), zero console errors. Earlier drafts failed on a
  headless-WebKit AudioContext assumption and a stale witness probe; replaced
  with Chromium + resume counting.
- `pnpm exec playwright test` → see primary verification note below. Full-suite
  proof is Phase 5 scope per the brief; the targeted regression above is this
  phase's gate.

## Files

- `src/audio/rituals.ts` (new)
- `src/audio/rituals.test.ts` (new)
- `src/scene/init-scene.ts` (modified — night-hook motif wiring + dev witness only)
- `e2e/rituals-audio.spec.ts` (new)
- `conductor/tracks/20261128-rituals-day-weather/verification/phase-4.md` (evidence)

## Commit

None — the brief requires explicit instruction from the primary before committing.

## Primary verification (2026-11-28T03:08:43+11:00)

- Tree vs phase base `c18869f`: only `src/audio/rituals.ts`, `src/audio/rituals.test.ts`
  (new), `src/scene/init-scene.ts` (hook wiring), `e2e/rituals-audio.spec.ts` (new) and
  `verification/phase-4.md` — matches Touches plus the allowed e2e spec.
- `pnpm check` re-run by the primary: green, 62 files / 1069 tests.
- `pnpm exec playwright test e2e/rituals-audio.spec.ts` re-run by the primary: 1 passed
  on `[tablet]` (31.7 s), zero console errors.
- Correction recorded: the file holds 9 `it(` blocks, not 10 as claimed — 1060 + 9 = 1069
  matches the suite total, so 9 is the true count. Non-blocking.
- Deviation accepted: songbook lives at `src/core/melodies.ts`, not `src/audio/melodies.ts`
  as the brief said — import path only, no file moved.
- FR-7 / FR-10 / NFR-2 covered; full-suite green is Phase 5 scope.
- **Result:** verified. **Checkpoint:** `183d07f`. **Evidence:** `verification/phase-4.md`.
