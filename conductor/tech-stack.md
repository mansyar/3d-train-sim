# Tech Stack — Tiny Tracks

Single-page, offline-capable PWA. No backend, no database, no accounts. Static assets in a container.

## Core

| Concern | Choice | Version | Notes |
|---|---|---|---|
| Language | TypeScript | ~7.0 | Native compiler. `strict: true`; typecheck gate: `tsc --noEmit` |
| 3D rendering | three | ^0.185 | `GLTFLoader` from `three/addons/loaders/GLTFLoader.js` (as used by `src/scene/load-locomotive.ts`) |
| Build tool | Vite | ^8 | Single entry, static `dist/` output |
| PWA | vite-plugin-pwa | ^1.3 | Workbox precache; installable on iPad/Android home screens; peer-supports Vite ^8 |
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
  scene/           # three.js wiring: renderer, cameras, environment, model loading
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
git tag v1.2.3
  → GitHub Actions: pnpm build (biome check + typecheck + vitest must pass)
  → Docker build (nginx:alpine serving dist/)
  → Push image to ghcr.io/<owner>/tiny-tracks:1.2.3 (public)
  → Deploy via Coolify API (webhook/tag trigger) — production only
```

- Single environment: production. Family devices just load the domain.
- No analytics, no error-tracking service in V1 (privacy first for kids).

