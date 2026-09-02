# Track: Hills & Ramps (Elevation)

- **Spec:** [spec.md](spec.md) — what & why
- **Plan:** [plan.md](plan.md) — phased execution
- **Metadata:** [metadata.json](metadata.json) — id, status, branch

## Summary

The meadow gains real elevation: a three-piece hill run — `slope-up`
climbs, `hill` cruises along the crest, `slope-down` descends (Kenney kit
assets, ≈1.1 units tall, measured from the GLBs). Kids compose
rise/cruise/descent chains of any length; the train rides up over the top
and back down with the chase camera following. Placement stays rule-free
(hills go anywhere a straight goes); height disagreements at joints ease
gently instead of popping (pure `src/core/elevation.ts` profiles +
auto-blend, TDD'd). Winter dresses the hills in snow crowns via a
deterministic Blender shell recipe (tunnel snow-cap precedent). Purely
additive to the save schema — old worlds load untouched.
