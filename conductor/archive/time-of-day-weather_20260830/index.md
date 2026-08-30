# Track: Time of Day & Weather

- **Spec:** [spec.md](spec.md) - what & why
- **Plan:** [plan.md](plan.md) - phased execution
- **Metadata:** [metadata.json](metadata.json) - id, status, branch

## Summary

A zero-UI ambience system: the meadow drifts through a ~2.5-minute day (sun/moon
arcing on a gradient sky dome, cozy deep-blue twilight with warm window and
station glows, train headlight at night) while weather drifts between clear,
cloudy, rain, and snow — instanced particles, ground that whitens while snowing,
critters that shelter in rain and yield to fireflies at night, and soft
rain/wind ambience that respects mute. Day clock and weather machine are pure,
deterministic modules in `src/core/` (TDD); everything else is scene/audio wiring
verified by smoke tests and manual tablet checks. Ephemeral: no save-format or
parent-gate changes.

Phases: 1) day clock + weather machine (core, TDD), 2) sky/lighting/particle
rendering, 3) critters/audio/headlight, 4) smoke coverage, gates & tablet
verification.
