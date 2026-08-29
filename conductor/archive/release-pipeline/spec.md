# Spec: Release Pipeline

**Track ID:** `release-pipeline` · **Type:** Chore · **Branch:** `track/release-pipeline`

## Overview

Wire the documented-but-unbuilt deployment pipeline from `tech-stack.md` so a
version tag actually ships Tiny Trails to production. Today the repo has only
the CI quality gate (`.github/workflows/ci.yml`: biome + typecheck + vitest on
push/PR); there is no Dockerfile, no release workflow, and no deploy trigger.
This track closes that gap: tag `v0.1.0` → gates → Docker image on GHCR →
Coolify webhook → production.

## Functional Requirements

1. **Container** (`Dockerfile` + `nginx.conf`):
   - Multi-stage: Node 24 + pnpm stage runs `pnpm install --frozen-lockfile`
     and `pnpm build`; nginx:alpine stage serves `dist/` only.
   - SPA fallback (`try_files … /index.html`) for the single-page PWA.
   - Cache policy that respects the service worker: `sw.js`, the web
     manifest, and `index.html` get short/no cache; everything else (hashed
     Vite output, GLBs, audio) gets long-lived immutable caching.
   - Gzip/brotli compression for text assets; total served size within the
     `<2 MB gzipped code` pre-deployment rule (assets excluded).
2. **Release workflow** (`.github/workflows/release.yml`), triggered on
   `v*` tags (plus `workflow_dispatch` with a `dry_run` input for testing
   without deploying):
   - **Gates first:** `pnpm check` AND the Playwright e2e suite (Playwright
     browsers installed in CI; dev server booted by the Playwright config).
   - **Build & publish:** `vite build` → docker/build-push-action →
     `ghcr.io/mansyar/tiny-tracks:<tag>` plus `:latest`; login via the
     built-in `GITHUB_TOKEN` with `packages: write`.
   - **Deploy:** on a real tag (not dry-run), POST to the Coolify deploy
     webhook using repo secrets `COOLIFY_WEBHOOK_URL` and
     `COOLIFY_TOKEN` (values added by hand in repo Settings → Secrets; never
     committed).
   - Dry-run mode stops after a successful build/push-nothing — it validates
     the workflow end-to-end without touching GHCR or Coolify.
3. **Docs:** update `tech-stack.md` so the pipeline section matches reality
   (actual image name, tag format, secret names, e2e-in-gate), plus a short
   runbook (how to cut a release, how to read a failed run, rollback =
   redeploy previous tag/image digest in Coolify).

## Non-Functional Requirements

- No gameplay code touched; `src/` is expected to be untouched.
- Secrets only via GitHub Actions secrets — nothing sensitive in the repo.
- The service worker precaches the app, so post-deploy correctness is
  verified by loading the domain on a family device (cold load <5 s rule).

## Acceptance Criteria

- [ ] `docker build` succeeds locally and the container serves the built app
      with correct SPA fallback and cache headers.
- [ ] Pushing a `v*` tag runs the release workflow: gates (unit + e2e) pass,
      image lands on GHCR under the tag, Coolify webhook fires, production
      serves the new version.
- [ ] A `workflow_dispatch` dry run completes without publishing or
      deploying.
- [ ] `tech-stack.md` documents the implemented pipeline accurately.
- [ ] All existing quality gates remain green.

## Out of Scope

- Staging environment, PR preview deploys (production-only per tech-stack).
- Analytics, error tracking, or any runtime telemetry (privacy rules).
- The Coolify project/dashboard configuration itself — the webhook URL and
  token are pre-existing user infrastructure, supplied as secrets.
