# Track: Sun & Moon — Child-Controlled Time of Day

- **ID:** `sun-moon_20260930`
- **Type:** Feature
- **Status:** new
- **Branch:** `track/sun-moon_20260930`

## Documents

- [Specification](spec.md)
- [Implementation Plan](plan.md)
- [Metadata](metadata.json)

## Summary

One icon-only sun/moon slot in the toybox rail: each tap moves the meadow's
sky to the next phase of the existing 150 s day cycle (dawn → morning → noon
→ dusk → night → dawn…), with the automatic drift continuing from the new
position. The icon always shows the phase a tap will bring, the chosen time
of day persists in `preferences` (additive save, no version bump), and all
night-aware behavior (window glows, portal glow, headlight, fireflies,
music box) keeps working through the existing repaint pipeline. TDD'd core
clock stepping and save round-trip; weather stays independent; no parent
gate — the control is instantly reversible and touches nothing the kid built.
