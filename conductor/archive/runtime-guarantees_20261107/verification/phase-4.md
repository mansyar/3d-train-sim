# Phase 4 — Documentation — Verification

Track: `runtime-guarantees_20261107`
Performed by: primary agent (the phase subagent is denied writes under `conductor/`)

## Goal

The tech stack and the roadmap record what actually ships, including the one
deliberate deviation from the roadmap wording.

## Changes

### `conductor/tech-stack.md`

- New table row **Security headers**: the single dependency-free module, the three
  layers that serve it (Vite plugin in dev and preview, nginx include in the
  container, unit test as the drift guard), the 13-directive CSP with
  `connect-src 'self' blob:`, the `'none'` directives, `nosniff`,
  `no-referrer`, `always`, and the dev-only `style-src` relaxation with its reason.
- New paragraph in the deployment section: the `COPY` line the image depends on,
  what the guard test enforces, and how the offline proof works
  (`workerStart > 0`, Chromium, WebKit limitation, manual-device backstop).
- PWA row: `globPatterns` now carries `woff2` (not `woff`), so the four Baloo 2
  subsets survive an offline cold start.
- Folder structure: `security-headers.ts`, `no-external-urls.test.ts`,
  `nginx-headers.test.ts` added under `src/core/`.

### `conductor/product.md`

Phase 0 roadmap table now states what shipped:

- `save-resilience_20261107` — shipped 2026-11-07 (PR 65).
- `world-portability_20261107` — shipped 2026-11-07 (PR 66), 64-piece world
  exports at 4.5 KB, far inside the "under 100 KB" target.
- `runtime-guarantees_20261107` — shipped 2026-11-07, with the deviation spelled
  out: `connect-src 'self' blob:` replaces the `'none'` the roadmap predicted,
  because Howler fetches audio over XHR and three.js reads GLB textures back
  through blob URLs; the offline spec runs on Chromium because Playwright's
  WebKit cannot take a service-worker page offline.

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm check` | 0 | Biome 172 files, `tsc --noEmit` clean, 46 files / 855 tests |

## Acceptance criteria

| AC | Evidence |
| --- | --- |
| AC-8 — the docs record the shipped guarantees and the deviation | the two sections above, plus the roadmap row |

## Notes

- No code changed in this phase; the tests above are the regression check that the
  docs edits broke nothing (Biome lints markdown-adjacent config and TS only).
- The `deps-guardrails_20261107` row is untouched — that track has not run.
