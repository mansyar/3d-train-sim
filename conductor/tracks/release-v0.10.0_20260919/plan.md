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

- [~] **1.6 Phase Verification & Checkpoint (Refer to workflow.md)**
  - Run `pnpm check`; present full docs diff + link-check output; await explicit confirmation; write Verification Report + `[checkpoint: <sha>]`; commit `conductor(plan): Mark phase 'Changelog, Version Bump & Housekeeping' as complete`.
  - *Verification so far:* `pnpm check` green (biome 157 files clean / tsc clean / vitest 723/723 in 2.6s); diff since `main` is docs-only (`CHANGELOG.md`, `package.json`, `conductor/**`, `README.md`). Awaiting user confirmation of the manual review before the checkpoint.

## Phase 2: Local Pre-Tag Verification

- [ ] **2.1 Full local gates**
  - `pnpm exec biome check .` + `pnpm exec tsc --noEmit` + `CI=true pnpm test` + full `pnpm exec playwright test`.
  - *Constraint:* never run `docker build` concurrently with e2e (recorded v0.9.0 lesson).
  - *Verify:* record file/test counts (biome files, vitest passed, playwright passed + duration).
  - Commit: none (verification only) — results recorded in plan notes.

- [ ] **2.2 Local container smoke**
  - `docker build tiny-tracks:0.10.0`; run container; curl `/` (200, text/html, no-cache), `/sw.js` + manifest (no-cache), a hashed asset (immutable), SPA fallback (200); sanity-check precache entry count/size vs 6 MB cap; tear down container.
  - *Verify:* captured header + precache output recorded in plan notes.
  - Commit: none.

- [ ] **2.3 Phase Verification & Checkpoint (Refer to workflow.md)**
  - Present gate + smoke results; await explicit confirmation; write Verification Report + `[checkpoint: <sha>]`; commit `conductor(plan): Mark phase 'Local Pre-Tag Verification' as complete`.

## Phase 3: Tag, Ship & Production Verification

- [ ] **3.1 PR & CI**
  - Push branch; open PR; wait for CI (gates + e2e job) green.
  - *Verify:* PR checks all green; note run IDs.
- [ ] **3.2 Merge & tag**
  - Squash-merge to `main` (resolve `tracks.md` conflicts if racing PRs land first — re-apply our row); tag `v0.10.0` on the merge commit; push the tag.
  - *Verify:* tag points at the merge commit on `main`.
- [ ] **3.3 Release workflow watch**
  - Confirm `release.yml` runs gates → Docker build → GHCR push (`:0.10.0` + `:latest`) → Coolify deploy.
  - *Verify:* run green; image tags present; deploy fired.
- [ ] **3.4 Family-device verification**
  - Cold load production; build a loop; press ▶; whistle; tray shows **0.10.0**; music box chimes; three-way routes; levers swing.
  - *Verify:* notes captured; any friction recorded for a follow-up.
- [ ] **3.5 Phase Verification & Checkpoint (Refer to workflow.md)**
  - Present release evidence (run IDs, image, device notes); await explicit confirmation; write Verification Report + `[checkpoint: <sha>]`; commit `conductor(plan): Mark phase 'Tag, Ship & Production Verification' as complete`.
