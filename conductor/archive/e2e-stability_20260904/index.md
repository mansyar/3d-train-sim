# Track: E2E Stability & CI Efficiency

- **ID:** `e2e-stability_20260904`
- **Type:** Chore · **Status:** new · **Branch:** `track/e2e-stability_20260904`

## Artifacts

- **Specification:** [spec.md](spec.md) — what and why (source of truth, confirmed).
- **Implementation Plan:** [plan.md](plan.md) — phased execution roadmap.
- **Metadata:** [metadata.json](metadata.json) — id, type, status, timestamps.

## Summary

The wagon-workshop tablet/phone e2e flake (blob: texture fetch blocked by
access-control checks on Windows headless Chromium, tripping the
zero-console-errors assertion while all functional assertions pass) has
survived three releases. This chore kills it with a targeted allowlist that
keeps the guardrail armed (proof via injected error), codifies the
environmental-flake lessons (mechanism, `--workers=2` rerun convention, ubuntu
e2e as release authority) in `e2e/README.md` cross-linked from tech-stack.md,
and makes CI upstream + efficient: e2e on PRs, parallel gate jobs, cached
Playwright browsers, and docs-only path filtering. Filed as the planned
follow-up from release-v0.7.0_20260904 (2026-09-04).
