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
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Docs & Verification

- [x] Task: Update `tech-stack.md` pipeline section to match the built
      reality (image name, tag format, secrets, e2e in gate)
- [ ] Task: Cut the first real release (`v0.1.0`): tag, watch the workflow,
      verify production on a family device
- [ ] Task: Full quality gates: `pnpm check`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
