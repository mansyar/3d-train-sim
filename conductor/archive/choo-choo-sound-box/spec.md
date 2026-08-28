# Specification — Choo-Choo Sound Box

- **Track ID:** `choo-choo-sound-box`
- **Type:** Feature
- **Status:** Approved (2026-08-28)
- **Product area:** V1 scope item 6 (Sound) + whistle half of item 4 (Go/Stop/Whistle panel)

## Problem

The app is silent. A toddler toy train without sound is missing its soul: no chuffing as the engine works, no whistle to blast, no happy feedback when a rail snaps into place. `src/audio/` holds only a `.gitkeep`, Howler is not installed, and the whistle half of the ride control panel is unbuilt.

## Goal

Give Tiny Tracks its voice: a ride-synced chug loop, a big friendly whistle, cheerful placement dings, and a parent-friendly mute — all from bundled, license-safe CC0 audio.

## User experience

- **Chug loop** — while the train is moving, a gentle chuff plays, looped seamlessly. It softens during dead-end pauses and ends *with* the ride (gentle ease-out, never an abrupt cut). Silent while the train is parked.
- **Whistle** — a big round whistle button sits in the toybox rail next to the ride toggle. Toot anytime — even while riding, so kids can chug-and-toot together.
- **Happy dings** — a short cheerful ding plays when a piece is placed or relocated successfully. Failed drops keep their existing wobble feedback (no scolding sounds). Trash stays quiet.
- **Mute toggle** — a chunky sound on/off button in the rail. Instant, session-only (persistence is a separate track), sound **on** by default.

## Non-goals

- IndexedDB world persistence (explicitly deferred to its own track)
- Scenery placement or any new track pieces
- Recording/producing audio — bundle existing CC0 files only

## Behavior contract

1. No sound before the first user gesture (browser autoplay policy). The chug starts on the first **go** press, never on page load.
2. Chug state derives from the ride controller (single source of truth): ride starts → chug starts; ride stops (button, or mid-ride world edit) → chug eases out. Motion and chug never disagree.
3. During a dead-end pause the chug softens (rate/level dip) and resumes with motion.
4. Whistle one-shot plays anytime, including while riding; overlapping toots are safe.
5. Successful place/relocate plays a ding; failed drops and trash are silent.
6. Mute is instant and global (all audio), session-only, defaults to sound on.
7. Audio work must not affect the frame loop (no rAF coupling); Howler's Web Audio path is the default.

## Technical approach

- Install **Howler.js** (`howler`); add type package if the installed version does not bundle types.
- New `src/audio/` module: `createAudioController()` service in the house style (framework-free, subscribable), wired via `main.ts` / `init-scene.ts` the same way the ride controller is. A Howler seam (injectable) keeps the controller unit-testable.
- Asset loading is lazy: Howler loads each sound on first use; placeholder-safe behavior (no crash) if assets fail to load.
- Extend workbox `globPatterns` (vite.config.ts) so the service worker precaches the audio files (all well under the 6 MB cap).
- UI: whistle + mute buttons join the toybox rail in `src/ui/app.ts`; ding hook lands in the existing success path (`ping()`).

## Assets & licensing

- `public/audio/`: `chug-loop`, `whistle`, `ding` as ogg/mp3 pairs sourced from CC0 libraries (e.g., Kenney audio packs), with `CREDITS.md` recording source and license.

## Testing strategy (TDD, per workflow.md)

- **Unit (vitest):** audio controller with mocked Howler — mute toggling, chug start/stop/re-entry, whistle/ding one-shots, empty-meadow guard interplay, no-op calls when muted.
- **E2E (Playwright):** extend the smoke — audio chrome mounts, mute toggle flips visible state, page stays free of console/page errors.

## Open questions

None — resolved during intake: chug is ride-synced; sfx bundled as CC0 files; whistle + mute live in the rail; chug tied to motion state.
