# Phase 5 — CI shape — Verification

Track `e2e-cost_20261108`, branch `refactor/e2e-cost_20261108`.
Performed by: primary agent (workflow files only; no spec, no `src/`).

## Goal

The pull-request e2e job is two parallel shards, and a nightly workflow runs both device profiles with a
repeat pass over the two contention-sensitive specs. What a PR must pass does not change.

## Commands

| Command | Exit | Result |
|---|---|---|
| `python -c "yaml.safe_load(...)"` on both workflows | 0 | `ci.yml` e2e matrix `['1/2','2/2']`, timeout 45, run `pnpm exec playwright test --shard=${{ matrix.shard }}`; `nightly.yml` triggers `['schedule','workflow_dispatch']`, matrix `['tablet','phone']` |
| `pnpm exec playwright test --list --shard=1/2` | 0 | **31 tests in 13 files** |
| `pnpm exec playwright test --list --shard=2/2` | 0 | **26 tests in 11 files** |
| `pnpm exec playwright test --list` | 0 | 57 tests in 21 files — 31 + 26 exactly, no test lost or duplicated |
| `pnpm check` | 0 | Biome clean, `tsc` clean, 50 files / **883 tests** |

## What changed

`.github/workflows/ci.yml`

- The `e2e` job gained `strategy.matrix.shard: ['1/2', '2/2']` with `fail-fast: false`, so one shard's
  failure does not cancel the other's verdict.
- The job name is now `Gate · e2e shard ${{ matrix.shard }}` — two distinct check names in the PR, each
  attributable.
- The ceiling dropped 60 → 45 minutes, because a shard is now minutes of test time and the ceiling exists
  only to absorb the variable `playwright install --with-deps` apt step. Every step is otherwise
  unchanged, including the Playwright browser cache key and `pnpm build` before the suite.
- The final step is `pnpm exec playwright test --shard=${{ matrix.shard }}`.

`.github/workflows/nightly.yml` (new)

- Triggers on `schedule` (`0 15 * * *`, 01:00 Sydney) and `workflow_dispatch` only — the parsed `on`
  keys are exactly those two, so no pull request can run it.
- Matrix over `[tablet, phone]`, `fail-fast: false`, 60-minute ceiling, the same install/cache/build
  steps as the gate.
- Two passes: the full profile suite, then `e2e/smoke.spec.ts` and `e2e/cargo.spec.ts` with
  `--repeat-each=2`. Those two are the specs that have flaked under contention on this machine and in
  earlier CI runs; repeating them inside one result line distinguishes a real crash from a slow frame
  instead of retrying the question away.

## AC evidence

| AC | Witness |
|---|---|
| AC-6 (both shards green on the PR, ≤6 min each) | **Pending CI.** Locally proven: the shard split is exhaustive (31 + 26 = 57) and each shard lists without error. Wall time is measured when the PR runs, not asserted here. |

## Notes

- No spec, `src/`, `package.json` or `playwright.config.ts` change, so the lanes from Phases 1–4 are
  untouched by this phase.
- `--shard` splits after `--grep`/project filters are applied, so the nightly's `--project` selection and
  the gate's unfiltered run each shard the set they intend. The nightly does **not** shard: two profiles
  already give two jobs, and the repeat pass wants both profiles complete.
- The `prod` project has a single test, so it lands entirely in one shard (26-test shard here). Recorded
  rather than balanced: splitting one test across shards is not possible, and the imbalance is ~1 second.
