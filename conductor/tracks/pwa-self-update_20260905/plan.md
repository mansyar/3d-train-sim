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

- [x] Task: Wire update probes in `src/main.ts` — `registration.update()`
  on visibility regain + hourly interval; register the pending update. — 08ab55d
- [x] Task: Wire quiet apply — `controllerchange` marks the update pending;
  on the ride state reaching idle, perform a single `location.reload()`;
  connect the ride-state hook (`src/state/ride.ts`). — 08ab55d
- [~] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 Notes (commit 08ab55d)

- `src/main.ts` gained a self-contained update block inside the app-root
  scope (it shares the queued `rideModeListeners` channel):
  - Probing: `navigator.serviceWorker.getRegistration()` is captured once;
    `registration.update()` fires on visibility regain and via an hourly
    `setInterval`, both gated by `shouldProbeForUpdate` (hidden tabs never
    probe; the interval doubles as a debounce).
  - Adopting: `controllerchange` marks the update pending — but only when a
    controller already existed (first install is not an update). A pending
    update is applied by `applyPendingUpdate()`, gated by `shouldReload`
    (ride idle + boot guard), via a single `location.reload()`.
  - Deferred updates re-check on ride end (`rideModeListeners`), on
    visibility regain, on the hourly probe, and once when the boot guard
    expires (`setTimeout(BOOT_GUARD_MS)`) so a boot-time activation is not
    stuck waiting for the next wake or hour.
- The ride-state hook uses the existing queued `rideModeListeners` channel
  (`src/state/ride.ts` itself was not modified — the scene's ride-mode
  subscription is the authoritative signal).
- No per-frame work added; all timers are 1 h / one-shot 15 s.
- Gates: `biome check`, `tsc --noEmit`, full `vitest run` (650 tests) clean.

## Phase 2 Verification Report

- **Acceptance criteria (glue):** probes fire only on visible tabs (visibility
  regain + hourly, debounced by the interval); `controllerchange` after an
  existing controller marks the update pending; a pending update reloads once
  when the ride is idle and the boot guard has passed; mid-ride it defers to
  ride end; no reload within 15 s of load (guard); no console errors expected
  (all paths are guarded no-ops).
- **Test audit:** glue is DOM/lifecycle code — no unit test per workflow
  (non-logic phase); covered by the acceptance criteria above and the
  existing e2e suite in Phase 4.
- **Gates:** `biome check` clean · `tsc --noEmit` clean · full `vitest run`
  650/650.
- **User approval:** pending.

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
