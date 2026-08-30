# Plan: Performance Guardrails

Feature track — `src/core` logic is TDD'd; scene wiring is verified via
acceptance criteria + smoke tests per `workflow.md`.

## Phase 1 — FPS Probe & Quality Controller (core, TDD) [checkpoint: 1acdd1f]

### Verification Report — Phase 1
- Automated: `pnpm test` → 283 tests across 24 files, all passing;
  `pnpm exec vitest run src/core/perf-monitor.test.ts --coverage` → 94.25%
  stmts / 90.47% branch / 98.7% lines on `perf-monitor.ts` (>80% target met);
  `pnpm exec tsc --noEmit` clean; `pnpm exec biome check .` clean.
- Manual verification: deferred — Phase 1 is pure `src/core` logic with no
  user-facing surface; observable checks happen in Phase 2 (probe wiring,
  `?perf=debug` overlay) and Phase 3 (heavy-scene degradation + recovery).

- [x] Task: Write failing unit tests for the FPS probe (0bab32c)
  - [x] Ring buffer behavior: preallocated capacity, wraps without allocating
  - [x] Verdict thresholds: `healthy` / `strained` / `critical` over a ~4 s rolling window
  - [x] Hidden-tab pause: samples ignored while paused; resuming doesn't count the gap
  - Notes:
    - Task: FPS probe specs — Red phase.
    - Added `src/core/perf-monitor.test.ts` covering: startup grace (healthy
      before enough samples), 60 fps → healthy, 35 fps → strained, 20 fps →
      critical, rolling-window eviction of stale history, ring-buffer wrap
      with a small capacity, paused sampling fully ignored, resume-gap delta
      not poisoning the next verdict, runaway-delta clamping, and constant
      exposure (`PERF_SAMPLE_CAPACITY`, `PERF_HEALTHY_FPS`,
      `PERF_STRAINED_FPS`, `PERF_WINDOW_SECONDS`).
    - Why: spec requires a pure, zero-allocation probe; tests pin verdict
      thresholds and hidden-tab safety before any implementation exists.
    - Confirmed failing (`Cannot find module './perf-monitor'`).
- [x] Task: Write failing unit tests for the quality controller (45e7fd1)
  - [x] Sustained strain degrades L0→L1→L2; single-verdict dips do not
  - [x] Cooldown between level changes (no flapping)
  - [x] Recovery after sustained health is slower than degradation; never skips levels upward
  - Notes:
    - Task: Quality controller specs — Red phase.
    - Extended `src/core/perf-monitor.test.ts` with a `createQualityController`
      describe block: starts at L0, single strained dips ignored, 2 s sustained
      strain degrades L0→L1→L2, health mid-streak resets strain progress,
      4 s cooldown freezes changes after any level change, recovery needs 6 s
      sustained health (slower than the 2 s degrade hold) and only ever moves
      one level up, and `onLevelChange` fires exactly on real changes.
    - Tests drive the controller with 0.1 s steps (frame-like updates) so the
      cooldown-freeze semantics are exercised the way the frame loop will.
    - Why: pin the toddler-gentle rules (no flapping, no jumps, slow recovery)
      before implementation.
    - Confirmed failing (`Cannot find module './perf-monitor'`).
- [x] Task: Implement `src/core/perf-monitor.ts` to green; run coverage, target >80% (1acdd1f)
  - Notes:
    - Task: FPS probe + quality controller implementation — Green phase.
    - `createPerfMonitor`: preallocated `Float64Array` ring buffer (deltas +
      cumulative end-times, capacity 240 ≈ one 4 s window at 60 fps), zero
      per-frame allocations; clamps deltas above `PERF_MAX_FRAME_DELTA`
      (0.25 s) so stutters and the hidden-tab resume gap can't fake critical;
      ignores samples entirely while paused; startup grace via
      `PERF_MIN_SAMPLES` (30) before any non-healthy verdict;
      `averageFps()` reports the live-window average for the debug HUD.
      Thresholds: ≥55 fps healthy, ≥30 strained, else critical.
    - `createQualityController`: 2 s sustained strain degrades one level,
      6 s sustained health recovers one level (never skips upward), 4 s
      cooldown freezes all accumulation after any change; `onLevelChange`
      fires only on real changes. Large `dt` steps are sliced so cooldown
      ordering holds regardless of frame pacing.
    - Test feeder switched to a binary-exact 1/64 s step after a float-drift
      bug where sixty summed 0.1 s steps landed just under the 6 s recovery
      threshold.
    - Coverage on `perf-monitor.ts`: 94.25% stmts / 90.47% branch / 98.7%
      lines (target >80%). Full gates green: `tsc --noEmit`, `biome check`
      (import sort auto-fixed), 283 unit tests across 24 files passing.
- [~] Task: Implement `src/core/perf-monitor.ts` to green; run coverage, target >80%
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Quality Levels & Scene Wiring (scene, acceptance criteria) [checkpoint: 50b6d22]

### Verification Report — Phase 2
- Automated: `pnpm exec tsc --noEmit` clean; `pnpm exec biome check .` clean;
  `pnpm test` → 283 tests across 24 files, all passing.
- Browser verification (Playwright, 2026-08-30):
  - No `?perf=debug` → 0 `.perf-debug` elements in the DOM; with the param →
    overlay visible, readable (fps + Q level), non-interactive.
  - Frozen-canvas regression fixed: removed a dangling `invalidateCanvasLayer()`
    call that threw on the first L1/L2 apply; because the rAF loop schedules
    the next frame only after `render()`, the exception froze the canvas
    permanently. Ride + degrade runs now show zero console/page errors.
  - Headless sustained critical: 1536px Q0 → 1152px Q1 → 768px Q2; fps
    recovered as load eased.
  - Heavy scene (track run + 40 trees + riding train) under CDP CPU
    throttling 6×: Q0 → Q1 after ~6 s; unthrottled → Q0 restored exactly
    10 s later (4 s cooldown + 6 s health, matching the TDD'd constants).
- Manual verification: user confirmed the plan (2026-08-30); tablet
  spot-check deferred to Phase 3 manual pass.

- [x] Task: Define level presets and implement `src/scene/quality-applier.ts` (50b6d22)
  - Acceptance: L0 reproduces today's look exactly; L1 clamps render scale
    + halves shadow map; L2 sets pixel ratio 1.0, shadows off, halves
    weather-particle spawn; transitions smooth
  - Notes:
    - Task: quality applier — implementation.
    - `createQualityApplier` leans on each subsystem's own smoothing for
      pop-free transitions: pixel-ratio changes only resample the same image
      mid-frame (three r185 `setPixelRatio` → `setSize` is synchronous),
      shadow-map size changes dispose the old map once and let the GPU
      rebuild, shadow fade eases via `shadow.intensity` over 1 s before
      `castShadow` flips off at L2, and the L2 weather halving rides the
      particle emitter's existing opacity easing. L0 restores the boot-time
      pixel ratio and shadow-map size exactly (`basePixelRatio`,
      `baseShadowMapSize`).
    - Fix: removed a dangling `invalidateCanvasLayer()` call (helper never
      existed) that would have thrown on the first L1/L2 apply. Because the
      rAF loop schedules the next frame only after `render()` returns, that
      exception permanently froze the canvas — this was exactly the freeze
      the unfinished forensics probe was chasing. Verified gone (see Phase 2
      report).
    - `lights.ts`: exported `SHADOW_MAP_SIZE` and exposed `sun` on the
      meadow-lights handle so the applier can trim the shadow maps.
- [x] Task: Wire the probe into the init-scene frame loop and the visibility-controller pause hook (50b6d22)
  - Acceptance: hidden tab freezes the probe; no per-frame allocations in the render path
  - Notes:
    - Task: probe + controller wiring.
    - Frame loop samples the probe first (this frame's cost lands in the
      probe), then feeds the controller a verdict and eases the applier —
      probe, verdict scan, and controller stay allocation-free (ring buffer
      + scalars only).
    - `averageFps()` (a rolling-window scan) now runs only when the
      `?perf=debug` overlay is mounted, so the production render path never
      scans the window.
    - `perfMonitor.setPaused` joins the existing visibility pause/resume —
      a hidden tab freezes the probe so background throttling never reads as
      device strain (spec FR1).
    - Weather: the applier's `weatherScale` (1 or 0.5) scales the intensity
      bed before the emitter's opacity easing — halves visible particle
      density at L2 while snow accumulation stays full.
- [x] Task: Add the `?perf=debug` overlay (fps + level) (50b6d22)
  - Acceptance: hidden without the param; visible, readable, non-interactive with it
  - Notes:
    - Task: debug overlay.
    - `perf-debug-overlay.ts` mounts a single `.perf-debug` div only when the
      URL carries `?perf=debug`; otherwise it returns null and nothing exists
      in the DOM. Updates at most every 250 ms (readable, no flicker),
      `pointer-events: none`, no animation, seeded once at boot so the
      reduced-motion static frame still shows the HUD.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Notes: report above; checkpoint `50b6d22`; user confirmed 2026-08-30.

## Phase 3 — Verification & Docs

- [x] Task: Full gates — `pnpm check` + Playwright suites (`smoke`, `phone-shell`, `prod`) (SHA pending)
  - Notes:
    - Task: full gates.
    - `pnpm check` green (biome clean, tsc clean, 283 unit tests across 24
      files). Full Playwright suite **43/43 green** (tablet + phone + prod)
      after the two fixes below.
    - Found + fixed en route (see Fix Notes below): (1) the previous
      session's dangling `invalidateCanvasLayer` call crashed the frame
      loop; (2) resizing the canvas drawing buffer froze headless-Chromium
      presentation — resolved with the render-target blit; (3) a stale dev
      server from an earlier session was serving old code (placement
      refused with a bogus "water" result), which had poisoned several
      otherwise-green runs — killed the orphan process and re-ran clean.
- [x] Task: Manual verification — heavy scene under Chrome CPU throttling ~6×; confirm gentle degradation + recovery (SHA pending)
  - Notes:
    - Task: manual verification proxy, executed programmatically.
    - Heavy scene (track run + 40 trees + riding train, steam puffs) under
      CDP `Emulation.setCPUThrottlingRate 6×`: Q0 → Q1 after ~6 s; unthrottle
      → Q0 restored after ~10 s (4 s cooldown + 6 s health — matching the
      TDD'd constants exactly). Degradation loop re-verified after the
      render-scale fix: constant buffer 1536×2048 across Q0→Q1→Q2, fps
      recovery 10→11 at Q2, zero console/page errors.
    - Real-tablet spot-check: deferred to the user (see handoff).
- [x] Task: Update docs — `tech-stack.md` folder structure note, `CHANGELOG.md` `[Unreleased]` entry (parent-readable) (SHA pending)
  - Notes:
    - Task: docs.
    - `tech-stack.md`: folder structure now documents `core/perf-monitor.ts`
      (guardrails) and `scene/render-scale.ts` (offscreen downscale blit,
      with the why: canvas-buffer resizes freeze some compositors).
    - `CHANGELOG.md`: parent-readable `[Unreleased]` entry — the table
      looks after itself on slower tablets (gentle quality trims, no pops),
      plus the hidden `?perf=debug` check-up for grown-ups.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Notes:
    - Task: Phase 3 verification & checkpoint.
    - Automated: `pnpm check` green; Playwright 43/43 (tablet + phone +
      prod). Degrade/recover verified programmatically (headed real-GPU run:
      Q0 → Q1 under 6× throttle, Q0 restored 10 s after easing — the exact
      4 s cooldown + 6 s health constants; headless: constant canvas buffer
      across Q0→Q1→Q2, zero errors).
    - Manual verification: user confirmed the Phase 2 plan (2026-08-30);
      real-tablet spot-check offered at handoff (the headed-GPU browser run
      is the strongest available proxy on this machine).
    - Docs synced: `tech-stack.md` folder notes + `CHANGELOG.md`
      `[Unreleased]`; no product-definition or guidelines changes needed —
      the guardrails are invisible to toddlers by design.

## Fix Notes — headless-Chromium compositor freeze
The first guardrails commit crashed on a dangling `invalidateCanvasLayer`
call (undefined helper — removed). After that fix, the guardrails still
failed acceptance: any quality change that resized the canvas drawing
buffer (setPixelRatio) permanently froze frame presentation in headless
Chromium — the compositor served identical screenshots while rAF kept
firing. Bisect isolated the resize alone (shadow/weather both innocent).

**Resolution — render-target blit (`render-scale.ts`):** the canvas
drawing buffer never resizes after boot. Guardrail trims render the scene
into an offscreen target of scale × buffer size and blit it up (plain
textured quad, no post-processing). L0 stays byte-identical to a direct
render; L1/L2 resample the same image at clamped/based pixel ratios.
Acceptance verified in-browser: constant buffer 1536×2048 across
Q0→Q1→Q2, fps recovery 10→11 at Q2, screenshots always differ, errors [].

## Docs — tech-stack folder + CHANGELOG [Unreleased]
- tech-stack folder: the render-scale blit (guardrails use an offscreen
  render target for dynamic resolution scaling — the canvas drawing buffer
  never resizes after boot; compositor freezes observed in headless
  Chromium). Notes the guardrails' rAF probe + reduce-motion guidance.
- CHANGELOG [Unreleased]: guardrails shipped — ambient day/weather cycles,
  ride motion, guardrails (L1/L2 quality trims + reduce-motion), perf HUD.

## Phase: Review Fixes
fix SHA: ec7e370
- [x] Task: Apply review suggestions
  - `perf-monitor.ts`: `scanWindow()` now fills a shared scratch object —
    the probe is called every frame and the zero-per-frame-allocation rule
    covers even this small object; also dropped the dead in-bounds
    `undefined` checks (Float64Array reads never yield undefined) in favor
    of non-null assertions. Gates green: pnpm check (biome + tsc + 283
    unit tests), 16/16 guardrail unit tests.

