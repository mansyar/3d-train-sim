# Project Workflow — Tiny Tracks

## Guiding Principles

1. **The plan is the source of truth.** Every phase, task, result, checkpoint,
   and evidence link lives in `plan.md`.
2. **The tech stack is deliberate.** A change to the stack is recorded in
   `tech-stack.md` before the implementation depends on it.
3. **Verification is agent-executed.** The phase subagent runs the configured
   checks and writes evidence. The user is not asked to manually verify routine
   work.
4. **Evidence over assertion.** A phase is complete only when the configured
   checks pass and the evidence file exists.
5. **No silent debt.** A finding is fixed, explicitly accepted with a reason, or
   tracked as an issue. It is never quietly ignored.
6. **Stay inside the phase contract.** `Touches` defines the expected blast
   radius. A required deviation is allowed, recorded, and reviewed.
7. **Non-interactive and CI-aware.** Prefer commands that terminate. The test
   suite is already single-run (`vitest run`), so no CI prefix is required.
8. **User experience first.** Every decision prioritizes the toddler experience
   (`product-guidelines.md`).
9. **Privacy first.** Nothing leaves the device. No analytics, no network calls
   at runtime.

## Workflow Config

```yaml
project:
  type: "static-web-pwa"
  languages: ["TypeScript"]
commands:
  setup: "pnpm install"
  dev: "pnpm dev"
  test: "pnpm test"
  coverage: "pnpm test:coverage"
  lint: "pnpm exec biome check ."
  format: "pnpm exec biome check . --write"
  typecheck: "pnpm exec tsc --noEmit"
  build: "pnpm build"
  verify_phase: "pnpm check"
coverage:
  gate: "80% statements/branches/functions/lines on src/core + src/state"
  scope: "project"
verification:
  layers: ["static", "unit", "e2e", "smoke", "manual-device"]
  retry: 2
  manual_exceptions:
    - "iPad Safari and Android Chrome touch feel, audio unlock, and frame rate"
git:
  base_branch: "main"
  fetch: true
  commit_style: "conventional"
  task_commits: true
  phase_squash: true
review:
  strict: true
  issues:
    enabled: true
    auto_create: true
    min_severity: "medium"
    group_low: true
    labels: ["tech-debt", "conductor"]
pr:
  enabled: true
  tool: "gh"
  base: "main"
  media: "always"
  watch_ci: true
  watch_timeout_minutes: 30
  merge_method: "squash"
```

## Definitions

- **Logic-bearing code:** code whose correctness can be captured in assertions —
  pure functions, algorithms, state machines, serialization, path resolution.
  In this project: everything in `src/core/` and `src/state/`.
- **Non-logic code:** renderers, scene graph setup, DOM wiring, audio triggers,
  model loading. Verified by Playwright smoke tests and explicit manual
  verification steps, not unit tests.

## Development Commands

### Setup

```bash
pnpm install
```

### Daily Development

```bash
pnpm dev                          # Vite dev server
pnpm test                         # Vitest, single run
pnpm test:coverage                # Vitest + 80% gate on src/core + src/state
pnpm exec biome check .           # lint + format check
pnpm exec biome check . --write   # lint + format fix
pnpm exec tsc --noEmit            # typecheck gate
pnpm build                        # production build
pnpm exec playwright test         # e2e (tablet, phone, prod profiles)
```

### Before Committing

```bash
pnpm check
```

> **Windows note:** bash-style `VAR=value cmd` prefixes fail under pnpm's Windows
> shell. The `check` script therefore omits `CI=true`; Vitest runs with
> `vitest run`, which is single-run regardless of environment.

## Phase & Task Workflow

Implementation is executed one phase at a time by a phase subagent. The primary
agent owns `plan.md`, `metadata.json`, the registry, and review artifacts.

### Task Lifecycle

1. Read the phase contract in `plan.md`, the relevant requirements in `spec.md`,
   and the applicable style guides.
2. Work through the phase's tasks in order.
3. **Logic-bearing task:** write the failing test first (Red), confirm it fails
   for the expected reason, then implement to Green.
   **Non-logic task:** record the observable acceptance criteria in the task's
   notes, then implement to them.
4. Implement the smallest change that satisfies the task.
5. Run the targeted checks for the task.
6. Commit the task with a conventional commit message.
7. Report the task's status and commit SHA to the primary agent.

The subagent does **not** edit `plan.md`. The primary marks tasks complete after
it accepts the phase.

### Deviations

- If the phase goal requires a file outside `Touches`, make the smallest
  necessary change and record it in the report under `deviations`.
- If the work requires a product or design decision, stop and report `blocked`.
- If implementation contradicts `tech-stack.md`, stop, update the stack doc with
  a dated note, then resume.
- Never add a runtime dependency, introduce a network call, or migrate unrelated
  code without an explicit decision.

### Phase Completion

1. Run the phase's `Verification` command exactly as written in `plan.md`.
2. Run `verify_phase` when it is configured and different from the phase command.
3. Write the evidence file using the configured evidence path.
4. Return the structured report to the primary agent.
5. Do not merge, rebase, reset, push, open a PR, or edit Conductor state files.

## Verification Strategy

### Layers

- **Static:** Biome (lint + format) and `tsc --noEmit`.
- **Unit:** Vitest for `src/core/` and `src/state/` — algorithms, state, save
  migration, pathing, switches, pacing.
- **E2E:** Playwright across `tablet` (iPad Mini), `phone` (iPhone 13), and
  `prod` (built output served by `vite preview`).
- **Smoke:** every placed piece class has a spec that boots the app, places it,
  starts a ride, and requires a clean console.
- **Manual device:** iPad Safari and Android Chrome — touch feel, audio unlock,
  and frame rate. Human-only; never claimed as agent-verified.

### Commands

| Layer | Command | Required |
| --- | --- | --- |
| static | `pnpm exec biome check .` | yes |
| static | `pnpm exec tsc --noEmit` | yes |
| unit | `pnpm test` | yes |
| coverage | `pnpm test:coverage` | yes when logic-bearing code changed |
| build | `pnpm build` | yes before e2e `prod` and before a release |
| e2e | `pnpm exec playwright test` | yes for user-facing changes |
| manual-device | iPad Safari / Android Chrome check | human-only |

### Services and Fixtures

- **Services:** Vite dev server on `5199`; `vite preview` on `5198` (prod e2e).
  Playwright starts both from `playwright.config.ts`.
- **Containers:** none for development. The release pipeline builds a Docker
  image (`nginx:alpine` serving `dist/`).
- **Database:** none. Persistence is IndexedDB (`tiny-tracks` → `worlds`), faked
  in unit tests.
- **Fixtures/seed data:** `cozyOval()` and the starter gallery in
  `src/core/starters.ts`; dev builds expose `window.__tinyTracksWorld` and
  `window.__tinyTracksScene` for deterministic placement in e2e.
- **Environment variables:** none at runtime. `__APP_VERSION__` is injected at
  build time from `package.json`.
- **Start/stop commands:** Playwright manages both web servers. Do not reuse a
  running dev server in CI.

### Pass Criteria

- Every required command exits `0`.
- The coverage gate is met: 80% statements, branches, functions, and lines on
  `src/core` + `src/state`.
- Every acceptance criterion has a test or a documented evidence artifact.
- No new Critical or High review findings remain.
- No new runtime network request, identifier, or third-party script appears.

### Evidence

Write a report to:

```text
conductor/tracks/<track-id>/verification/phase-<n>.md
```

Include: title; track, phase, date, branch, base and head commits; result
(`verified`, `failed`, `blocked`, or `partial`); a commands table (layer,
command, exit, summary); an acceptance-criteria table (ID, criterion, evidence,
status); evidence paths; deviations; and notes.

Put screenshots, traces, and large reports under `.conductor/evidence/`; that
directory is gitignored. The Markdown report itself is committed with the track.

### Fallback Ladder

1. Run the full configured layer.
2. If a browser or service is missing, install it
   (`pnpm exec playwright install --with-deps`) and retry.
3. If it still cannot run, run the narrowest reliable subset and mark the phase
   `partial` with the reason.
4. Stop and ask the user (via the question tool) only for physical-device
   verification or an external approval.

### Retry Policy

- A failed check may be fixed and re-run at most **2** times.
- If it still fails, report `failed` with the command and output.
- Never mark a phase `verified` when a required check did not run.

### Human-Only Exceptions

- iPad Safari touch feel, audio unlock, and sustained frame rate.
- Android Chrome touch feel and sustained frame rate.
- Final production smoke on a family device after a release.

## Quality Gates

Before a phase is accepted:

- [ ] Required tests pass
- [ ] Coverage gate met on `src/core` + `src/state`
- [ ] `biome check .` passes
- [ ] `tsc --noEmit` passes
- [ ] `pnpm build` passes when the build output changed
- [ ] e2e suite passes for user-facing changes
- [ ] Code follows `conductor/code_styleguides/`
- [ ] `product-guidelines.md` respected (no fail states, instant feedback, privacy)
- [ ] No secrets, identifiers, analytics, or runtime network calls introduced
- [ ] Evidence is written and linked in `plan.md`

## Commit Guidelines

### Message Format

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation only
- `style`: formatting
- `refactor`: behavior-preserving change
- `test`: tests only
- `chore`: maintenance

### Examples

```bash
git commit -m "feat(core): Add grid snap resolution for track pieces"
git commit -m "fix(scene): Correct camera follow lag on turn transitions"
git commit -m "test(core): Add pathing loop coverage for broken tracks"
git commit -m "chore(deps): Bump three to 0.185.1"
```

Task-level commits are made by the phase subagent. The primary squashes them
into one phase commit on acceptance, unless a foreign commit landed in the range.
The plan update is a separate state commit.

## Branching & PRs

- Trunk-based: short-lived `track/<track-id>` branches off `main`.
- The primary fetches `main` before branching so the track starts current.
- When the track is complete, push the branch and open a PR with `gh` against
  `main`.
- Visual/UI tracks include a media demo (GIF or short video) in the PR body —
  diffs cannot prove feel.
- Watch CI with a 30-minute cap. Merge with **squash** once CI is green.
- Merging to `main` never deploys. Only `v*` tags ship.

## Definition of Done

A track is complete when:

1. Every phase is `verified` with a checkpoint and evidence.
2. The integrated verification on the track branch passes.
3. Review is `PASS`, or every finding is fixed, accepted with a reason, or
   tracked as an issue. No Critical or High finding remains unresolved without an
   explicit user override recorded in `review.md`.
4. Post-review documentation sync is complete (`product.md`, `tech-stack.md`,
   `CHANGELOG.md` when behaviour or scope changed).
5. The registry and `metadata.json` show the track as complete.
6. The branch is pushed and a PR is open (or `pr_state: "unavailable"` records
   that PR creation could not run).

## Emergency Procedures

### Critical Bug on Family Devices

1. Create a hotfix branch from `main`.
2. Write a failing regression test (logic-bearing) or reproduce step-by-step.
3. Implement the minimal fix.
4. Run the full verification strategy.
5. Open a PR immediately; do not batch unrelated work.

### Kid World Data Loss (IndexedDB)

1. Stop all write operations immediately.
2. Attempt recovery: export/inspect IndexedDB on the affected device.
3. Rebuild the world with the kid — rebuilding together is gameplay.
4. Fix the persistence bug; add a regression test.
5. Document the incident in the track.

### Privacy Breach (network call detected)

1. Identify and remove the offending dependency/code immediately.
2. Audit all runtime network usage.
3. Add a Playwright check asserting zero external requests.
4. Document the incident in the track.

## Deployment

Single environment: production. Family devices load the domain.

### Pre-Deployment Checklist

- [ ] Biome + typecheck + Vitest + coverage gates passing
- [ ] Playwright suite passing on ubuntu (release authority)
- [ ] Manual tablet check complete
- [ ] Version bumped in `package.json`
- [ ] `CHANGELOG.md` updated for parents, compare links refreshed
- [ ] Bundle size reasonable (<2 MB gzipped code, assets excluded)

### Deployment Steps

1. Merge the release track PR to `main`.
2. Push `main`, then push the `vX.Y.Z` tag — only the tag triggers
   `release.yml`.
3. Pipeline: gates → Docker build → push `ghcr.io/mansyar/tiny-tracks` →
   Coolify webhook.
4. Verify the deployment: load the domain cold on a family device.

### Post-Deployment

1. Watch the kids play — the only analytics this project has.
2. Note friction points as a new track.
3. Rollback by redeploying the previous image digest in Coolify.

## Continuous Improvement

- Review this workflow after each track.
- Update commands and verification layers when tooling changes.
- Record recurring review findings as process improvements.
- Keep the process as small as the project allows.
