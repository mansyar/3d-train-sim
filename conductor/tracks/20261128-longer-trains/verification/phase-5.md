# Phase 5 verification — Integrated evidence

Track: `20261128-longer-trains` · Phase: 5 (Integrated evidence) · Date: 2026-11-28 · Executor: subagent (no commits; working tree left ready for primary verification)

Branch: `feat/20261128-longer-trains` · Base: `bbec946` (merge of PR #93, immediately before track initialization) · HEAD: `f529688` (chore: mark phase 5 in progress)

Result: **verified** — coverage gate green, production build green, full tablet matrix green (110 passed / 1 skipped / 0 failed), committed evidence bundle present.

## What changed

- `e2e/longer-trains-evidence.spec.ts` (new) — one Chromium tablet session drives the whole integrated story: roomy loop, two real `+` taps to four wagons, four distinct outfits (`classic`, `coal`, `tank`, `container`), a chase-view ride, a byte-identical reload, and a reduced-motion cargo run that loads and delivers crates on all four wagons. Raw captures go to the gitignored `.conductor/evidence/20261128-longer-trains/screenshots/`; `test.afterAll()` curates them into this track's `evidence/` bundle and renders the GIF.
- `e2e/longer-trains-drawer.spec.ts` — stale assertions corrected (see Deviations). Test-only; no `src/` edits this phase.

The harness resolves ffmpeg **only** as `process.env.FFMPEG ?? 'ffmpeg'`; no absolute path is baked in. The GIF is trimmed with `-t 5`, `fps=10`, `scale=400:-1:flags=lanczos` (palettegen/paletteuse) and `-loop 0` — one five-second chase cycle, 400 px wide, 10 fps. Video recording is enabled with `test.use({ video: { mode: 'on', ... } })` scoped to this spec file only, so the rest of the matrix stays video-free.

## Commands run (chronological)

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `pnpm check` | 0 | 232 files checked; 63 test files / 1124 tests passed |
| 2 | `pnpm exec playwright test e2e/longer-trains-evidence.spec.ts` | 1 | First capture: mixed rack wait timed out; `afterAll` ENOENT noise |
| 3 | `pnpm check` | 0 | Biome/TS clean after formatting |
| 4 | `pnpm exec playwright test e2e/longer-trains-evidence.spec.ts` | 1 | Cargo phase: all four `crateVisible` false (reduced motion set mid-session) |
| 5 | `pnpm check` | 0 | Clean |
| 6 | `pnpm exec playwright test e2e/longer-trains-evidence.spec.ts` | 0 | 1 passed — reload under `reducedMotion: 'reduce'` fixed the cargo phase |
| 7 | `pnpm check` | 0 | Clean after adding the overview frame |
| 8 | `pnpm exec playwright test e2e/longer-trains-evidence.spec.ts` | 0 | 1 passed — final capture with `consist-overview.png` |
| 9 | `pnpm test:coverage` | 0 | 63 files / 1124 tests; coverage gate green (numbers below) |
| 10 | `pnpm build` | 0 | 126 modules; PWA precache 178 entries (10 690.25 KiB) |
| 11 | `pnpm exec playwright test --project=tablet` | 1 | First full matrix: 109 passed / 1 skipped / 1 failed (stale drawer spec) |
| 12 | `pnpm exec playwright test e2e/longer-trains-drawer.spec.ts --grep "dims without a fitting loop"` | 1 | Confirmed deterministic: post-reset count 2, not 3 |
| 13 | `pnpm exec playwright test e2e/longer-trains-drawer.spec.ts --grep "dims without a fitting loop"` | 1 | Second assertion stale: tiny 4-cell loop now enables `+` (fit boundary) |
| 14 | `pnpm exec playwright test e2e/longer-trains-drawer.spec.ts --grep "dims without a fitting loop"` | 0 | 1 passed after aligning expectations with FR-7 reset-to-pair and the fit rule |
| 15 | `pnpm check` | 0 | 232 files; 63 test files / 1124 tests passed |
| 16 | `pnpm test:coverage` | 0 | Same green numbers as #9 |
| 17 | `pnpm exec playwright test --project=tablet` | 0 | **Full matrix green: 110 passed / 1 skipped / 0 failed (20.3 m)** |
| 18 | `git status --short --branch` | 0 | Recorded hand-off state (below) |

Fix-attempt budget: the evidence spec needed two fix rounds (mixed rack, cargo reduced-motion) plus a framing addition; the drawer spec needed exactly two fix rounds, within the allowed maximum. The final run of every mandatory command is green. `pnpm check` / Vitest were never run concurrently with Playwright.

## Verification numbers

| Gate | Command | Exit | Numbers |
|---|---|---|---|
| Static + unit | `pnpm check` | 0 | 232 files checked; 63 test files, 1124 tests passed; `tsc --noEmit` clean; Biome clean |
| Coverage | `pnpm test:coverage` | 0 | Statements **97.19 %** (2048/2107), branches **91.9 %** (988/1075), functions **97.31 %** (472/485), lines **98.95 %** (1797/1816). `core` 97.89 / 93.25 / 98.75 / 99.60; `state` 95.58 / 88.23 / 94.51 / 97.39. All well above the 80 % gate. |
| Production build | `pnpm build` | 0 | 126 modules transformed; JS 847.68 kB (gzip 227.05 kB); CSS 16.11 kB (gzip 3.39 kB); `dist/sw.js` + `dist/workbox-9c191d2f.js` generated |
| Precache | from `pnpm build` | — | **178 entries / 10 690.25 KiB** — identical to the 178-entry baseline in earlier tracks, so no new assets (NFR-2); extras reuse existing procedural outfits |
| Tablet matrix | `pnpm exec playwright test --project=tablet` | 0 | 111 tests registered; **110 passed, 1 skipped** (`smoke.spec.ts:960` ambient-frame-rate case tagged `@ci`), 0 failed |

The Vite `configLoader: 'native'` advisory and `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated` lines are WebServer warnings, not browser console errors. The evidence spec finishes with `expect(errors, ...).toEqual([])` using `watchConsoleErrors(page)`, which allowlists only the known WebKit `blob:` fetch noise and never filters `pageerror`.

## Acceptance criteria

| ID | Criterion | Evidence |
|---|---|---|
| AC-1 | `+` grows to 4; 5th tap silent no-op | Evidence spec asserts count 4 after two real `+` taps; `longer-trains-drawer.spec.ts` asserts the cap and no-op. Full matrix green. |
| AC-2 | Two wagons wear different presets via select + preset | Evidence spec dresses four distinct slots (`classic`/`coal`/`tank`/`container`) and asserts the scene witness rack; persist/drawer specs cover the two-wagon case. |
| AC-3 | Tap-last removes; reset restores the pair | Drawer and persist specs in the full matrix; the drawer-spec fix explicitly encodes FR-7 reset-to-pair. |
| AC-4 | `+` dims on a short loop, re-enables when it grows | `longer-trains-drawer.spec.ts:118` green in the final matrix: no loop → dimmed no-op; 4-cell loop → one margin wagon, then dimmed at three; roomy loop → grows to four. |
| AC-5 | Reload restores length + outfits byte-identically | Evidence spec compares store, scene witness and raw IDB snapshot before/after `page.reload()`; `reload.png`. |
| AC-6 | Wagons 3 and 4 load and deliver cargo | Evidence spec asserts `[true,true,true,true]` crates after a station hand-off, `[false,false,false,false]` after delivery, and exactly one delivery increment; `cargo.png`. |
| AC-7 | Unit + e2e green on tablet with 4-wagon mixed-consist screenshots | Unit 1124/1124, coverage gate green, full tablet matrix 110 passed / 1 skipped, committed five-file bundle. Phone/project matrix is CI-sharded and unchanged by this track; the new spec is tablet-only by design. |

## Evidence bundle

Committed at `conductor/tracks/20261128-longer-trains/evidence/`:

| File | Shows |
|---|---|
| `ride.png` | Four-wagon mixed consist riding in chase view (GIF window) |
| `consist-overview.png` | Camera pulled back to show the whole lengthened consist on the roomy loop |
| `reload.png` | Restored state after a real page reload |
| `cargo.png` | All four wagons loaded with crates at the station |
| `longer-trains-cycle.gif` | One five-second chase cycle, 400 px wide at 10 fps, looping |

Raw captures and the Playwright video remain in gitignored `.conductor/evidence/20261128-longer-trains/screenshots/` and `test-results/`; only the curated bundle above is committed.

## Deviations

| File | Reason |
|---|---|
| `e2e/longer-trains-drawer.spec.ts` | Outside the brief's Touches (new evidence spec + bundle only). The first full matrix exposed stale assertions in a phase-2 spec: after FR-7's reset-to-pair change, `clearMeadow` / `buildLoop` return the consist to two wagons, and the real fit rule (`consistFitsLoop(4, 2) === true`, covered by `world.test.ts`) enables `+` on a four-cell loop with one margin wagon. The smallest necessary change aligned the three count assertions and the tiny-loop dim check with those contracts; no production code changed. |

## Primary verification (independent re-run, 2026-11-28)

- Tree vs `phase_base f529688` holds only `M e2e/longer-trains-drawer.spec.ts`
  plus the new evidence spec, bundle, and this file — matches. Deviation
  ACCEPTED: test-only alignment of the drawer spec with FR-7 reset-to-pair
  and the unit-covered fit rule (`consistFitsLoop(4,2)===true`,
  `consistFitsLoop(4,3)===false` in `world.test.ts`); the final assertions
  (no loop → dim/no-op at 2; tiny loop → + at 2, dim at 3; roomy → 4) match
  the rule exactly, and the clearMeadow count-2 assertions prove shrink-keeps
  (P4.T2). No `src/` edits this phase.
- `pnpm check` re-run: exit 0 — 63 files / 1124 tests passed.
- Targeted re-run `e2e/longer-trains-evidence.spec.ts +
  e2e/longer-trains-drawer.spec.ts`: exit 0 — 4 passed (tablet), zero console
  errors via the spec gates.
- Bundle present: 4 PNGs + `longer-trains-cycle.gif` (~1.6 MB, within budget);
  ffmpeg PATH-only per the R2 lesson.

## Notes / hand-off

- No commits were created. Working tree at hand-off: modified `e2e/longer-trains-drawer.spec.ts`; new `e2e/longer-trains-evidence.spec.ts`; new `conductor/tracks/20261128-longer-trains/evidence/` bundle. (The untracked `20261128-expression-liveries/` and `20261128-rituals-day-weather/` track directories were already present and were not touched.)
- No `src/` files were edited this phase; no new GLB/network assets were introduced, so precache stayed at 178 entries.
- The evidence harness is intentionally temporary: it exists to regenerate the committed bundle. The bundle itself is the durable artifact.
