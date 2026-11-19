# Phase R2 Verification — Hand-Drawn Icon Clarity

- **Track:** `toybox-clarity_20261119`
- **Phase:** R2 (post-review, user-directed requirement change)
- **Date:** 2026-11-19
- **Branch:** `feat/toybox-clarity_20261119`
- **Base commit:** `57e9f2b6ab68296f55249c7f20b86a0fb27b66e4` (`conductor(plan): Mark Phase R2 as in progress`)
- **Final code commit:** `8332049` (`chore(ui): remove generated piece-icon pipeline`), on top of the R2 task commit `475f2ca` (`feat(ui): restore hand-authored piece icons for R2`). This evidence file is committed in a follow-up `docs` commit.

## Result

**Verified.** Geometry-derived silhouettes were replaced with the curated hand-authored SVG icon source, the generator pipeline was deleted, and both icon test layers were adapted to read the committed source text. The exact phase verification command passed twice: once on the subagent's tree before the file removals, and again on the final tree including the two deletions (`R2_FINAL_EXIT=0`). All configured gates are green; the earlier `git rm` permission denial was resolved by the primary running the command verbatim, and no blocker remains.

## Before / after diff summary

| File | Before | After |
|------|--------|-------|
| `src/ui/toy-icons.ts` | Imported `PIECE_ICONS` from `./generated-piece-icons`, re-exported it, and pointed readers at the generator. | Restored in full from pre-track base `6d762f35363010f0abd6f360850fa060d414b6ad`: curated chunky 48×48 `PIECE_ICONS` (19 hand-authored SVGs with rails/features), `PIECE_LABELS`, `SCENERY_ICONS`, `DAY_ICONS`, `nextDayIcon`, `toySlot`. No generated import or re-export. |
| `src/core/drawer.test.ts` | `describe('generated piece icons')` read `../ui/generated-piece-icons.ts` as text; counted SVGs across the whole file. | `describe('hand-authored piece icons')` reads `../ui/toy-icons.ts` as text, isolates the `PIECE_ICONS` block, asserts every `PieceType` has a `48×48` SVG and that no two pieces sharing a drawer tab have identical markup. No `src/core` → `src/ui` import. |
| `e2e/toybox-clarity.spec.ts` | Five UI smoke tests; no icon suite existed despite the brief's "rename" wording. | Added `test.describe('hand-authored piece icons')` with two text-based assertions (every `PieceType` has an icon; distinct-within-tab) reading `../src/ui/toy-icons.ts`. No generator/`--check` references. |
| `src/ui/generated-piece-icons.ts` | 123-line generated silhouette module. | **Deleted** (`git rm`, commit `8332049`). |
| `scripts/generate-piece-icons.mjs` | 295-line offline GLB→SVG generator with `--check`. | **Deleted** (`git rm`, commit `8332049`). |

`e2e/a11y.spec.ts` and all other behaviour files are untouched. Paging, dots/swipe, per-tab page memory, outside-drag removal, undo, trash removal, disclosure gating and the a11y sweep are unchanged; the sole behaviour change is the icon source.

## Commands (layer, command, exit, summary)

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| Static + lint + unit (early gate) | `pnpm check` | 0 | Biome 199 files clean (including the then-present generated file); `tsc --noEmit` clean; Vitest 57 files / 1016 tests passed. |
| Exact phase command (subagent run, before deletions) | `pnpm check && pnpm build && pnpm exec playwright test e2e/toybox-clarity.spec.ts e2e/smoke.spec.ts e2e/a11y.spec.ts` | 0 | Biome 199 files; Vitest 57 files / 1016 tests; Vite 115 modules with 178 PWA precache entries; Playwright 29 passed, 1 pre-existing `@ci` skip, 0 failed in 2.1 m. Both new `hand-authored piece icons` assertions passed. |
| File removal (primary handoff) | `git rm src/ui/generated-piece-icons.ts scripts/generate-piece-icons.mjs` | 0 | `rm 'scripts/generate-piece-icons.mjs'`; `rm 'src/ui/generated-piece-icons.ts'`; both deletions staged, then committed as `8332049`. |
| Exact phase command (primary final run, after deletions) | `pnpm check && pnpm build && pnpm exec playwright test e2e/toybox-clarity.spec.ts e2e/smoke.spec.ts e2e/a11y.spec.ts` | 0 | `R2_FINAL_EXIT=0`. Biome 198 files clean (one fewer — generated module gone); `tsc` clean; Vitest 57 files / 1016 tests; Vite 115 modules with 178 PWA precache entries; Playwright 30 tests, 29 passed, 1 pre-existing `@ci` skip, 0 failed in 2.2 m. Both `hand-authored piece icons` assertions passed. |

### Exact verification output (key lines)

Subagent run (before deletions):
```
Checked 199 files in 255ms. No fixes applied.
 Test Files  57 passed (57)
      Tests  1016 passed (1016)
✓ 115 modules transformed.       precache 178 entries (10657.14 KiB)
  ok 10 [tablet] › e2e/toybox-clarity.spec.ts:298:3 › hand-authored piece icons › every PieceType has a hand-authored SVG
  ok 11 [tablet] › e2e/toybox-clarity.spec.ts:306:3 › hand-authored piece icons › no two icons on one drawer tab are identical
  1 skipped
  29 passed (2.1m)
```

Primary final run (after deletions):
```
R2_FINAL_EXIT=0
Biome 198 files clean; tsc clean; Vitest 57 files / 1016 tests
Vite build 115 modules; PWA 178 precache entries
Playwright 30 tests: 29 passed, 1 pre-existing @ci skip, 0 failed in 2.2m
Both hand-authored piece icons assertions passed
```

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| FR-8 | Every track-piece icon hand-authored, static SVG, intuitive at 48×48, committed source, no runtime WebGL. | Full curated `toy-icons.ts` restored from pre-track base; `PIECE_ICONS` has 19 hand-authored `48×48` SVGs with rails/features; unit + e2e assertions read committed source text. | Pass |
| NFR-6 | Static dependency-free SVG; no runtime WebGL renderer, generated icon module, baked PNG, network fetch or new dependency. | Generated module and generator script deleted in `8332049`; no new dependency/manifest/lockfile change; icons are inline SVG only. | Pass |
| FR-7 / AC-8 | Full configured check matrix passes with gates intact. | Exact command exit 0 on both runs: Biome, tsc, 1016 Vitest tests, Vite build (178 precache), 29 e2e/smoke/a11y tests passed, 1 pre-existing `@ci` skip. | Pass |
| AC-10 | Every `PieceType` has a distinct hand-authored SVG; no two icons on one tab identical; no runtime WebGL icon renderer or offline generator module. | Unit + e2e tests assert 19 entries, `parsed.size === PIECE_TYPES.length`, and distinct-within-tab via `drawerTabs()`/`tabForKind()`; no runtime WebGL renderer; offline generator module/script removed. | Pass |

AC-8 (full matrix) and AC-10 (distinct hand-authored icons, no generator module, no runtime WebGL) are covered by the unit assertion, the e2e text assertions, the two green exact verification chains, and the scan below.

## Scope statement

`e2e/a11y.spec.ts`, `src/ui/toy-drawer.ts`, `src/ui/toy-drag.ts`, `src/ui/app.ts`, `src/style.css`, `src/core/drawer.ts`, `playwright.config.ts`, all workflows, dependency manifests, lockfiles, and all other Conductor state files are untouched. No generator, baked PNG thumbnails, runtime WebGL renderer, new dependency, network fetch or new storage key remains. The only icon source is the committed hand-authored `src/ui/toy-icons.ts`.

## Stale-reference scan (active source/tests)

Command: scan `src/` and `e2e/` for `generate-piece-icons|generated-piece-icons|--check`.

- Primary's final `Select-String` scan over `src` and `e2e` produced **no matches** outside the now-deleted files.
- Before deletion, the only matches were inside `src/ui/generated-piece-icons.ts` itself (its own header comment); `toy-icons.ts`, `drawer.test.ts` and all e2e specs were already clean.
- After deletion, active source/tests contain zero stale generated-icon references.

## Deviations

- The brief said to "rename the `generated piece icons` suite" in `e2e/toybox-clarity.spec.ts`, but no such suite existed in that file. A new `hand-authored piece icons` suite was added instead, meeting the described end state (read `toy-icons.ts` as text, every `PieceType` has an icon, distinct-within-tab).

## Blockers

None. The earlier `git rm` permission denial was resolved by the primary running the command verbatim; both files are deleted and the final verification chain is green.

## Notes

No runtime dependency, network call, storage change or product/design decision was made. The two deletions are behaviour-neutral because nothing imports the generated module after the `toy-icons.ts` restore. Commits: `475f2ca` (restore + test adaptation + initial evidence), `8332049` (remove generator pipeline), and the follow-up docs commit for this rewritten evidence.

## Primary verification

- Verified at `2026-11-19T02:39:25Z` on final HEAD `1864a9cc7c294e10c6907c7d2db01baf2c96718f`.
- Clean tree (`git status --porcelain` empty).
- `git diff --name-only 57e9f2b6ab68296f55249c7f20b86a0fb27b66e4..HEAD` returned exactly the six R2 Touches: `conductor/tracks/toybox-clarity_20261119/verification/phase-R2.md`, `e2e/toybox-clarity.spec.ts`, `scripts/generate-piece-icons.mjs` (deleted), `src/core/drawer.test.ts`, `src/ui/generated-piece-icons.ts` (deleted), `src/ui/toy-icons.ts`.
- Commits in range: `1864a9c`, `8332049`, `475f2ca`; `git log --merges` returned no merge commits.
- Re-ran the exact verification command on final HEAD: `R2_PRIMARY_FINAL_EXIT=0`; Biome 198 files clean, tsc clean, Vitest 57 files / 1016 tests, Vite build 115 modules with PWA 178 precache entries, Playwright 30 tests with 29 passed, 1 pre-existing `@ci` skip, 0 failed in 2.2m. Both `hand-authored piece icons` assertions passed.
- Stale-reference scan over active `src`/`e2e` TypeScript produced no matches for `generate-piece-icons|generated-piece-icons|--check`.
- FR-8, NFR-6, FR-7, AC-8 and AC-10 are satisfied; the one deviation (new icon suite instead of rename, because no generated suite existed) is accepted.
