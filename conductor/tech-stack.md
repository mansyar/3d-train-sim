# Tech Stack — Tiny Tracks

Single-page, offline-capable PWA. No backend, no database, no accounts. Static assets in a container.

## Core

| Concern | Choice | Version | Notes |
|---|---|---|---|
| Language | TypeScript | ~7.0 | Native compiler. `strict: true`; typecheck gate: `tsc --noEmit` |
| 3D rendering | three | ^0.185 | `GLTFLoader` from `three/addons/loaders/GLTFLoader.js` (as used by `src/scene/load-locomotive.ts`) |
| Build tool | Vite | ^8 | Single entry, static `dist/` output |
| PWA | vite-plugin-pwa | ^1.3 | Workbox precache; installable on iPad/Android home screens; peer-supports Vite ^8. `workbox-window` (devDependency) required for the production build — the `virtual:pwa-register` module imports it (`generateSW` mode); found missing on the first containerized build (2026-08-29, release-pipeline track) |
| Font | @fontsource/baloo-2 | ^5.3 | Bundled variable font (Baloo 2, the kid-playful display face) — offline-safe, no runtime font download; imported in `src/main.ts` (added 2026-08-30, mobile-ux-polish track) |
| Audio | howler | ^2.2.4 | Ride-synced chug loop, whistle, placement ding; handles iOS unlock |
| Persistence | idb | ^8 | Thin promise wrapper over IndexedDB; one object store `worlds` |
| UI | Vanilla TS + DOM overlay | — | No framework. Chunky toy UI as HTML/CSS over the canvas |
| Styling | Hand-written CSS | — | Custom properties, no preprocessor, no CSS framework |

## Code quality & dev tools

| Tool | Version | Role |
|---|---|---|
| @biomejs/biome | ~2.5.10 | Lint + format in one fast tool (replaces ESLint + Prettier). Config: `biome.json` |
| typescript | ~7.0.2 | Native compiler (Go-based). Typecheck gate: `tsc --noEmit` |

CI runs `pnpm biome check .` and `tsc --noEmit` before tests — both must pass.

## Runtime requirements

- Modern tablet browsers: Safari on iPadOS 16+ (WebGL2), Chrome on Android (WebGL2)
- Touch-first: pointer events only; no hover-dependent UI
- Node 24 LTS for development/build (Vite 8 requires Node ≥ 22.12)

## Package manager

pnpm ^11 — strict, fast, workspace-ready if tracks ever split.

## Testing

| Layer | Tool | Scope |
|---|---|---|
| Unit/integration | Vitest ^4 | Colocated `*.test.ts` next to modules. **TDD enforced for pure logic**: track graph, snap resolution, path following, save/load |
| E2E smoke | Playwright ^1.62 | `e2e/` — boots the app, places pieces, starts the train (dev builds expose `window.__tinyTracksWorld` for programmatic placement), asserts no console errors |

## Folder structure

```
src/
  main.ts          # bootstrap
  core/            # PURE logic — no three.js imports allowed here
    track-graph.ts #   nodes/edges, piece connectivity
    snapping.ts    #   grid snap resolution → implemented as grid.ts (100% coverage)
    pathing.ts     #   train path along track, speed, looping
    save.ts        #   serialize/deserialize world
    perf-monitor.ts#   FPS probe ring buffer + quality-tier controller (guardrails)
  scene/           # three.js wiring: renderer, cameras, environment, model loading
    render-scale.ts#   offscreen downscale blit — the guardrails' render trims go
                   #   through an offscreen target; the canvas drawing buffer
                   #   never resizes after boot (resizing it mid-run freezes
                   #   frame presentation in some compositors, e.g. headless
                   #   Chromium — see perf-guardrails plan fix notes)
  ui/              # DOM overlay: toybox, play/stop/whistle, parent gate
  audio/           # Howler wrappers + sfx registry
  state/           # world piece store, ride controller (idle ⇄ riding)
public/
  assets/train-kit/  # extracted Kenney Train Kit .glb + textures
e2e/                # Playwright specs
conductor/          # project management source of truth
```

**Boundary rule:** `src/core` is pure TypeScript (unit-testable without a browser). All WebGL lives in `src/scene`.

## Build & Deployment Pipeline

```
git tag v1.2.3 && git push --tags
  → GitHub Actions release.yml (tag-triggered):
      1. Gates: pnpm check (biome + typecheck + vitest) + Playwright e2e
      2. Docker build (multi-stage: node:24-alpine/pnpm build →
         nginx:alpine serving dist/, PWA-aware cache rules)
      3. Push image to ghcr.io/mansyar/tiny-tracks:1.2.3 + :latest
         (public, GITHUB_TOKEN with packages:write)
      4. Deploy: POST to the Coolify deploy webhook — production only
```

- Merging to main never deploys; only `v*` tags ship.
- `workflow_dispatch` on release.yml runs a **dry run** (gates + image build,
  no publish, no deploy) — the way to validate workflow changes safely.
- Repo secrets (Settings → Secrets and variables → Actions):
  `COOLIFY_WEBHOOK_URL` (deploy webhook) and `COOLIFY_TOKEN` (bearer token).
- Rollback: redeploy the previous image digest (or re-tag) in Coolify.
- Runbook — cutting a release (full flow, bump to deploy):
  1. Bump the version in `package.json` (`pnpm version patch|minor|major`
     bumps, commits, and creates the `v` tag in one step — or edit the
     version by hand and tag manually with `git tag vX.Y.Z`)
  2. Update `CHANGELOG.md`: move the release's notes out of
     `## [Unreleased]` into a new `## [X.Y.Z] — YYYY-MM-DD` section
     (Keep a Changelog style, written for parents, not engineers) and
     refresh the compare links at the bottom of the file
  3. `pnpm check` locally (gates) plus the Playwright e2e suite
  4. Merge the release track to `main`, then push: `git push origin main`
     followed by `git push origin vX.Y.Z` (pushing the tag triggers
     `release.yml`; pushing main alone never deploys)
  5. Watch the Release workflow on GitHub Actions — gates, image build,
     GHCR push, Coolify webhook
  6. Verify production on a family device: load the domain cold, build a
     loop, press play, hear the whistle
- Image tags mirror the git tag without the `v` (`v1.2.3` → `1.2.3`), plus a
  moving `:latest`. Keep `package.json`'s `version` in sync with the tag.
- Single environment: production. Family devices just load the domain.
- No analytics, no error-tracking service in V1 (privacy first for kids).

