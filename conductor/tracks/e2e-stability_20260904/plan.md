# Plan: E2E Stability & CI Efficiency

Chore track — no logic-bearing code, so no TDD tasks; verification is repeated
e2e runs, gates, and checkpoints per `workflow.md`.

## Phase 1 - Flake Fix: Targeted Allowlist [checkpoint: e0735ce]

- [x] Task: Reproduce the flake and capture the exact console-error fingerprint
  - Run the wagon-workshop tablet/phone spec repeatedly on Windows headless
    (suite + single-spec reruns) until the failure reproduces; record the exact
    error message text and URL signature in `plan.md`
  - Acceptance: fingerprint captured; confirmed all functional assertions pass
    when it trips
  - Progress (2026-09-04, run 1 — `--repeat-each=6`, default 10 workers,
    24 runs): 8/24 passed, 16 failed — but **zero** occurrences of the
    historical `blob:` fingerprint. Every failure is dev-server collapse: with
    10 Playwright workers hammering the single shared Vite dev server
    (:5199), it stops accepting connections mid-run. Failure signatures:
    `page.goto: Could not connect to server`; `WebSocket connection to
    'ws://localhost:5199/?token=…' failed: WebSocket network error: error
    code 56`; `Failed to load resource: Could not connect to server` (×many);
    collateral `THREE.GLTFLoader: Couldn't load texture Textures/colormap.png`.
    Key finding: `playwright.config.ts` sets **no `workers` cap**, so local
    default = core count — the suite only survives at low worker counts. All
    8 runs that started before the collapse passed clean (incl. both tests,
    both projects) — the spec itself is stable at sane concurrency.
    Next: rerun at the historically accurate `--workers=2` (`--repeat-each=4`)
    to chase the real `blob:` fingerprint.
  - Progress (2026-09-04, run 2 — wagon spec only, `--repeat-each=4`,
    `--workers=2`, 16 runs): **16/16 passed**, zero blob: occurrences. Asset
    audit explains the flake's habitat: exactly 7 GLBs carry embedded PNGs
    (GLTFLoader's `blob:`-URL texture path) — `hill-hill`, `hill-slope-up`,
    `hill-slope-down`, `railroad-crossing`, `switch.glb`, `switch-mirror.glb`;
    every Kenney kit GLB uses the external `Textures/colormap.png` http path
    instead. The isolated wagon spec only exercises the blob path in the
    switch-shuttle test (switch.glb), so the historical full-suite context is
    the right reproduction condition. Escalating: full suite,
    `--repeat-each=2`, `--workers=2` (≈178 runs, all embedded-PNG specs in
    play). Run-1 side finding stands as a fix target: no `workers` cap in
    `playwright.config.ts` — 10-worker default melts the shared dev server
    (new failure mode, distinct from the blob: flake).
  - Progress (2026-09-04, runs 3-4): run 3 (full suite, `--repeat-each=2`,
    `--workers=2`, ≈178 runs, 10.4m) — 56 passed / 142 failed, **zero blob:
    occurrences**; all failures are the soak collapse again: both servers
    (dev 5199 + prod preview 5198) stop accepting connections ~minutes in,
    every later test fails with `page.goto: Could not connect to server`.
    Run 4 (full suite, single pass, `--workers=2`, 99 tests, 8.1m,
    foreground): **99/99 passed**, zero blob: occurrences. Confound noted:
    both collapses ran inside background-managed shells, the clean pass ran
    foreground — background shell throttling is the likely collapse trigger,
    a runbook-worthy lesson (long soaks + managed/background shells kill the
    shared servers; single-pass runs are robust).
  - Resolution: live reproduction exhausted (~130 clean runs today: 16
    isolated wagon + 24 soak-wagon + 99 full-suite) — the flake is too rare
    to catch on demand. **Fingerprint captured from the historical record
    instead**, which recorded it verbatim: wagon-workshop_20260904 archive
    (`conductor/archive/wagon-workshop_20260904/plan.md`): `Fetch API cannot
    load blob:…` WebKit console noise (+ once `colormap.png`), tripping only
    the zero-console assertion while every functional assertion passed;
    flaked untouched specs too (undo, starter-railway); verdict "environmental
    dev-server/WebKit load flake"; release-v0.7.0_20260904 archive confirms
    (`conductor/archive/release-v0.7.0_20260904/plan.md`): tablet+phone
    wagon-workshop, zero-console only, functional assertions pass, flaky
    across projects, pre-existing on main. **Engine correction:** the
    tablet/phone projects run headless **WebKit** (`iPad Mini` / `iPhone 13`
    profiles), not Chromium — spec.md Overview/A2/Out-of-scope corrected in
    this commit. Functional-assertions-pass proof: both archives assert it;
    live confirmation unnecessary.
- [x] Task: Implement the targeted allowlist in the e2e harness (d7f0919)
  - Shared helper in `e2e/` (single place); exact-message fingerprint match;
    comment cites this track + the `blob:`/access-control mechanism; all other
    console errors still fail the suite (spec A4)
  - Acceptance: allowlist active; suite green on Windows headless at default
    workers
  - Notes: `watchConsoleErrors(page)` + `isEnvironmentalConsoleNoise(message)`
    added to `e2e/helpers.ts`. Fingerprint = three-substring conjunction
    (`Fetch API cannot load` + `blob:` + `due to access control checks`) —
    the verbatim WebKit field signature; narrower than a blanket blob: drop
    (the once-seen `colormap.png` variant deliberately still fails). Applied
    at collection time in the single shared collector; pageerrors never
    filtered. All 14 spec files migrated (35 inline collectors + 3 local
    wrapper helpers rewired: hill-pace `trackActivity`, river
    `consoleAndRequests`, ride-toybox-flow `watchConsole`;
    `starter-railway`'s variant collectors migrated by hand — it gains a
    stricter pageerror listener, in scope since the archives show
    starter-railway was flaked by this same noise). Array identity preserved
    (`consoleErrors.length = 0` resets in wagon-workshop/hill-pace still
    work). Net −102 lines across 15 files. Verified: biome clean,
    `tsc --noEmit` clean, 592/592 vitest.
- [x] Task: Cap Playwright workers in `playwright.config.ts` (e0735ce)
  - Discovered failure mode (Task 1 runs): the config sets no `workers`
    limit, so local default = core count — 10 workers on this machine melts
    the shared dev servers, turning the suite red with connection errors.
    Set a sane default (`workers: 2`) with a comment citing the collapse
    mechanism and this track; the historical `--workers=2` convention becomes
    the enforced default instead of tribal memory.
  - Acceptance: local runs use 2 workers by default; full suite still green
    without explicit `--workers=2`
  - Notes: `workers: 2` in `playwright.config.ts` with collapse-mechanism
    comment. Verified: full suite **99/99 passed in 8.0m** with NO
    `--workers` flag — default cap active and green (also exercises the
    allowlist on every zero-console assertion in the suite).
- [x] Task: Prove the guardrail stays armed
  - Temporary test: inject a real console error, confirm the suite fails;
    remove the injection after the proof
  - Acceptance: injected error fails the suite; allowlist only silences the
    known signature
  - Notes (2026-09-04): temporary `e2e/_guardrail-proof.spec.ts` with three
    injections on the real harness (headless, default workers): (1) exact
    allowlisted fingerprint → **filtered, test passed**; (2) ordinary real
    error (`guardrail-proof: real error injection`) → **still failed** the
    suite; (3) `colormap.png` variant (same WebKit wording, no `blob:`) →
    **still failed**. Proof spec deleted after the run — nothing added to
    the permanent suite. Guardrail armed and surgical (spec A4, acceptance
    criterion #6).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Progress (2026-09-04): automated — `pnpm check` green (biome clean,
    `tsc --noEmit` clean, 592/592 vitest); full Playwright suite **99/99
    passed in 8.0m** at the new config default (2 workers, allowlist
    active); guardrail proof 3/3 as designed (allowlisted filtered, real
    error + colormap variant still fail). Changed files (`git diff --name-only
    52e74a1..HEAD`): `e2e/helpers.ts`, 14 `e2e/*.spec.ts`,
    `playwright.config.ts`, `conductor/` artifacts — no `src/**` changes
    (N1 holds). No logic-bearing code touched → no new unit tests required
    (workflow non-logic path). Proposed manual verification for the user:
    eyeball `e2e/helpers.ts` allowlist comment for accuracy/readability,
    and (optional) run `pnpm exec playwright test e2e/wagon-workshop.spec.ts`
    personally to see it green.
  - Verification Report (2026-09-04): automated results above all green;
    user approved checkpoint (manual eyeball of helper comment waived into
    Phase 2 runbook review). Checkpoint SHA `e0735ce` (final Phase 1 code
    commit).

## Phase 2 - Stability Documentation [checkpoint: 8dac80f]

- [x] Task: Write `e2e/README.md` — the stability runbook (8dac80f)
  - The `blob:`/headless-GPU mechanism, the allowlist (what it covers, how to
    extend it), the `--workers=2` rerun convention (v0.5.0/v0.6.0/v0.7.0
    lessons), and "ubuntu e2e is the release authority"
  - Acceptance: doc covers mechanism, convention, and authority rule
  - Notes: `e2e/README.md` covers running (2-worker cap with collapse
    mechanism, foreground-vs-background-shell caveat from Task 1 runs,
    no local soak stacks), the allowlisted WebKit `blob:` signature
    verbatim, allowlist extension rules (field-recorded evidence cited in
    helpers.ts; pageerrors never allowlisted; colormap variant kept
    failing), the rerun convention, and ubuntu-as-release-authority.
    Engine correction carried over: profiles run WebKit, not Chromium.
- [x] Task: Cross-link from `tech-stack.md` Testing section (8dac80f)
  - Point the Testing section's e2e row at the runbook so the convention is
    discoverable from the source of truth
  - Acceptance: link in place; no other tech-stack wording changed yet
  - Notes: single row edit in the Testing table pointing at
    `e2e/README.md`; CI-description wording changes are deliberately
    deferred to Phase 3's dedicated task. Biome clean on the repo.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification Report (2026-09-04): docs-only phase — biome clean; no code
    paths touched. User approved checkpoint. Checkpoint SHA `8dac80f`.

## Phase 3 - CI: E2E on PRs + Parallel Gates + Caching + Path Filters [checkpoint: TBD]

- [ ] Task: Update `tech-stack.md` CI description first
  - Per workflow principle #2: document the new pipeline shape before
    implementation — parallel jobs (biome+typecheck / vitest / e2e), e2e on
    PRs, cached Playwright browsers, docs-only path filtering
  - Acceptance: tech-stack.md reflects the target pipeline
- [x] Task: Rework `.github/workflows/ci.yml` (fde6f2c)
  - Parallel `check` (biome+tsc), `vitest`, and `e2e` jobs on PRs + main
    pushes; e2e = Playwright install (cached, keyed on locked version) +
    `pnpm build` + full suite; docs-only paths skip heavy jobs
  - Acceptance: ci.yml matches the documented shape
  - Notes: exactly the tech-stack "CI (ci.yml)" shape — job timeouts
    (10/10/30 min), browsers cached under
    `playwright-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}`,
    `--with-deps` install kept (idempotent, cheap on cache hit), docs-only
    ignore list = `**/*.md` + `conductor/**` + `.gitignore` (deliberately
    NOT `public/**` — new pieces/assets must always run e2e).
- [x] Task: Mirror the structure in `release.yml` gates (5ff384c)
  - Parallel gate jobs + the same browser cache; ubuntu e2e stays the release
    authority
  - Acceptance: release.yml mirrors ci.yml job structure + cache
  - Notes: `gates` job split into the same three named jobs; `publish`
    now `needs: [check, vitest, e2e]`. Dry-run semantics untouched
    (`push: github.event_name == 'push'` guard, dispatch defaults dry).
    Live dry-run validation is the next task.
- [~] Task: Validate with a release dry run
  - `workflow_dispatch` with `dry_run: true`: gates green, image builds,
    nothing published/deployed
  - Acceptance: dry run green end-to-end
  - Notes: branch pushed to origin (`track/e2e-stability_20260904`);
    dispatching release.yml against it.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 - Acceptance Runs & Wrap-Up

- [x] Task: Three consecutive clean suite runs on Windows headless (2026-09-04)
  - Full Playwright suite at `--workers=2`, three back-to-back runs, zero
    failures — the spec's statistical bar (acceptance #1)
  - Acceptance: 3/3 clean runs recorded in plan.md
  - Notes: all three runs at the config default (2 workers, allowlist
    active), foreground, 99/99 each: run 1 **8.0m** 23:22, run 2 **7.9m**
    23:30, run 3 **7.9m** 23:39. Only the benign `PCFSoftShadowMap`
    deprecation warning appeared. (Plus the earlier single-pass verification
    run in Phase 1: 99/99 in 8.0m — four consecutive clean runs today.)
- [ ] Task: Local gates + wrap-up
  - `pnpm check` green; confirm docs-only commit skips heavy jobs (acceptance
    #4); verify no `src/**` changes exist on the branch (N1)
  - Acceptance: all acceptance criteria checked off against spec.md
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
