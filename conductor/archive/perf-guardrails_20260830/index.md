# Track: Performance Guardrails

Adaptive quality tiers to defend the 60 FPS target on mid-spec tablets:
a per-frame FPS probe (pure `src/core` logic) feeds a quality controller
that gently trims the heaviest effects — render scale, shadow maps,
weather particles — when frame rate sags. Invisible to the toddler;
debug overlay only behind `?perf=debug`.

- **Spec:** [spec.md](spec.md)
- **Plan:** [plan.md](plan.md)
- **Metadata:** [metadata.json](metadata.json)
