# Review — E2E Cost

| | |
|---|---|
| **Track** | `e2e-cost_20261108` |
| **Branch** | `refactor/e2e-cost_20261108` |
| **Range** | `cb9a6c4..HEAD` (round 1 reviewed at `cbc99a2`) |
| **Rounds** | 1 |
| **Verdict** | **PASS WITH FINDINGS** |

## Summary

The lane work holds up: two tags, a three-file phone allowlist, a 57-run matrix, two CI shards and a
nightly, all verified as selections rather than as intentions (`--list` for each composition, and the
phone `testMatch` × `grep` product checked deliberately, because that is where both earlier count
mistakes lived). The parity ledger's six "dropped outright" entries were re-read case by case and each
witness resolves at the cited line.

Round 1 found one real defect, not a wording problem: the merged build journey's scenery drag dropped the
tree onto the cell the track piece had just taken, and its only assertion compared a screenshot taken with
the drawer closed to one taken with it open — so the step passed whether or not a scenery toy could be
placed at all. One of FR-2's ten smoke behaviours had no witness while the ledger counted it as carried.
Fixed in Phase R1 with a world assertion that was then proved to bite (revert the drop target: expected 5
scenery, received 4, red). The five smaller findings were two wrong timing claims in the docs, an AC-2
bound eased beyond its measurement, an overstated witness in the ledger, and two commands described
inaccurately.

## Verification

| Check | Command | Result |
|---|---|---|
| Static + unit | `pnpm check` | pass — Biome 178 files, `tsc` clean, 50 files / 883 tests |
| Coverage | `pnpm test:coverage` | pass — 97.35 / 91.06 / 98.10 / 99.44 |
| Build | `pnpm build` | pass — 178 precache entries, 10 641.84 KiB |
| Suite size | `playwright test --list` | 57 runs in 21 files (49 tablet · 7 phone · 1 prod) |
| Smoke lane | `pnpm e2e` | 17 passed — 2.5 min warm, 3.3 min cold |
| Full tablet lane | `pnpm e2e:full` | 7.7 min, one contention flake that passes alone |
| Full matrix | `pnpm exec playwright test` | 56 passed, 1 skipped (the `@ci` canary) in 9.4 min |
| Smoke file, both profiles | `playwright test e2e/smoke.spec.ts --project=tablet --project=phone` | 13 passed, 1 skipped in 1.8 min (after R1) |

## Requirements coverage

| ID | Implemented by | Verified by | Status |
|---|---|---|---|
| FR-1 | P1 | tag census: 10 `@smoke`, 1 `@ci` | covered |
| FR-2 | P1, P3, P4 | 17 runs / 10 unique; scenery drag-place now world-asserted (R1) | covered |
| FR-3 | P1 | `playwright.config.ts` phone `testMatch` | covered |
| FR-4 | P2, P3, P4 | 50 unique tests, every merged body named by `test.step` | covered |
| FR-5 | P2–P4, R1 | `parity.md`; witnesses re-read; the one overstated row corrected | covered |
| FR-6 | P1 | three scripts; `e2e` build requirement confirmed against the 5198 origin | covered |
| FR-7 | P1 | `@ci` skip proven both ways | covered |
| FR-8 | P5 | matrix, `fail-fast: false`, 45-min ceiling | covered |
| FR-9 | P5, R1 | nightly matrix; the phone repeat step no longer names an unselectable spec | covered |
| FR-10 | P6, R1 | README / CONTRIBUTING / tech-stack, with measured times | covered |
| FR-11 | — | no `src/` change, no dependency, 883 tests | covered |
| FR-12 | P2–P4, R1 | nine risk classes witnessed | covered |
| NFR-1 | P2–P4 | 57 runs, 50 unique | covered |
| NFR-2 | P6 | 7.7 min against the amended ≤8 | covered |
| NFR-3 | R1 | 2.5 warm / 3.3 cold against the amended ≤3.5 | covered |
| NFR-4–7 | P1, P5 | no dependency; 883 tests; `workers: 2`; 45-min ceilings | covered |
| AC-1 | P2–P4 | 57 / 50 | covered |
| AC-2 | P1, P3, P4, R1 | 17 passed, ≤3.5 min cold | covered (amended, twice, dated) |
| AC-3 | P6 | 7.7 min | covered (amended 6→8) |
| AC-4 | P1, P4 | 7 runs, 3 files | covered |
| AC-5 | P1 | skipped locally, runs with `CI` | covered |
| AC-6 | P5 | **pending CI on this PR** | missing until the PR runs |
| AC-7 | P2–P4, R1 | ledger complete; the note-copy gap disclosed as debt | covered |
| AC-8 | P6 | 883 tests, coverage unchanged | covered |
| AC-9 | P6, R1 | docs describe the shipped shape and its real times | covered |
| AC-10 | P6 | `src/` and lockfile untouched | covered |

## Findings — round 1

| ID | Sev | File | What | Resolution |
|---|---|---|---|---|
| F1 | High | `e2e/smoke.spec.ts:104-123` | Scenery drop reused the previous step's cell, so the placement was refused; the screenshot compared closed-drawer to open-drawer and could not tell | Fixed: free cell via `cellToScreen`, world assertion on the scenery delta and cell; red proof recorded (expected 5, received 4) |
| F2 | Medium | `e2e/README.md:14-16` | Advertised ~2 / ~4 min against measured 2.5–3.3 / 7.7 | Fixed: ~3 and ~8, with the measured range and what dominates it |
| F3 | Medium | `spec.md` AC-2 | Bound left at ≤3 min while a cold run measured 3.3 | Fixed: ≤3.5 cold / ≤3 warm, dated, with both runs recorded |
| F4 | Medium | `verification/parity.md` | The `too-large` note copy was implied to be witnessed; it is not | Fixed: the row names the gap, the ledger records it as debt |
| F5 | Low | `.github/workflows/nightly.yml` | Phone repeat step named `cargo.spec.ts`, which the phone `testMatch` excludes | Fixed: tablet-only conditional; header comment corrected |
| F6 | Low | `CONTRIBUTING.md` / `e2e:full` | Described as what a PR runs, though it is tablet-only | Fixed: "the tablet half … CI also runs phone and prod, sharded" |
| F7 | Low | `e2e/README.md:16` | `e2e:file`'s "no build" is false for specs on the 5198 preview origin | Fixed: caveat added |

## Overrides

None. No finding was deferred.

## Plan compliance

Phases 1–6 verified at `c970f13`, `81fc042`, `c7c2195`, `7377ce1`, `c8668ce`, `a708d81`; Phase R1 at the
fix commit. Deviations recorded in the plan: AC-4 renumbered twice rather than adding a third tag, FR-2/AC-2
ten-instead-of-eleven after the toybox merge, NFR-2/AC-3 amended on measurement, Phase 6 and R1 performed by
the primary because the subagent is denied `conductor/` writes.

## Out of scope

CI wall time for the sharded jobs (unmeasured until the PR), the 3-worker experiment (rejected on evidence),
and any change to what the tests assert beyond the one fixed step.

## Debt

- The `too-large` note copy has no test. It needs the constant exported or the rendered sentence asserted,
  which is UI-copy work, not suite-shape work.
- `@smoke` sits at its bound: 3.3 min cold for a 3.5-minute ceiling, dominated by the 43 s offline boot.

## Doc sync

`synced` — `e2e/README.md`, `CONTRIBUTING.md` and `conductor/tech-stack.md` describe the tags, lanes, matrix,
shards and nightly, and the spec carries the amended bounds with dates.

## Post-review CI repair (2026-11-08)

The first sharded run went red within a minute on both shards, and the reason had nothing to do with the suite:

```
/home/runner/.cache/ms-playwright/webkit-2336/minibrowser-wpe/bin/MiniBrowser:
error while loading shared libraries: libicudata.so.74: cannot open shared object file
```

`ubuntu-latest` moved to **26.04 (resolute)** the same day. The browser cache (keyed only on `runner.os` and
the lockfile) restored a WebKit build linked against the older ICU, `playwright install --with-deps` saw the
directory and skipped the download, and every launch died before a test could run. Fixed by pinning
`runs-on: ubuntu-24.04` in both the PR gate and the nightly, and by putting the image in the cache key
(`playwright-ubuntu-24.04-<lockfile hash>`) so an image bump can never again reuse a browser the image cannot
load. Re-run: **shard 1/2 7m46s, shard 2/2 8m14s**, both green, and `audit` / `vitest` / `biome + typecheck`
green throughout.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
|---|---|---|---|---|---|---|
| 1 | PASS WITH FINDINGS | 0 | 1 | 3 | 3 | 7 |
