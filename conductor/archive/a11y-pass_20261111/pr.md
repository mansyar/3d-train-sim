## Summary

A focused accessibility pass with no kid-facing changes. A locally installed axe
devDependency now scans four tablet states (idle, toy drawer open, parent tray
open, riding) with `color-contrast` enabled; visible keyboard focus uses a
`:focus-visible` ring, and pinch zoom is enabled only while the parent tray is
open, reverting to the kid-safe `user-scalable=no` when the tray closes or the
page reloads. Four axe-reported ARIA/contrast defects were fixed minimally, and
computed WCAG ratios plus the settled zoom decision are documented. Nothing is
transmitted off-device and the production world/export format is unchanged.

## Track

| Phase | Checkpoint | Result |
| --- | --- | --- |
| Toolchain, focus and zoom policy | `9d241f7` | verified |
| Axe sweep and bounded fixes | `42cadac` | verified |
| Roadmap sync and full gate | `ecee2b2` | verified |
| Review fixes (F1) | `37e65ec` | verified — re-review PASS |

- Type: feature (high priority)
- Branch: `feat/a11y-pass_20261111`
- Base: `main` @ `0e985dbb1b7ce44b3523630e8c93857fecf0d2f8`

## Requirements

- [x] FR-1 — `@axe-core/playwright` installed dev-only, lockfile updated, stack documented
- [x] FR-2 — visible `:focus-visible` keyboard focus with quiet pointer focus
- [x] FR-3 — kid-mode zoom off; zoom on only while the parent tray is visible, restored on disarm and reload
- [x] FR-4 — four tablet axe scans with one justified disabled rule
- [x] FR-5 — every axe-reported ARIA/label fix logged with file and reason
- [x] FR-6 — `color-contrast` clean and token ratios documented
- [x] FR-7 — guidelines and roadmap row updated
- [x] NFR-1 — kid UI unchanged, target sizes unchanged, no new gestures
- [x] NFR-2 — no runtime network or analytics; axe is e2e-only
- [x] NFR-3 — `pnpm check` and the 80% coverage gate green
- [x] NFR-4 — stack change recorded before implementation
- [x] AC-1..AC-8 — evidenced in phase reports and `verification/integrated.md`

## Verification

| Check | Result |
| --- | --- |
| `pnpm check` | exit 0 — Biome 192 files clean, tsc clean, Vitest 56 files / 988 tests |
| `pnpm test:coverage` | exit 0 — 97.11% stmts / 91.16% branch / 97.79% funcs / 98.97% lines |
| `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` | exit 0 — 1 passed, four axe-clean states + focus/zoom/disarm assertions |
| `pnpm exec playwright test --project=tablet --project=phone` | exit 0 — full matrix green |
| `pnpm build` | exit 0 — 114 modules, PWA precache 178 entries |
| CI | see checks on this pull request |

## Media

No GIF generated: this is a toolchain/focus/policy change with no new scene or
toy content. The axe spec dynamically asserts the visible focus ring, the
tray-only zoom policy and its restoration, so those behaviors are covered by
executable evidence rather than a screen capture.

## Review

`conductor-reviewer`: **PASS WITH FINDINGS** (one Medium AC-3 test-gap, no
Critical/High). Phase R1 added the disarm-restoration assertion; independent
re-review returned PASS with no new findings. See `review.md` and
`verification/phase-r1.md`.

## Deviations

- `renovate.json` grouped the new devDependency with the existing "test tooling"
  group — required by `src/core/renovate-config.test.ts`.
- The axe `meta-viewport` rule id is disabled instead of the brief's literal
  `viewport` (unknown rule in axe-core 4.14); still exactly one disabled rule,
  with the zoom policy asserted directly in the spec.
- A pre-existing hidden `.insights-unavailable` contrast pair (4.28:1) was left
  unchanged because axe did not report it; documented in `contrast.md`.
- `conductor-phase` cannot edit `conductor/**` outside `verification/**`;
  `general` executors ran the phases. Task commits were retained (no squash)
  because the active goal prohibits `reset`.

## Follow-ups

The hidden `.insights-unavailable` fallback can be revisited in a future design
pass. Human clarity-audit sessions and their measurements remain outside this
track.

## Rollback

Revert the merged commit to remove the axe devDependency, focus ring, viewport
helper and documentation. No data migration and no production network behavior
is involved.
