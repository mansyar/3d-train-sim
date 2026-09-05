# Implementation Plan — PWA Self-Update Flow

- **ID:** `pwa-self-update_20260905`
- **Workflow:** `conductor/workflow.md` (TDD for logic-bearing code;
  acceptance criteria + smoke for glue)

## Phase 1: Update decision logic (TDD)

- [ ] Task: Write failing tests for `src/core/update-state.ts` (Red)
  - `shouldReload({ rideActive, uptimeMs, alreadyReloaded })` → reload only
    when the ride is idle, uptime ≥ ~15 s, and this update hasn't been
    applied yet.
  - `shouldProbeForUpdate({ visible, msSinceLastProbe })` → probe when the
    tab regains visibility or ≥ ~60 min since the last probe.
- [ ] Task: Implement `src/core/update-state.ts` to green (minimum code)
- [ ] Task: Verify coverage >80% (`CI=true pnpm test -- --coverage`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

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
