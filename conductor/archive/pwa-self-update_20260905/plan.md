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
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — user
  approved 2026-09-05 [checkpoint: d6829b7]

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
- **User approval:** Yes — recorded 2026-09-05 [checkpoint: d6829b7].

## Phase 3: Version in the parent gate

- [x] Task: Inject `__APP_VERSION__` at build time (`vite.config.ts`
  reads `package.json`). — 722e750
- [x] Task: Render the version line in the parent gate panel
  (`src/ui/app.ts` + `src/style.css` — small, subtle, grown-up-facing). — 722e750
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) —
  approved 2026-09-05. [checkpoint: 3353913]

## Phase 3 Notes (commit 722e750)

- `vite.config.ts` reads `package.json` with `readFileSync` (no new deps)
  and injects `__APP_VERSION__` via `define`; `src/vite-env.d.ts` declares
  the ambient constant for TypeScript.
- The readout lives **inside the parent-gated starter tray**
  (`<span class="app-version">v0.7.0</span>`): the tray only opens after the
  deliberate 2 s hold, so toddler taps never see it. Styled as 12 px
  low-opacity brown text that wraps to its own line under the preset
  buttons (`flex-basis: 100%`) — grown-up eyes only, zero kid-facing noise.
- Verified in the production bundle: the built JS contains the literal
  `v0.7.0` (precached by the SW, so the version updates with each deploy).
- Gates: `biome check` clean · `tsc --noEmit` clean · `vite build` green
  (164 precache entries, generateSW).

## Phase 3 Verification Report

- **Acceptance criteria:** version visible in the parent gate panel
  (tray); injected from `package.json` at build time; verified present in
  the production bundle; tray opens only via the armed parent gate.
- **Test audit:** template/CSS/build-config change — no unit tests per
  workflow (non-logic phase); verified by build inspection + existing
  suites.
- **Gates:** `biome check` clean · `tsc --noEmit` clean · `vite build` green.
- **User approval:** approved 2026-09-05.

## Phase 4: Gates, docs, close-out

- [x] Task: Full gates + e2e suite (`pnpm exec biome check .`,
  `pnpm exec tsc --noEmit`, vitest, Playwright) — 650/650 unit,
  109/109 e2e (one infra flake: dev server died mid-run, rerun green
  with the server supervised manually)
- [x] Task: Document — PWA update behavior note in `conductor/tech-stack.md`;
  parent-facing note in `CHANGELOG.md` `[Unreleased]`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) —
  approved 2026-09-05.

## Phase 4 Verification Report

- **Gates:** `pnpm check` green (biome 128 files, tsc, vitest 650/650,
  37 files); `pnpm exec playwright test` **109/109 passed** (8.9 min,
  tablet + phone + prod projects). First e2e attempt failed 105/109 with
  "Could not connect to server" — the shared dev server died mid-run
  (infra flake, the known instability the config comments on); rerun
  against a supervised server was fully green.
- **Docs:** `conductor/tech-stack.md` PWA row now documents the quiet
  self-update flow (autoUpdate/skipWaiting, controllerchange signal,
  probe cadence, boot guard, ride-idle reload, `__APP_VERSION__`).
  `CHANGELOG.md` `[Unreleased]` gained a parent-facing **Changed** entry:
  updates arrive quietly between rides; version readable behind the
  parent gate.
- **User approval:** approved 2026-09-05.

## Phase: Review Fixes

- [x] Task: Apply review suggestions — guard the two service-worker
  promises with `.catch()` so offline probes never surface unhandled
  rejections or console errors: `getRegistration().then(...).catch()`
  and `swRegistration.update().catch()`. Gates rerun green
  (`pnpm check`: biome clean, tsc clean, vitest 650/650); e2e re-run
  not warranted (the guarded paths never fire in a test run). — d7028df
