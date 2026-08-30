# Changelog — Tiny Tracks

All notable changes to Tiny Tracks, written for parents and caretakers —
what's new on the train table, in plain words.

The format follows [Keep a Changelog](https://keepachangelog.com/); versions
are `vX.Y.Z` git tags that trigger the release pipeline (see
`conductor/tech-stack.md`).

## [Unreleased]

## [0.3.0] — 2026-08-30

### Added

- **Multiple trains can ride at once.** Lay out several loops, press play,
  and every train runs its own route. The camera button cycles between
  riding trains so no journey is missed.
- **Day, night, and weather.** The sky changes over the course of a ride —
  sunny mornings, golden sunsets, starry nights — with matching ambience.
  At night, the train's headlight switches on with a soft forward beam.
- **Every train has its own whistle**, pitched to its personality.

### Fixed

- Trains, wagons, and the ride camera stay in step when several trains
  share the table.
- Smoother playback under the changing sky (no hitches in the frame loop).

## [0.2.0] — 2026-08-30

### Added

- **Toybox townsfolk** — little figures to place around the table.
- **Chugging cargo** — wagons that chug along behind the train.
- **Steam puffs** at the chimney on every whistle.
- **Softer shadows and tuned lighting** for a gentler look.
- **A living meadow** — the scene breathes: idle camera drift, quiet
  chirps, and pausing when the tab is hidden.
- **Better fit on phones and tablets** — narrower screens, safe areas,
  tap-to-rotate and delete for placed toys.

### Fixed

- The level crossing lets the train back through and re-enter cleanly.
- Release checks now build the app before running end-to-end tests.

## [0.1.0] — 2026-08-29

### Added

- First release! A 3D toy train table: lay track pieces, place scenery,
  press the button, and watch the train go — with whistle sounds, parent
  reset and mute controls, a working level crossing, and worlds that
  survive a page reload.
- The release pipeline itself: version tags build a Docker image, publish
  it, and ship it to production automatically.

[Unreleased]: https://github.com/mansyar/tiny-tracks/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/mansyar/tiny-tracks/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/mansyar/tiny-tracks/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/mansyar/tiny-tracks/releases/tag/v0.1.0
