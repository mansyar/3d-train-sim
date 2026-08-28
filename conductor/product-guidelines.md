# Product Guidelines — Tiny Tracks

The quality bar. Every implementation track is reviewed against these rules. They override convenience and speed.

## Interaction principles

1. **No fail states, ever.** Nothing can be broken, lost, or failed. There is no wrong track layout, no dead end, no game over. A broken track graph is a bug we fix, never a state the kid experiences as failure.
2. **No reading required.** The kid-facing UI uses icons, animation, and sound only. No labels, no instructions, no text (numbers and letters may appear as decorative toy elements only).
3. **The train is always autonomous.** The kid never drives the train. They build the world; the train brings it to life. Go/Stop/Whistle are the only direct controls, and Stop just pauses the chugging, never punishes.
4. **Instant feedback.** Every touch responds in <100ms: a scale-bounce, a sound, a particle. Nothing in the kid UI ever feels dead or unresponsive.
5. **Toddler-proof gestures.** Only tap and drag. No pinch, no long-press, no double-tap, no hover, no drag-precision under ~48px tolerance. Accidental touches must never cause destructive changes.
6. **Autosave always.** The world saves automatically and silently after every change. Loading the app always restores the last world exactly as it was.
7. **Destruction is parent-gated.** Reset/clear/overwrite actions live behind the parent gate (a hold-and-confirm interaction a toddler cannot perform by accident).

## Audio principles

1. **Sound rewards action.** Whistles, chugga-chugga, happy dings — audio confirms the kid's agency.
2. **No sudden, loud, or scary sounds.** No sharp attacks, no screams, no low rumble menace. Max volume is capped well below device maximum.
3. **Mute is instant.** One tap silences everything, right now. (Persistence across reloads arrives with the saving track.)

## Visual principles

1. **Toy-like, cheerful, saturated.** The world should feel like a sunlit playroom: warm palette, rounded forms, soft shadows.
2. **Chunky, readable silhouettes.** Every object is recognizable at arm's length in a moving car.
3. **Gentle motion.** Camera moves ease in and out. No shakes, flashes, strobing, or rapid cuts.
4. **Big targets.** Kid-interactive elements are ≥64px with generous spacing.
5. **High contrast** between interactive elements and background.

## Content principles

1. Positive themes only: play, building, friendship, gentle nature.
2. No violence, no threats, no peril, no time pressure, no countdowns.
3. No ads, no external links, no purchases, no upsells, no "click here" distraction.
4. Nothing the kid does can ever trigger a web navigation, a download, or a system dialog.

## Privacy principles

1. **Nothing leaves the device.** No analytics, no telemetry, no error-reporting service, no ads SDK, no font/CDN calls at runtime.
2. No accounts, no identifiers, no local storage of anything personal.
3. The app must fully function in airplane mode.

## Performance principles

1. 60 FPS on mid-spec tablets (2020+ iPad, mid-range Android) during play mode.
2. First meaningful interactive scene visible in <5s cold start.
3. No GC hitches: pools and reuse for particles/audio nodes; no per-frame allocations in the render loop.
4. Battery-aware: cap pixel ratio, pause rendering when the tab is hidden.

