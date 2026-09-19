# Plan: Release v0.10.0

**Track:** `release-v0.10.0_20260919` · **Type:** Chore · **Branch:** `track/release-v0.10.0_20260919`
**TDD:** Not applicable — no logic-bearing code (`src/core`, `src/state` untouched). Each task records its acceptance check before being marked complete, per `workflow.md`.

## Phase 1: Changelog, Version Bump & Housekeeping

- [x] **1.1 Changelog curation**
  - Move the whole `[Unreleased]` pile under `## [0.10.0] - 2026-09-19` verbatim (parent voice).
  - Add an empty `[Unreleased]` header; refresh compare links (`[Unreleased]` → `v0.10.0...HEAD`, add `[0.10.0]` link).
  - *Verify:* every bullet preserved; link targets exist (`git tag` check for v0.10.0 noted as pending-tag).
  - *Notes:* Promoted `[Unreleased]` → `## [0.10.0] - 2026-09-19` verbatim (music box / three-way + levers / delight polish / park fix); empty `[Unreleased]` retained; compare links refreshed (`v0.10.0...HEAD`, `v0.9.0...v0.10.0`).
  - *Commit:* `6f295f3`

- [x] **1.2 Version bump**
  - `package.json` `0.9.0 → 0.10.0`; grep repo (excluding archives/history) for stale `0.9.0` strings.
  - *Verify:* `grep 0.9.0` returns only CHANGELOG history + archived tracks.
  - *Notes:* `package.json` now `0.10.0`; tracked-file grep confirms no other `0.9.0` references outside changelog history, `conductor/archive/`, and this track's own spec/plan prose.
  - *Commit:* `b6bda0e`

- [x] **1.3 Registry reconciliation (`conductor/tracks.md`)**
  - Add done rows for `delight-toys-polish_20260913`, `scene-ui-decomposition_20260906`, `starter-refresh_20260905`, `pwa-self-update_20260905` with archive links.
  - Fix header wording ("active development tracks" → reflects archived completed tracks).
  - *Verify:* scripted link check — every `archive/...` link in `tracks.md` resolves; all 56 archive folders mentioned.
  - *Notes:* Four done rows added; header now "Registry of development tracks."; scripted check: 0 broken links, 56/56 archive dirs mentioned.
  - *Commit:* `232482d`

- [x] **1.4 Asset documentation refresh (`conductor/tech-stack.md`)**
  - Add missing recipes to the scripts tree: `blender-windmill.py`, `blender-carousel.py`, `blender-balloon.py`, `blender-frog.py`, `blender-crossing-gate.py`, `blender-music-box.py`, `blender-hills-phase2.py`.
  - Extend the authoring reference with newest assets + node contracts (read each recipe to confirm names: `musicbox_figure`/`musicbox_snow_cap`, crossing-gate gates/lantern, delight-toy motion nodes).
  - *Verify:* recipe names match `scripts/` dir listing exactly; node names match recipe source.
  - *Notes:* Scripts tree lists all 14 recipes; authoring reference extended with crossing gate (`crossing_gates`/`crossing_lantern`/`crossing_snow_cap`), music box (`musicbox_figure`/`musicbox_snow_cap`), bump/banked-corner run (`hill_snow_*`), and frog (`frog_body`/`frog_pad`) contracts; train-kit asset comment refreshed; scripted check: 0 recipes missing from the doc.
  - *Commit:* `86702ec`

- [x] **1.5 README accuracy**
  - Add three-way junction + signal levers to the toybox feature list; audit remaining "What's on the table" claims.
  - *Verify:* each claim traceable to a shipped track.
  - *Notes:* Toybox bullet now names switches with signal levers + the three-way junction; remaining claims (six locomotives, living meadow, cargo, weather) audited against shipped tracks — all current.
  - *Commit:* `5b20c7d`

- [x] **1.6 Phase Verification & Checkpoint (Refer to workflow.md)**
  - Run `pnpm check`; present full docs diff + link-check output; await explicit confirmation; write Verification Report + `[checkpoint: <sha>]`; commit `conductor(plan): Mark phase 'Changelog, Version Bump & Housekeeping' as complete`.
  - *Verification Report:* `pnpm check` green — biome 157 files clean, `tsc --noEmit` clean, vitest 723/723 (40 files, 2.6s). Registry link check: 0 broken links, 56/56 archive dirs mentioned. Recipe check: 0 of 14 `blender-*.py` recipes missing from `tech-stack.md`. Diff vs `main` is docs-only (`CHANGELOG.md`, `README.md`, `conductor/tech-stack.md`, `conductor/tracks.md`, `package.json`, track docs). Manual docs review confirmed by user 2026-09-19. `[checkpoint: 5b20c7d]`

## Phase 2: Local Pre-Tag Verification

- [x] **2.1 Full local gates**
  - `pnpm exec biome check .` + `pnpm exec tsc --noEmit` + `CI=true pnpm test` + full `pnpm exec playwright test`.
  - *Constraint:* never run `docker build` concurrently with e2e (recorded v0.9.0 lesson).
  - *Verify:* record file/test counts (biome files, vitest passed, playwright passed + duration).
  - Commit: none (verification only) — results recorded in plan notes.
  - *Notes:* biome 157 files clean; `tsc --noEmit` clean; vitest 723/723 (40 files, 2.6s); full Playwright **137 passed (10.9m)** across tablet · phone · prod (2 workers). Console noise only: known `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated` warning (pre-existing, not a failure).

- [x] **2.2 Local container smoke**
  - `docker build tiny-tracks:0.10.0`; run container; curl `/` (200, text/html, no-cache), `/sw.js` + manifest (no-cache), a hashed asset (immutable), SPA fallback (200); sanity-check precache entry count/size vs 6 MB cap; tear down container.
  - *Verify:* captured header + precache output recorded in plan notes.
  - Commit: none.
  - *Notes:* First build attempt failed during context load — `.dockerignore` missed the gitignored local dirs `.freebuff/` (worktrees with `node_modules`; `invalid file request … jsonpointer`) and `.playwright-cli/`; added both to `.dockerignore` (local-build hygiene, not app code — deviation documented). Image `tiny-tracks:0.10.0` built (69.8 MB). Smoke: `/` 200 `text/html` no-cache; `/sw.js` 200 `application/javascript` no-cache; manifest 200 no-cache (`application/octet-stream` — pre-existing nginx mime behavior, not a blocker); SPA fallback 200 `text/html`; entry JS `/assets/index-DpBtFUsF.js` 200 immutable (789,525 bytes; hash differs from local `dist`, as expected); `/assets/train-kit/tunnel.glb` 200 (7-day cache); **precache 173 entries** (v0.9.0: 171); `dist` 9.36 MB total (v0.9.0: ~10.2 MB); container removed cleanly.
  - Commit: `789df2d chore(docker): ignore local tooling dirs in build context`.

- [x] **2.3 Phase Verification & Checkpoint (Refer to workflow.md)**
  - Present gate + smoke results; await explicit confirmation; write Verification Report + `[checkpoint: <sha>]`; commit `conductor(plan): Mark phase 'Local Pre-Tag Verification' as complete`.
  - *Verification Report:* Gates — biome 157 files clean; `tsc --noEmit` clean; vitest 723/723; full Playwright **137 passed (10.9m)** across tablet · phone · prod. Container smoke — `tiny-tracks:0.10.0` built (69.8 MB) and served: root/sw/manifest no-cache, SPA fallback 200, hashed entry JS immutable, **173 precache entries** (v0.9.0: 171), `dist` 9.36 MB, container removed. Documented deviation (user-approved): `.dockerignore` gained `.freebuff/` + `.playwright-cli/` (commit `789df2d`) so local builds ignore gitignored tooling dirs; no app code touched, CI unaffected. User confirmed 2026-09-19. `[checkpoint: 789df2d]`

## Phase 3: Tag, Ship & Production Verification

- [x] **3.1 PR & CI**
  - Push branch; open PR; wait for CI (gates + e2e job) green.
  - *Verify:* PR checks all green; note run IDs.
  - *Notes:* PR [#62](https://github.com/mansyar/3d-train-sim/pull/62) opened; CI run `35423830987` all green — Gate · biome + typecheck pass (14s), Gate · vitest pass (18s), Gate · e2e (tablet · phone · prod) pass (19m1s).
- [~] **3.2 Merge & tag**
  - Squash-merge to `main` (resolve `tracks.md` conflicts if racing PRs land first — re-apply our row); tag `v0.10.0` on the merge commit; push the tag.
  - *Verify:* tag points at the merge commit on `main`.
  - *Notes:* Squash-merge landed as `efabbf4 Release v0.10.0 (#62)`. Incident (resolved): the first tag push landed on the stale local track tip `f3870df` because uncommitted plan edits blocked gh's local branch cleanup; the Release run it triggered (`35424716298`) was cancelled, the tag deleted and re-pushed at `efabbf4` — identical tree, correct provenance. Main CI run `35424712979` runs on `efabbf4`.
- [~] **3.3 Release workflow watch**
  - Confirm `release.yml` runs gates → Docker build → GHCR push (`:0.10.0` + `:latest`) → Coolify deploy.
  - *Verify:* run green; image tags present; deploy fired.
  - *Status:* Watching the Release run triggered by the corrected `v0.10.0` tag push (started 2026-09-19).
- [ ] **3.4 Family-device verification**
  - Cold load production; build a loop; press ▶; whistle; tray shows **0.10.0**; music box chimes; three-way routes; levers swing.
  - *Verify:* notes captured; any friction recorded for a follow-up.
- [ ] **3.5 Phase Verification & Checkpoint (Refer to workflow.md)**
  - Present release evidence (run IDs, image, device notes); await explicit confirmation; write Verification Report + `[checkpoint: <sha>]`; commit `conductor(plan): Mark phase 'Tag, Ship & Production Verification' as complete`.
