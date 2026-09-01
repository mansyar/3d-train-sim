# Track: Station Cargo Pickups

- **Spec:** [spec.md](spec.md) — what & why
- **Plan:** [plan.md](plan.md) — phased execution
- **Metadata:** [metadata.json](metadata.json) — id, status, branch

## Summary

The two cargo wagons every locomotive pulls become working freight cars. At
each station stop, empty wagons load a chunky toy crate; at the next stop
they deliver — confetti burst, and the destination station's cargo platform
permanently gains one delivered crate. Delivered crates persist in the save
(capped at 8 per station), so the meadow slowly fills with the child's
deliveries. The station model is expanded and polished via a deterministic
Blender recipe (`scripts/blender-station.py`, the tunnel pipeline) with 8
toggleable crate slots, staying a 1-cell scenery piece. Pure watching — no
interaction, no UI, no new sounds. Save gains a versioned per-station
delivery count (old saves migrate to zero).
