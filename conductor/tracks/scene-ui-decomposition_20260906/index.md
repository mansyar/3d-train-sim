# Track — Scene/UI Decomposition (`scene-ui-decomposition_20260906`)

- Type: Chore (Refactor)
- Status: new
- Branch: `track/scene-ui-decomposition_20260906`

Split the two monoliths — `src/scene/init-scene.ts` (1,057 lines) and
`src/ui/app.ts` (1,238 lines) — into focused, cohesive modules with zero
behavior change. Scene split first (via an explicitly-passed `SceneContext`),
then the UI split into flat `src/ui/` modules; light cleanup only, bounded by
a conservative dead-code rule.

## Documents
- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
