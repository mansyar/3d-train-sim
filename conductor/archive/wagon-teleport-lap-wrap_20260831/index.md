# Track: Wagon Teleport at the Lap Wrap (Bridge After Curve)

- **Spec:** [spec.md](spec.md) — what & why
- **Plan:** [plan.md](plan.md) — phased execution
- **Metadata:** [metadata.json](metadata.json) — id, status, branch

## Summary

When a train crosses from a curve onto a bridge — the closed loop's lap-wrap
point — a trailing wagon visibly teleports off the rails over the surrounding
terrain, then snaps back a few seconds later. Root cause (diagnosed
2026-08-31): two compounding defects in `src/scene/ride-motion.ts` — follower
path distances don't wrap around closed loops, so they clamp to the path
start and straight-extend off the built track; and the end-overhang tangent
is unnormalized for line segments (magnitude = segment length), magnifying
displacement 3.75× beyond the intended coupler distance. Fix confined to
`src/scene/ride-motion.ts` + tests (TDD); no core/UI/save changes.
