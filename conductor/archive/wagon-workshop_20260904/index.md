# Track: Wagon Workshop

- **ID:** `wagon-workshop_20260904`
- **Type:** Feature · **Status:** done · **Branch:** `track/wagon-workshop_20260904`

## Artifacts

- **Specification:** [spec.md](spec.md) — what and why (source of truth, confirmed).
- **Implementation Plan:** [plan.md](plan.md) — phased execution roadmap (all 4 phases complete).
- **Metadata:** [metadata.json](metadata.json) — id, type, status, timestamps.

## Summary

Every locomotive used to pull the same two bundled cargo wagons (lumber + box) with no
choice. Wagon Workshop shipped 4 curated per-train wagon pairs (Classic, Coal, Tank,
Container) behind an icon-only picker row in the train drawer — same autonomous ride,
same cargo gameplay, just THEIR train. Consists persist per train across reloads via an
additive save field. Shipped 2026-09-04 (review: no code findings; one environmental
e2e-noise note with a follow-up e2e-stability chore candidate).
