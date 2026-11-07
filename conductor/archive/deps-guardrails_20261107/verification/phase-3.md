# Phase 3 — Documentation — Verification

## Goal

The cadence, the soak, the gate and the ignore rule are written where the next
contributor looks, and the roadmap row says what actually shipped — including
the manual step the code cannot perform.

## Commands

| Check | Command | Exit | Result |
|---|---|---|---|
| Static + unit | `pnpm check` | 0 | Biome clean, `tsc` clean, 47 files / 862 tests |
| Audit | `pnpm audit --audit-level=high` | 0 | 0 high, 0 critical |

`biome.json` ignores Markdown, so `pnpm exec biome check <file>.md` reports those
paths as ignored (exit 1 on "no files"). The gate that matters is `pnpm check`.

## Changes

- **`conductor/tech-stack.md`**
  - New table row *Dependency maintenance*: `renovate.json` extends
    `config:recommended` with the dashboard, weekly Monday-before-06:00
    Australia/Sydney, 3-day `minimumReleaseAge`, no automerge, majors separate;
    the coupled pairs and the four groups; the guard test; `Gate · audit`; the
    dated-ignore rule; and the `overrides` note (pnpm 11 ignores
    `pnpm.overrides` in `package.json`), naming the four current overrides.
  - CI section: "three parallel gate jobs" → four, with the `audit` row and two
    bullets — the job is independent and cheap, and an outage fails rather than
    passes.
- **`CONTRIBUTING.md`** — new *Dependency PRs* subsection: what a Renovate PR
  is, merge only with all four gates green, never automerge a major, the two
  coupled pairs and the guard test, and the dated-ignore escape hatch.
- **`conductor/product.md`** — the `deps-guardrails_20261107` roadmap row is
  marked shipped with what the gate cost (15 high → 0 through a `vite` bump and
  four overrides, no ignore needed) and the one manual step: installing the
  Renovate GitHub app on the repository.

## Acceptance criteria touched

| AC | Evidence |
|---|---|
| AC-6 | `tech-stack.md` and `CONTRIBUTING.md` state the cadence, soak, gate and ignore rule; the roadmap row records the manual app-install step |

## Deviations

- The tech-stack row documents the *remediation* (four overrides) alongside the
  policy, because the overrides are now part of how the project holds the gate
  green and will confuse the next reader if unmentioned.
- No `Renovate` app installation was performed — it is a repository setting
  outside the codebase, recorded in the roadmap row as the remaining manual step.

## Notes

- The four remaining moderate and two low advisories are not documented in
  `tech-stack.md`: they sit below the agreed threshold and the evidence file for
  Phase 2 lists them for whoever lowers it.
