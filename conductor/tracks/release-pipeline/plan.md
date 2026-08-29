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
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Release Workflow (non-logic)

- [ ] Task: Write `.github/workflows/release.yml`
  - [ ] Triggers: `push: tags: ['v*']` + `workflow_dispatch` with
        `dry_run` input
  - [ ] Gate job: `pnpm check` + Playwright e2e (install browsers, run on
        ubuntu-latest)
  - [ ] Publish job: docker/build-push-action → `ghcr.io/mansyar/tiny-tracks`
        tagged `<git-tag>` + `latest` (GITHUB_TOKEN, `packages: write`)
  - [ ] Deploy step: POST to `$COOLIFY_WEBHOOK_URL` with `$COOLIFY_TOKEN`,
        skipped in dry-run
  - Acceptance: a `workflow_dispatch` dry run completes green without
    publishing or deploying
- [ ] Task: Document the two required repo secrets in the runbook
      (`COOLIFY_WEBHOOK_URL`, `COOLIFY_TOKEN`) — user adds values by hand
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Docs & Verification

- [ ] Task: Update `tech-stack.md` pipeline section to match the built
      reality (image name, tag format, secrets, e2e in gate)
- [ ] Task: Cut the first real release (`v0.1.0`): tag, watch the workflow,
      verify production on a family device
- [ ] Task: Full quality gates: `pnpm check`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
