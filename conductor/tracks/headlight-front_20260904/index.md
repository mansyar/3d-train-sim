# Track: Headlight Front

- **ID:** `headlight-front_20260904`
- **Type:** Bug · **Status:** in-progress · **Branch:** `track/headlight-front_20260904`

## Artifacts

- **Specification:** [spec.md](spec.md) — what and why (source of truth).
- **Implementation Plan:** [plan.md](plan.md) — phased execution roadmap.
- **Metadata:** [metadata.json](metadata.json) — id, type, status, timestamps.

## Summary

The night headlight rides at the back of the engine: `headlight.ts` parks the lamp/beam on local `-Z` while `ride-motion.ts` (`MODEL_YAW_OFFSET = PI`) and the Kenney GLB vertices prove the authored nose is `+Z`. Fix flips the lamp/spot/aim to `+Z` in the shared `attachHeadlight` (all three locos) with smoke + manual night verification.
