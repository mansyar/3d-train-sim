# Track: Track Switches & Branches

- **Spec:** [spec.md](spec.md) — what & why
- **Plan:** [plan.md](plan.md) — phased execution
- **Metadata:** [metadata.json](metadata.json) — id, status, branch

## Summary

The meadow's tracks can split: a new Blender-authored **switch** piece (a
Y-junction — straight-through road plus a curved diverging branch) lets
kids build two loops sharing one junction, spur lines into dead ends, and
chained switches. Each train alternates branches every pass through the
stem, and the switch's point blades visibly flip to the chosen road.
Pure-core semantics and the Y-topology solver generalization are TDD'd
(`src/core/switches.ts`, extended `pathing.ts`); the ride stays smooth and
deterministic, saves stay additive, and everything the ride world already
does (loops, shuttling, one train per component) composes unchanged.
