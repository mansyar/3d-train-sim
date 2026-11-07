# Dependency Guardrails

Makes dependency maintenance a scheduled, reviewable habit and turns "this app
ships no vulnerable packages" into a CI gate instead of an intention.

## Summary

- **Weekly Renovate batch** — `renovate.json` extends `config:recommended`, keeps
  the dependency dashboard, runs Monday before 06:00 Australia/Sydney, waits
  three days after a release before proposing it, keeps majors in their own PRs,
  and never automerges (`automerge` and `platformAutomerge` are both explicitly
  `false`, because the platform toggle defaults to **on**).
- **Coupled pairs move together** — `three` + `@types/three`, `howler` +
  `@types/howler`, `vite-plugin-pwa` + `workbox-window` are grouped by
  `packageRules`, and a unit test fails if a new dependency matches no rule or a
  pair splits across groups.
- **`Gate · audit`** — a fourth CI job runs `pnpm audit --audit-level=high` on
  every push and PR, independently of the other three gates.
- **The baseline is green because the backlog was cleared** — the gate's first
  run found 45 advisories (14 high); a `vite` bump plus four scoped `overrides`
  in `pnpm-workspace.yaml` brought it to 6 findings, none high, with no ignore
  entries.
- **Overrides cannot silently break a consumer** — `src/core/dependency-overrides.test.ts`
  proves, against the installed tree, that `minimatch@5` and `@9` still get the
  callable `brace-expansion@2` while `minimatch@10` gets the 5.x namespace, that
  every `overrides` selector binds to a package the store holds, and that every
  minimatch major is one the test has been taught.

## Track

- Spec: `conductor/archive/deps-guardrails_20261107/spec.md`
- Plan: `conductor/archive/deps-guardrails_20261107/plan.md`
- Review: `conductor/archive/deps-guardrails_20261107/review.md`

## What happened

| Phase | Scope | Checkpoint |
|---|---|---|
| 1 | Renovate policy and its coverage guard | `0915650` |
| 2 | The audit gate, and clearing the backlog it exposed | `691f4a7` |
| 3 | Documentation (tech stack, roadmap, contributor notes) | `9ad7f35` |
| R1 | Round-1 review fixes (one High, four Medium, two Low) | `b3193d0` |
| R2 | Round-2 review fixes (three Medium, three Low) | `a5e4a43` |

## Requirements

- [x] FR-1 `config:recommended` plus the dependency dashboard
- [x] FR-2 weekly schedule, three-day soak, no automerge, majors separate
- [x] FR-3 coherent pairs and groups move together
- [x] FR-4 a guard fails when a dependency escapes the policy
- [x] FR-5 the guard also fails when a pair is split
- [x] FR-6 `pnpm audit --audit-level=high` runs in CI
- [x] FR-7 the audit is an independent, self-contained job
- [x] FR-8 an unfixable advisory is silenced only by a dated `ignoreCves` entry
- [x] FR-9 the policy and the gate are documented
- [x] NFR-1 no runtime dependency is added
- [x] NFR-2 the audit finishes in under a minute (measured 1.6 s)
- [x] NFR-3 the existing gates are unchanged
- [x] NFR-4 `renovate-config-validator` accepts the config
- [x] NFR-5 no new secret or token

## Verification

| Layer | Command | Result |
|---|---|---|
| Static | `pnpm exec biome check .` + `pnpm exec tsc --noEmit` | pass — 175 files, no findings |
| Unit | `pnpm test` | pass — 48 files, 867 tests |
| Coverage | `pnpm test:coverage` | pass — 97.35 / 91.06 / 98.10 / 99.44 |
| Audit | `pnpm audit --audit-level=high` | pass — 6 findings (2 low, 4 moderate), 0 high, 1.6 s |
| Build | `pnpm build` | pass — 178 precache entries |
| Renovate | `renovate-config-validator renovate.json` | pass |
| E2E | `pnpm exec playwright test` | see the risk note below; CI `Gate · e2e` is the authority |

## Media

Nothing visual ships — this is config, a CI job and tests. There is no honest
clip to show.

## Review

Two rounds, both `conductor-review`.

**Round 1 — BLOCK.** One High: the `brace-expansion` override was applied
tree-wide, so `minimatch@5` received a module it cannot call
(`TypeError: expand is not a function`, proven live; the suite stayed green
because minimatch short-circuits brace-free patterns). One Medium would have
broken the release image: the Dockerfile never copied `pnpm-workspace.yaml`, and
a frozen install without it fails with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`
(reproduced in a temp directory: exit 1, then 0 with the file). Also automerge
vacuity, coverage counting undeliverable rules, an unmeasured audit duration and
two Low record errors. All seven fixed.

**Round 2 — PASS WITH FINDINGS.** The fixes were accepted but two of the new
witnesses were hollow: the shape check skipped every minimatch major above 5
(and `minimatch@9` also calls the 2.x module), and the `platformAutomerge`
assertion compared a key the config omitted against `true` — true of every config
that omits it, while Renovate's default is `true`. Fixed with a per-major shape
table, an explicit `platformAutomerge: false`, and an extracted
`automergeOffenders()` so the test cannot assert its own copy of the predicate.

## Deviations and risks

- **Overrides are load-bearing.** `pnpm-workspace.yaml` holds four of them, and
  the Dockerfile must keep copying it. Both are documented in `tech-stack.md` and
  enforced by tests.
- **Local e2e is contention-sensitive.** Three full local runs each passed 192
  and failed one different, throughput-sensitive spec (the ambient-FPS check,
  ≥10 FPS locally vs ≥2 under CI); each passed on isolated repeats. One genuine
  race surfaced and was fixed: `clearMeadow()` reset the world before the boot
  snapshot hydrated, so the reset was silently undone. CI's `Gate · e2e` is the
  release authority, per `e2e/README.md`.
- **Installing the Renovate GitHub app is a manual step** — the track can mandate
  the policy but cannot enable the bot.
- **Six low/moderate advisories remain**, all inside `workbox-build`'s build-time
  tree and `@vitest/mocker`; nothing ships them to a child's browser.

## Follow-ups

- `runtime-guarantees_20261107` shipped the CSP and offline proof this track
  assumed; the remaining Phase 0 work is complete.
- If Renovate ever reports an advisory with no fix, add a dated `ignoreCves`
  entry in `pnpm-workspace.yaml` naming the advisory and the track that clears it
  — never a broad path or a dev-only exemption.

## Rollback

`renovate.json`, `pnpm-workspace.yaml` and the audit job are independent of the
app. Reverting the merge restores the previous dependency ranges; the app code
itself is untouched by this track, so no world or save format changes.
