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
  assets/train-kit/  # extracted Kenney Train Kit .glb + textures, plus original
                     # pieces (tunnel.glb, station.glb, crate.glb) authored
                     # in Blender
scripts/             # Blender build recipes for original assets — deterministic
                     # and re-runnable in any Blender session (e.g.
                     # blender-tunnel.py, blender-station.py)
e2e/                # Playwright specs
conductor/          # project management source of truth
```

**Boundary rule:** `src/core` is pure TypeScript (unit-testable without a browser). All WebGL lives in `src/scene`.

## Authoring original 3D assets in Blender

The tunnel (`scripts/blender-tunnel.py` → `tunnel.glb`) and the station
(`scripts/blender-station.py` → `station.glb` + the wagon-load `crate.glb`,
whose named `station_crate_1..8` child nodes are toggled at runtime) are the
reference implementations. Original pieces are **not hand-sculpted**: each asset has a
deterministic, checked-in Python recipe that builds and exports it, so a
reset Blender session (or a new machine) can regenerate the asset exactly.
Run it in any Blender session's Python console / scripting tab:

```python
exec(open(r"<repo>/scripts/blender-tunnel.py", encoding="utf-8").read())
build_tunnel()      # (re)create the named objects
render_checks()     # optional: camera renders to the temp folder
export_tunnel()     # write public/assets/train-kit/tunnel.glb
verify_glb()        # print exported node/material names + size
```

Rules of the house (learned the hard way on the tunnel):

1. **Measure the mount first.** The kit module is 4 units long (rail bed
   1.0 wide, rails crowns 0.1 above the mat). New pieces must register in
   `track-renderer.ts` — `PIECE_URLS`, `BASE_YAW`, `KIT_ANCHORS` — and be
   authored on those measurements so rails meet neighbours flush (same
   convention as the trestle bridge).
2. **Author z-up; export with `export_yup=True`.** Track runs along Blender
   **y** (module spans y −4..0), the mat/ground plane sits at **z = −1**,
   rails crown near z = −0.82. After export, Blender y −4..0 becomes the
   world's z 0..4 (grid north = −z) and Blender z becomes up.
3. **Size from the train, not the track.** Kit trains ride at 1.5 model
   scale on the 0.9375 asset scale — ×1.6 in asset units (the locomotive is
   ~2.3 wide with a cab at height ~2.7). Slice the actual kit GLB's vertices
   for the real silhouette before drawing the arch; the first tunnel bore
   was sized from the bed and the train clipped straight through it.
4. **The node-name contract is load-bearing.** The renderer finds parts with
   `getObjectByName`: `tunnel_dome`, `tunnel_portal_entry`/`tunnel_portal_exit`
   (toggled per run seam), `tunnel_snow_cap` (winter tell, hidden at load).
   Blender object names become glTF node names — rename nothing casually.
5. **Materials are named, Principled, and double-sided.** `tunnel_*` palette
   (grass, cream bed, steel rails, dirt interior, snow); leave backface
   culling off so the exporter writes `doubleSided: true` — the dark bore
   interior and the open snow shell read correctly from both sides.
6. **Verify with real renders, not viewport screenshots** (the MCP
   screenshot path can serve stale frames). Park a camera and
   `bpy.ops.render.render(write_still=True)`, then view the PNG. For fit
   checks, import the actual kit GLB (scale ×1.6) and place it inside the
   geometry — the render is the acceptance test.
7. **Export by selection and verify the file.** Select only the asset's
   objects, then `bpy.ops.export_scene.gltf(filepath=…, export_format='GLB',
   use_selection=True, export_yup=True, export_apply=False)` — check-in
   helpers in the recipe handle this (Blender 5.x uses `export_format`; the
   bmesh ops API also shifted vs. older tutorials, e.g.
   `contextual_create(bm, geom=…)`). Then parse the GLB's JSON chunk to
   confirm node/material names and size (target < ~150 KB).
8. **Placeable pieces need renderer wiring + smoke.** Add the catalog entry
   and renderer maps, then an e2e spec that places the piece (dev
   `__tinyTracksWorld` handle), asserts its GLB loads, and requires a clean
   console — see `e2e/tunnel.spec.ts`.

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

