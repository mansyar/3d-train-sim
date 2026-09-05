# Implementation Plan — PWA Self-Update Flow

- **ID:** `pwa-self-update_20260905`
- **Workflow:** `conductor/workflow.md` (TDD for logic-bearing code;
  acceptance criteria + smoke for glue)

## Phase 1: Update decision logic (TDD)

- [x] Task: Write failing tests for `src/core/update-state.ts` (Red) — 5fb5621
  - `shouldReload({ rideActive, uptimeMs, alreadyReloaded })` → reload only
    when the ride is idle, uptime ≥ ~15 s, and this update hasn't been
    applied yet.
  - `shouldProbeForUpdate({ visible, msSinceLastProbe })` → probe when the
    tab regains visibility or ≥ ~60 min since the last probe.
- [x] Task: Implement `src/core/update-state.ts` to green (minimum code) — 5fb5621
- [x] Task: Verify coverage >80% (`CI=true pnpm test -- --coverage`) — 100% statements/branches/functions/lines — 5fb5621
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — user
  approved 2026-09-05 [checkpoint: 7cd6687]

## Phase 1 Verification Report

- **Changed files:** `src/core/update-state.ts` + `src/core/update-state.test.ts`
  (both new; no existing modules import them yet, so the blast radius is nil).
- **Test audit:** `update-state.test.ts` is the only suite covering the new
  module; the full unit suite passes unchanged (37 files, 650 tests).
- **Gates:** `biome check` clean · `tsc --noEmit` clean · coverage 100%
  statements/branches/functions/lines on the new module.
- **Manual verification plan** (deferred to end of Phase 2, when the glue
  lands): idle table + new deploy → single reload into the new version;
  mid-ride → reload deferred until the ride ends; no reload within 15 s of
  load; world restored intact from autosave afterwards.
- **User approval:** Yes — recorded 2026-09-05.

## Notes

### Phase 1 — Update decision logic (commit 5fb5621)

- `src/core/update-state.ts` exports two pure decision functions plus the
  tunable constants the glue layer will reuse: `shouldReload`
  (idle + uptime ≥ `BOOT_GUARD_MS` (15 s) + not already reloaded) and
  `shouldProbeForUpdate` (visible tab + never probed or ≥
  `PROBE_INTERVAL_MS` (1 h) since the last probe).
- TDD followed: Red confirmed (missing module), then green with 9 tests at
  100% coverage (statements/branches/functions/lines).
- Semantic choice worth recording: a hidden tab never probes; visibility
  regain only probes once the hourly interval has elapsed. On real family
  tablets wake cycles are far longer than an hour, so every wake probes —
  the interval doubles as a debounce so the visibility handler and the
  hourly timer cannot double-fire a probe.
- Gates: `biome check`, `tsc --noEmit`, `vitest run` all clean.

## Phase 2: Service-worker glue (non-logic — acceptance criteria)

Acceptance criteria for this phase: on visibility regain and hourly the app
probes for a new service worker; a `controllerchange` with an idle ride
reloads once; a `controllerchange` mid-ride defers until the ride ends; no
reload within the first ~15 s after load; no console errors.

- [ ] Task: Wire update probes in `src/main.ts` — `registration.update()`
  on visibility regain + hourly interval; register the pending update.
- [ ] Task: Wire quiet apply — `controllerchange` marks the update pending;
  on the ride state reaching idle, perform a single `location.reload()`;
  connect the ride-state hook (`src/state/ride.ts`).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Version in the parent gate

- [ ] Task: Inject `__APP_VERSION__` at build time (`vite.config.ts`
  reads `package.json`).
- [ ] Task: Render the version line in the parent gate panel
  (`src/ui/app.ts` + `src/style.css` — small, subtle, grown-up-facing).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Gates, docs, close-out

- [ ] Task: Full gates + e2e suite (`pnpm exec biome check .`,
  `pnpm exec tsc --noEmit`, vitest, Playwright).
- [ ] Task: Document — PWA update behavior note in `conductor/tech-stack.md`;
  parent-facing note in `CHANGELOG.md` `[Unreleased]`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
