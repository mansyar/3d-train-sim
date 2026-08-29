# Plan: Release Pipeline

## Phase 1 — Container (non-logic)

- [x] Task: Write the multi-stage `Dockerfile` (Node 24/pnpm build →
      nginx:alpine serve)
- [x] Task: Write `nginx.conf` (SPA fallback, sw.js/manifest/index no-cache,
      hashed assets immutable, gzip)
  - Acceptance: `docker build -t tiny-tracks .` succeeds; `docker run` serves
    the app; `curl -I` shows the expected cache headers; deep links serve
    `index.html`

  Notes:
  - Added `.dockerignore` (node_modules, dist, conductor, e2e, coverage…).
  - **Deviation (documented in tech-stack.md):** the first containerized
    build failed — `vite-plugin-pwa`'s `virtual:pwa-register` imports
    `workbox-window`, which was never installed. `pnpm build` had evidently
    never been run in this repo (dev-server e2e masked it). Fixed by adding
    `workbox-window@7.4.1` as a devDependency.
  - Verified against the running container: `/` 200 + no-cache · `/sw.js`
    no-cache · `/manifest.webmanifest` no-cache · hashed `assets/*.js`
    immutable 1y · train-kit GLBs + icons 7d · deep link `/build-now`
    200 via SPA fallback.
  - Build output: 124 precache entries (8.4 MB incl. GLBs/audio — code well
    under the 2 MB gzipped rule; assets excluded by the pre-deploy rule).
  - Files: `Dockerfile`, `nginx.conf`, `.dockerignore`, `pnpm-lock.yaml`,
    `package.json`, `conductor/tech-stack.md`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: 22039bb]`

  Container verified end-to-end locally: build, run, cache headers, SPA
  fallback (see Phase 1 notes). Non-logic phase — curl checks stand in for
  unit tests.

## Phase 2 — Release Workflow (non-logic)

- [x] Task: Write `.github/workflows/release.yml`
  - [x] Triggers: `push: tags: ['v*']` + `workflow_dispatch` with
        `dry_run` input
  - [x] Gate job: `pnpm check` + Playwright e2e (install browsers, run on
        ubuntu-latest)
  - [x] Publish job: docker/build-push-action → `ghcr.io/mansyar/tiny-tracks`
        tagged `<git-tag>` + `latest` (GITHUB_TOKEN, `packages: write`)
  - [x] Deploy step: POST to `$COOLIFY_WEBHOOK_URL` with `$COOLIFY_TOKEN`,
        skipped in dry-run
  - Acceptance: a `workflow_dispatch` dry run completes green without
    publishing or deploying

  Notes:
  - Publish job pushes only on tag events (`push: ${{ github.event_name ==
    'push' }}`); the deploy curl runs only then too — a dispatch dry run
    exercises gates + build and stops there.
  - GHA build cache (type=gha) keeps repeat image builds fast.
  - Dry-run acceptance deferred to post-merge: GitHub only registers
    `workflow_dispatch` for workflows on the default branch.
- [x] Task: Document the two required repo secrets in the runbook
      (`COOLIFY_WEBHOOK_URL`, `COOLIFY_TOKEN`) — user adds values by hand

  Notes:
  - Runbook + secret names live in the updated `tech-stack.md` pipeline
    section; values are added by hand in repo Settings → Secrets (never
    committed).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Verification Report — Phase 2 (dry run)

- `workflow_dispatch` dry run on main: **success** — gates (biome + typecheck
  + vitest + 9/9 e2e incl. WebKit) and publish (image build, nothing pushed)
  both green (run 33225406553).
- One fix found by the dry run: the e2e `tablet` project emulates iPad Mini
  (WebKit) — the workflow originally installed only Chromium (#11).
- Secrets confirmed present: `COOLIFY_WEBHOOK_URL`, `COOLIFY_TOKEN`.

- [x] Task: Update `tech-stack.md` pipeline section to match the built
      reality (image name, tag format, secrets, e2e in gate)
- [x] Task: Cut the first real release (`v0.1.0`): tag, watch the workflow,
      verify production on a family device

  Notes:
  - Tag `v0.1.0` on commit `cbe5fb1` (main); release workflow run
    33225678157 completed **success** (gates + publish + deploy, 3m1s,
    2026-08-29). Image published as
    `ghcr.io/mansyar/tiny-tracks:v0.1.0` + `latest`; Coolify deploy
    webhook fired.
  - Production verified on a family device by the user (2026-08-29).
- [x] Task: Full quality gates: `pnpm check`

  Notes:
  - `pnpm check` (biome 52 files + `tsc --noEmit` + vitest) — all green:
    187/187 unit tests pass (2026-08-29, post-release).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  `[checkpoint: cbe5fb1]`

### Verification Report — Release (`v0.1.0`)

- Tag `v0.1.0` cut on commit `cbe5fb1` (main); pushed to origin.
- **Automated:** release workflow run 33225678157 on the tag push —
  **success** (biome + typecheck + vitest + 9/9 e2e incl. WebKit; image
  published to `ghcr.io/mansyar/tiny-tracks:v0.1.0` + `latest`; Coolify
  deploy fired; 3m1s, 2026-08-29).
- **Automated (post-release):** `pnpm check` — biome (52 files),
  `tsc --noEmit`, 187/187 unit tests green.
- **Manual:** production loaded and verified on a family device by the
  user (2026-08-29) — confirmed with yes.
- Later commits on main (`daf56c7` toybox-townsfolk merge) are outside
  this track's scope.

## Phase: Review Fixes

- [x] Task: Apply review suggestions `d6e7291`

  Scope (all Low severity, from the post-completion conductor-review):
  1. `release.yml` — workflow-level `permissions: contents: read`
     (least privilege; `publish` keeps its `packages: write` override).
  2. `release.yml` — `concurrency: release-<ref>` guard so rapid tag
     pushes queue instead of racing publish/deploy.
  3. `release.yml` — `timeout-minutes: 15` on both jobs (fail fast
     instead of eating the 6-hour default).
  4. Informational only (no change): `corepack enable` works on
     `node:24-alpine` but Corepack is absent from Node 25+ — install
     pnpm explicitly when the base image is eventually bumped.
  Validation: `workflow_dispatch` dry run on main after merge.
