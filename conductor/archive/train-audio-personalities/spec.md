# Specification — Train Audio Personalities

**Track ID:** `train-audio-personalities`  
**Type:** Feature

## Overview

The train fleet currently exposes whistle personality identifiers, but every locomotive plays the same whistle behavior. This track gives the three existing trains distinct audio personalities by reusing the bundled CC0 whistle recording with gentle per-train playback-rate variations.

No new audio files, dependencies, network calls, or audio engine are required.

## Functional Requirements

1. **Train-specific whistle profiles**
   - Define a stable playback-rate profile for each train:
     - Steam: original pitch and rate.
     - Diesel: slightly lower rate for a fuller character.
     - Tram: slightly higher rate for a lighter character.
   - Keep rate values within a gentle, toddler-safe range.
   - Profiles must be deterministic and pure data.
2. **Audio controller**
   - Extend the whistle command to accept the selected train kind or resolved whistle profile.
   - Continue using the existing lazily-created `whistle` Howler sound.
   - Apply the selected rate before playing.
   - Restore the standard rate after playback or before the next whistle so one train’s profile cannot leak into another.
   - Preserve the existing fire-and-forget behavior.
3. **UI integration**
   - The whistle button uses the currently selected train’s profile.
   - Changing the selected train changes the next whistle’s character.
   - Whistling remains available while parked or riding.
   - No text is required in the kid-facing UI.
4. **Mute and audio unlock**
   - Muted whistles remain silent.
   - Existing global mute behavior is unchanged.
   - Existing iOS/browser audio-unlock behavior is unchanged.
   - Audio failures must never interrupt train selection, riding, or placement.
5. **Ride compatibility**
   - Chug playback and ride synchronization remain unchanged.
   - Train-specific whistle rates must not affect chug rate or dead-end softening.
   - Pathing, motion, camera behavior, and persistence remain unchanged.
6. **Testing**
   - Add unit tests for every train’s whistle-rate profile, rate application before whistle playback, rate reset/normalization between whistles, muted whistle behavior, and existing audio compatibility.
   - Extend Playwright smoke coverage to confirm the whistle button works with each train selected and produces no console errors or external requests.

## Non-Functional Requirements

- Reuse the existing bundled CC0 whistle recording.
- No new binary assets or dependencies.
- No runtime network requests.
- Keep playback-rate differences subtle and non-startling.
- Maintain the existing Howler-based audio abstraction.
- Preserve touch-first controls and instant feedback.
- New logic-bearing profile behavior should exceed 80% test coverage.

## Acceptance Criteria

- Steam, diesel, and tram whistles are audibly distinct through playback-rate variation.
- Steam uses the existing baseline rate.
- Diesel plays at a slightly lower rate.
- Tram plays at a slightly higher rate.
- Switching trains changes the next whistle without restarting or changing the chug.
- Mute remains instant and complete.
- Whistles remain available both while riding and while parked.
- No rate state leaks between consecutive whistles or train changes.
- Existing ride, placement, save/load, and train-selection behavior remains green.
- `pnpm check` and Playwright smoke tests pass.
- No external requests or console errors occur.

## Out of Scope

- New audio recordings.
- Audio synthesis or Web Audio.
- Separate chug sounds per train.
- Volume changes, spatial audio, or dynamic mixing.
- New audio dependencies.
- Multi-train audio or simultaneous locomotives.
- Changes to path solving, ride motion, scene models, or persistence format.
