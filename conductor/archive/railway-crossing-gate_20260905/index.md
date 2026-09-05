# Track: Railway Crossing Gate

- **ID:** `railway-crossing-gate_20260905`
- **Type:** Feature · **Status:** new · **Branch:**
  `track/railway-crossing-gate_20260905`

## Artifacts

- **Specification:** [spec.md](spec.md) - what and why (source of truth).
- **Implementation Plan:** [plan.md](plan.md) - phased execution roadmap.
- **Metadata:** [metadata.json](metadata.json) - id, type, status, timestamps.

## Summary

A chunky railway crossing joins the track toybox: a straight rail piece
with a road strip, crossbuck post, and two striped barrier gates that
swing down as any train nears — with a real (softened) crossing bell and
a blinking lantern (active any time of day; idle blink at night) and a
winter snow cap. New pure proximity state machine in `src/core/`, an
additive save type, a Blender-authored GLB recipe, and a dedicated e2e
spec. Out of scope: road networks, pausing trains, double-track
crossings, kid-controlled gates.
