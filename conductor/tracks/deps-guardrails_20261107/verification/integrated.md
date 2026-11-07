# Integrated Verification — Dependency Guardrails

**Track:** `deps-guardrails_20261107`
**Branch:** `chore/deps-guardrails_20261107`
**Base:** `main` @ `b99999abcaf8bad1200c194c524a7835c5681f63`
**Phase checkpoints:** `0915650` (policy + guard), `691f4a7` (audit gate + remediation), `9ad7f35` (docs)

## Scope

Two promises, both enforced by CI rather than by memory:

1. Dependency updates arrive as a weekly, reviewable batch with coupled packages
   kept together, and a guard test that fails when a new dependency matches no
   group.
2. `Gate · audit` refuses a pull request that introduces a high or critical
   advisory anywhere in the tree — and the tree is actually clean, because the
   gate was landed only after the 15 existing high advisories were fixed.

## Commands

| Layer | Command | Exit | Result |
|---|---|---|---|
| Static | `pnpm exec biome check .` | 0 | 174 files, no findings |
| Types | `pnpm exec tsc --noEmit` | 0 | clean |
| Unit | `pnpm test` | 0 | 47 files / 862 tests |
| Audit | `pnpm audit --audit-level=high` | 0 | 0 high, 0 critical (6 low/moderate remain, below threshold) |
| Build | `pnpm build` | 0 | `generateSW`, 178 precache entries, 10 639.92 KiB |
| E2E (full) | `pnpm exec playwright test` | 0 | **193 passed** (tablet · phone · prod), 15.9 min, no retries |
| Config | `npx --yes --package renovate@latest renovate-config-validator renovate.json` | 0 | "Config validated successfully against 1 file(s)" |

The full e2e suite matters here even though no `src/` file changed: the
`brace-expansion` major override sits inside `workbox-build`, which generates
the service worker the offline specs depend on.

## Acceptance criteria

| AC | Criterion | Witness |
|---|---|---|
| AC-1 | `renovate.json` declares the preset, dashboard, weekly schedule, 3-day soak, no automerge, majors separate | `src/core/renovate-config.test.ts` shape tests |
| AC-2 | Every direct dependency matches exactly one group; coupled pairs share one | coverage + pair tests, proven to bite with `left-pad` |
| AC-3 | The validator passes | exit 0, command above |
| AC-4 | The gate fails a tree carrying a high advisory | forced `undici@8.10.0` → 7 high, exit 1 (phase-2 evidence) |
| AC-5 | No advisory is silenced | no `ignoreCves` entry exists; audit exits 0 on its own |
| AC-6 | The policy is documented | `tech-stack.md` row + `CONTRIBUTING.md` section + roadmap row |
| AC-7 | The job is independent and cheap | `Gate · audit`, no `needs:`, 5-minute ceiling |

## Deviations carried from the phases

- The baseline was red (15 high). The gate was landed after remediation, not
  with a baseline ignore: `vite` bumped inside its range, and `source-map-js`,
  `undici`, `fast-uri` and `brace-expansion` pinned through `pnpm-workspace.yaml`
  overrides, each commented with its GHSA.
- pnpm 11 ignores `pnpm.overrides` in `package.json`; settings live in
  `pnpm-workspace.yaml`.
- Six low/moderate advisories remain (`@vitest/mocker`, `serialize-javascript`,
  `deepmerge`, `glob`, `minimatch`), below the agreed threshold.
- The Renovate GitHub app must be installed on the repository by hand; that is
  recorded in the roadmap row rather than pretended to be code.

## Residual risk

- The audit job needs the npm registry; an outage fails it by design.
- `minimumReleaseAge` and the schedule are declarative. Nothing tests Renovate's
  behaviour itself — the validator only proves the config parses, and the guard
  test only proves coverage of today's dependency list.
- Overrides are load-bearing: deleting `pnpm-workspace.yaml` silently restores
  the advisories. `Gate · audit` catches that, which is exactly why the gate
  exists.

## Verdict

Integrated and ready for review.
