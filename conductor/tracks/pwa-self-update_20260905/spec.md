# Specification — PWA Self-Update Flow

- **ID:** `pwa-self-update_20260905`
- **Type:** Chore
- **Status:** confirmed (2026-09-05)

## Overview

Family iPads and tablets currently stay on an old version until someone
happens to reload: `vite-plugin-pwa` runs in `generateSW` mode with
`registerType: 'autoUpdate'` (skipWaiting baked in), so a new deployment
installs a new service worker that activates — but the running page keeps
serving its old precached assets until something reloads it. A standalone
home-screen PWA that is never closed can lag days behind production.

This track makes the app quietly adopt each deployment: probe for the new
service worker, and when the table is quiet, reload exactly once into the
fresh version — no prompts, no toasts, no interruption, no lost worlds.

## Functional Requirements

1. **Update checks beyond navigation** — probe the service worker
   registration (`registration.update()`) when the tab becomes visible
   again and on an hourly interval; navigation-time checks keep working
   as today.
2. **Quiet apply when idle** — when a new service worker takes control
   (`controllerchange`), reload the page **only when the ride state is
   idle**. If a train is riding, defer the reload until the ride ends.
   Exactly one reload per update, never more.
3. **Boot-loop guard** — never self-reload within the first ~15 s after
   load (protects against pathological update ping-pong).
4. **World safety** — the reload relies on the existing continuous
   autosave + world-restore path; no changes to the save format.
5. **Version in the parent gate** — inject `__APP_VERSION__` (from
   `package.json`) at build time and show it as small, subtle text inside
   the parent gate panel — grown-up eyes only.

## Non-Functional Requirements

- Zero visible toddler-facing update UI (no fail states, no interruptions).
- No new network calls beyond the standard same-origin service-worker
  update fetch. Privacy intact.
- No per-frame work added to the render loop.

## Acceptance Criteria

- Idle table + simulated new deploy → the page reloads itself into the new
  version within a check cycle.
- Mid-ride + new deploy → no reload during the ride; the reload lands
  after the ride ends.
- Post-reload, the built world is exactly as left (autosave restore).
- The parent gate panel shows the current version.
- Playwright suite + gates (biome, `tsc --noEmit`, vitest) clean.

## Out of Scope

- Manual "refresh now" button.
- Changelogs, toasts, or update banners.
- Deploy tooling changes.
- Any app-store-style update experience.
