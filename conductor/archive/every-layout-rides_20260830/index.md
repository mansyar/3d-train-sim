# Track: Every Layout Rides

- **Spec:** [spec.md](spec.md) — what & why
- **Plan:** [plan.md](plan.md) — phased execution
- **Metadata:** [metadata.json](metadata.json) — id, status, branch

## Summary

Every connected track component comes alive: one autonomous train per
component (capped at 4 concurrent), so a second loop a toddler builds is no
longer dead. Plus a 🎥 camera-cycle button (visible only while ≥2 rides run)
that glides the chase camera between riding trains and the overview, and a
whistle that answers from the train being filmed. Mid-ride edits stop only
the affected train; engine audio is one shared chug loop. Save format
unchanged — trains are ephemeral, rebuilt from the graph on ▶.

Phases: 1) per-component pathing + ride selection (core, TDD),
2) multi-train ride state + scene/audio wiring, 3) camera cycling,
whistle targeting, and e2e smoke coverage.
