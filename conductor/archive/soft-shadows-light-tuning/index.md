# Track: Soft Shadows & Light Tuning

- **Spec:** [spec.md](spec.md) — what & why
- **Plan:** [plan.md](plan.md) — phased execution
- **Metadata:** [metadata.json](metadata.json) — id, status, branch

## Summary

Add real shadow-mapped lighting and a full light-tuning pass so the meadow
reads as a sunlit toy table — soft shadows grounding every toy, warm light,
no blown-out highlights. Visual polish only: no new toys, no features, no
core logic changes. All work in `src/scene/`.
