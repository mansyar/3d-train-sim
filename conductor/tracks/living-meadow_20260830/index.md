# Track: Living Meadow

- **Spec:** [spec.md](spec.md) — what & why
- **Plan:** [plan.md](plan.md) — phased execution
- **Metadata:** [metadata.json](metadata.json) — id, status, branch

## Summary

Make the meadow feel inhabited: a gentle idle attract mode (slow camera
drift + rare quiet critter chirps) when the toddler steps away, a visible
steam burst on the whistle button, and battery-aware pausing of the render
loop and chug audio when the tab is hidden. Polish only — no new toys, no
new UI, no core gameplay changes. All new logic in `src/core` (TDD); scene
and audio wiring in `src/scene` + `src/audio`.