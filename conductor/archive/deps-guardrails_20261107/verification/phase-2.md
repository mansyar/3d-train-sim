# Phase 2 — The audit gate — Verification

## Goal

A fourth CI gate refuses high and critical advisories. Because the tree was
already red when the gate was proposed (15 high, 0 critical), the phase begins
by clearing that backlog: an audit gate that ships with a blanket ignore, or
with a baseline nobody reads, proves nothing.

## Commands

| Check | Command | Exit | Result |
|---|---|---|---|
| Audit (before) | `pnpm audit --audit-level=high` | 1 | 45 findings: 8 low, 22 moderate, **15 high**, 0 critical |
| Audit (after) | `pnpm audit --audit-level=high` | 0 | 6 findings: 2 low, 4 moderate, **0 high**, 0 critical |
| Static + unit | `pnpm check` | 0 | Biome clean, `tsc` clean, 47 files / 862 tests |
| Build | `pnpm build` | 0 | `generateSW`, 178 precache entries, 10 639.92 KiB |
| E2E (full) | `pnpm exec playwright test` | 0 | **193 passed** (tablet · phone · prod) in 15.9 min, no retries |

## The remediation, in order

| Step | Change | Findings after |
|---|---|---|
| start | — | 14 high (vite already in range) |
| 1 | `pnpm update vite` → 8.3.6 (inside `^8.2.2`) | 14 high |
| 2 | override `source-map-js >=1.2.2`, `undici >=8.12.4` | 6 high |
| 3 | override `fast-uri >=3.1.7` | 2 high |
| 4 | override `brace-expansion >=5.0.11` | 0 high |

Findings closed: `vite` (GHSA-587h-7wmj-h5pm, patched 8.2.4), `source-map-js`,
`undici` (seven advisories, patched 8.12.2), `fast-uri` (two advisories), and
`brace-expansion` (two advisories). No production dependency changed: all five
reach the tree through build or test tooling.

### Two things the first attempt got wrong

- **`pnpm.overrides` in `package.json` is dead in pnpm 11.** `pnpm install`
  warns "The `pnpm` field in package.json is no longer read" and ignores it, so
  the overrides live in `pnpm-workspace.yaml`, which pnpm 11 treats as its
  settings file even for a single-package repo.
- **The advisory banner's floor is per-major.** `brace-expansion` advertised
  `>=2.1.6`; taking that literally resolved to `5.0.9`, which the same advisory
  still flags (`>=5.0.10`, then `>=5.0.11`). The override now names `5.0.11`,
  the highest floor of the two advisories.

A `brace-expansion` major inside `workbox-build`'s `jake`/`ejs` injection path
was the one change that could plausibly break the shipped artifact, so the full
suite and a real build back it: 178 precache entries and 193 green specs,
including both offline specs that re-read the generated service worker.

## The gate

`.github/workflows/ci.yml` gains `Gate · audit`: `ubuntu-latest`,
`timeout-minutes: 5`, checkout + pnpm + Node 24 (pnpm cache) +
`pnpm install --frozen-lockfile` + `pnpm audit --audit-level=high`. It sits
beside the other three gates, so a red audit blocks the PR without waiting for
the e2e suite.

## Red/green demonstration (AC-4)

1. Downgrade through the override: `undici: "8.10.0"` → `pnpm install` →
   `pnpm audit --audit-level=high` reports **25 findings, 7 high**, exit 1.
   That is exactly what `Gate · audit` would fail on.
2. Restore `undici: ">=8.12.4"` → `pnpm install` → **6 findings, 0 high**,
   exit 0.
3. `rg -n "8\.10\.0" pnpm-lock.yaml pnpm-workspace.yaml` → no matches; the
   lockfile hash is identical across two consecutive installs
   (`LOCK_STABLE=True`), so the demonstration left nothing behind.

A first attempt to demonstrate red by *deleting* the `undici` override did not
work: the lockfile already pinned 8.12.4 and pnpm will not re-resolve a
satisfied dependency without an explicit range change. Recording it because it
is the reason the demonstration forces a downgrade instead.

## Acceptance criteria touched

| AC | Evidence |
|---|---|
| AC-4 | Audit exits 0 on the real tree; the downgrade demonstration exits 1 with 7 high |
| AC-5 | A human re-runs `pnpm audit --audit-level=high` and reads `0 high` — no ignore, no baseline |
| AC-7 | The job is independent, 5-minute ceiling, no `needs:` |

## Deviations

- **Remediation moved into this phase.** The spec assumed a green baseline; it
  was red. Rather than ship the gate with five ignores (the option rejected in
  the interview), the phase clears what is fixable first. `pnpm-workspace.yaml`
  and the `vite` bump are therefore part of Phase 2's diff.
- **`pnpm.overrides` lives in `pnpm-workspace.yaml`,** not in `package.json` as
  the plan's wording implied — pnpm 11 ignores the manifest field.
- **No dated ignore shipped.** Every advisory with a high or critical rating had
  a fixed version, so `auditConfig.ignoreCves` stays empty. The mechanism is
  documented for the day it is needed.
- **Moderate and low advisories remain** (4 moderate, 2 low: `@vitest/mocker`,
  `serialize-javascript`, `deepmerge`, `glob`, `minimatch`). Below the agreed
  threshold by design; listed so the next reviewer can decide whether to lower
  it deliberately.

## Evidence

- `.conductor/evidence/audit.json` — the pre-remediation audit (45 findings)
- `.conductor/evidence/audit2.json`, `audit3.json` — intermediate states
- `.conductor/evidence/audit-final.json` — the shipped state (0 high)

## Notes

- `pnpm audit` needs the npm registry. An outage fails the gate rather than
  passing it, which is the behaviour the spec asked for.
- The remaining moderate advisories all sit in test tooling and would need a
  `vitest` major to clear; that is a track-sized judgement, not a gate tweak.
