# Track — Spare Train Park Spot Fix (`spare-train-park_20260913`)

- Type: Bug (scene boot)
- Status: complete
- Branch: `track/spare-train-park_20260913`

The pre-ride "opening train" currently rests at world origin — the middle of
the river — on every fresh boot (train, wagons, and the loading placeholder
crate visibly in water). This track parks it on the world's largest ride at
the dry spot nearest the meadow heart, moves the crate to the same spot, and
gates opener creation on boot hydration so the spot is chosen from the real
world. Ride logic, adoption order, and "spares rest where they stopped" stay
untouched.

## Documents
- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
