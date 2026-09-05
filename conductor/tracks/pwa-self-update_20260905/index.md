# Track: PWA Self-Update Flow

- **ID:** `pwa-self-update_20260905`
- **Type:** Chore · **Status:** new · **Branch:** `track/pwa-self-update_20260905`

## Artifacts

- **Specification:** [spec.md](spec.md) — what and why (source of truth, confirmed).
- **Implementation Plan:** [plan.md](plan.md) — phased execution roadmap (all phases pending).
- **Metadata:** [metadata.json](metadata.json) — id, type, status, timestamps.

## Summary

Family devices stay on a stale service worker until someone reloads. This
chore makes the app probe for updates (visibility regain + hourly) and,
when the table is quiet (ride idle, boot-loop guard passed), reload exactly
once into the fresh deploy — world preserved by autosave, zero
toddler-facing UI. The parent gate also gains a subtle current-version
readout so grown-ups can verify a deploy landed.
