# Track: Release v0.9.0

- **Spec:** [spec.md](spec.md) — what & why
- **Plan:** [plan.md](plan.md) — phased execution
- **Metadata:** [metadata.json](metadata.json) — id, status, branch

## Summary

Cut the ninth production release of Tiny Tracks, shipping everything
since `v0.8.0` — the six-locomotive fleet, the Hilltop Junction starter,
river life (barge + frog), and the Scenery Delight toys (windmill,
carousel, hot-air balloon) — through the established tag → gates →
GHCR → Coolify pipeline. Changelog promotion (including a missing
delight-toys entry and a duplicated-sentence fix) + version bump, local
pre-tag verification (gates + e2e + container smoke), then tag & ship.
